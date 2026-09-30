"use server";

/**
 * Studio server actions. Every action re-checks the studio session and the
 * caller's access to that exhibition (src/lib/admin.ts) — forms are just UI,
 * the session is the authority. Messages are translated into the viewer's
 * language.
 */
import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { exhibitionPath, isExhibitionBase, isReservedOrganizationSlug } from "./paths";
import { db, schema } from "@db/index";
import {
  accessFor,
  checkPassword,
  createStudioSession,
  destroyStudioSession,
  isInstallationAdmin,
  managedOrganizations,
  studioSession,
} from "./admin";
import { identify } from "./tydalIdentity";
import { EXHIBITION_PHASES, type ExhibitionPhase } from "@db/schema";
import { createVaultConsumer } from "@tydal/client";
import { parseVaultUrl, serverVaultBase } from "./vaultConnection";
import {
  DEFAULT_APPEARANCE,
  resolveAppearance,
  type Appearance,
} from "./appearance";
import { encryptSecret, decryptSecret } from "./crypto";
import { english, isLocale } from "@/i18n/core";
import { exhibitionT, viewerLocale, viewerT } from "@/i18n/server";

/** Anyone signed into the studio (admin or curator). */
async function requireStudio(): Promise<void> {
  if (!(await studioSession())) redirect("/admin/login");
}

/**
 * The caller may change this exhibition: the installation admin, or an owner /
 * admin / editor of the exhibition's TYDAL organization. A viewer's studio is
 * read-only; anyone else doesn't see the exhibition at all.
 */
async function requireManage(exhibitionId: number): Promise<void> {
  const session = await studioSession();
  if (!session) redirect("/admin/login");
  const exhibition = await db.query.exhibitions.findFirst({
    where: eq(schema.exhibitions.id, exhibitionId),
    columns: { organizationId: true },
  });
  const access = exhibition ? accessFor(session, exhibition.organizationId) : null;
  if (!access) redirect("/admin");
  if (access !== "manage") redirect(`/admin/${exhibitionId}?error=readonly`);
}

/**
 * The installation admin — the person who can see TYDAL itself, so the only
 * one who may override a guard that protects a TYDAL vault.
 */
async function requireInstallationAdmin(): Promise<void> {
  if (!(await isInstallationAdmin())) redirect("/admin");
}

// ── Session ──────────────────────────────────────────────────────────────────

/**
 * Studio sign-in. With an email, TYDAL confirms who the curator is and which
 * organizations they belong to (no TYDAL credential is kept); a TYDAL platform
 * admin signs in as installation admin. Without one, the password is checked
 * against ADMIN_PASSWORD.
 */
export async function login(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email) {
    if (!checkPassword(password)) redirect("/admin/login?error=admin");
    await createStudioSession({ kind: "admin" });
    redirect("/admin");
  }

  const result = await identify(email, password);
  if (!result.ok) redirect(`/admin/login?error=${result.reason}&email=${encodeURIComponent(email)}`);
  const { identity } = result;
  if (identity.isSuperadmin) {
    await createStudioSession({ kind: "admin", name: identity.name });
    redirect("/admin");
  }
  if (!identity.organizations.length)
    redirect(`/admin/login?error=no-organization&email=${encodeURIComponent(email)}`);
  await createStudioSession({
    kind: "curator",
    id: identity.id,
    name: identity.name,
    email: identity.email,
    organizations: identity.organizations,
  });
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await destroyStudioSession();
  redirect("/admin/login");
}

/** A juror ends their session ("Quit voting") and returns to the exhibition. */
/** `base` is the exhibition's public path (src/lib/paths.ts). */
export async function quitJury(base: string): Promise<void> {
  (await cookies()).delete("ff_jury");
  redirect(isExhibitionBase(base) ? base : "/");
}

// ── Exhibitions ──────────────────────────────────────────────────────────────

/**
 * Validate a vault binding live before storing it; returns the vault hash.
 *
 * Two checks, both against the boundary itself:
 *   - the READ key resolves `/meta` (a private vault needs one) — proves the
 *     jury proxy will work and yields the machine hash;
 *   - the WRITE key, when supplied, passes the non-destructive `/w` probe and
 *     carries `activate`, `open` and `close` — checks the full lifecycle at save
 *     rather than mid-opening. A blank write key skips its probe (the caller
 *     keeps whatever was stored).
 */
class ConnectionError extends Error {}

/**
 * The language the vault's photograph texts are written in — its ingest
 * collection's, as TYDAL reports it (`es`, `pt-BR`…) — or null when TYDAL
 * doesn't say (older backends, no ingest target). Only the primary subtag:
 * FullFrame's locales are plain languages.
 */
function photoLanguage(meta: object): string | null {
  // `language` is typed from @tydal/client's next release.
  const language = (meta as { language?: string | null }).language;
  return language ? language.split("-")[0].toLowerCase() : null;
}

async function discover(url: string, readKey: string, writeKey = "") {
  const t = await viewerT();
  let parsed: ReturnType<typeof parseVaultUrl>;
  try {
    parsed = parseVaultUrl(url);
  } catch {
    throw new ConnectionError(
      t(
        "Paste a standing shared vault URL, without a resource path or temporary signed grant.",
      ),
    );
  }
  const baseUrl = serverVaultBase(
    parsed.baseUrl,
    process.env.TYDAL_BASE_URL,
    process.env.TYDAL_LINK_BASE_URL,
  );
  const read = createVaultConsumer({
    baseUrl,
    vault: parsed.vault,
    key: readKey || undefined,
  });
  let meta: Awaited<ReturnType<typeof read.meta>>;
  try {
    meta = await read.meta();
  } catch {
    throw new ConnectionError(
      t(
        "Could not read the vault. Check the shared URL and, for a private vault, add a valid read key.",
      ),
    );
  }
  if (!meta.hash || !["gallery", "mixed"].includes(meta.purpose))
    throw new ConnectionError(t("Choose a gallery or mixed vault."));
  if (!meta.tiers.binary)
    throw new ConnectionError(
      t(
        "This vault does not allow photographs to be viewed. Enable image access in TYDAL.",
      ),
    );
  // Its organization's slug heads the exhibition's public address.
  if (meta.organization && isReservedOrganizationSlug(meta.organization))
    throw new ConnectionError(
      t(
        "This vault’s organization is called “{slug}” in TYDAL, a name FullFrame keeps for its own pages. Rename the organization in TYDAL, then connect again.",
        { slug: meta.organization },
      ),
    );
  // Whose vault this is — only a write key learns it (TYDAL's probe).
  let organization: { id: string; name: string } | null = null;
  if (writeKey) {
    const writer = createVaultConsumer({
      baseUrl,
      vault: { hash: meta.hash },
      key: writeKey,
    });
    // `organization` is typed from @tydal/client's next release.
    let caps: Awaited<ReturnType<typeof writer.writeCapabilities>> & {
      organization?: { id: string; slug: string; name: string } | null;
    };
    try {
      caps = await writer.writeCapabilities();
    } catch {
      throw new ConnectionError(
        t(
          "TYDAL did not accept this write key. Check that it belongs to this vault, is active, and grants w:activate, w:open and w:close.",
        ),
      );
    }
    const missing = ["activate", "open", "close"].filter(
      (method) => !caps.methods?.includes(method),
    );
    if (missing.length)
      throw new ConnectionError(
        t(
          "The write key is missing permissions: {permissions}. Create a key in TYDAL with w:activate, w:open and w:close, then paste it here.",
          { permissions: missing.map((method) => `w:${method}`).join(", ") },
        ),
      );
    organization = caps.organization ?? null;
  }

  return { parsed, baseUrl, meta, organization };
}

export async function previewConnection(
  url: string,
  readKey: string,
  writeKey: string,
) {
  await requireStudio();
  try {
    const { meta } = await discover(url, readKey, writeKey);
    return {
      ok: true as const,
      name: meta.name,
      count: meta.resource_count,
      state: meta.state,
      language: photoLanguage(meta),
    };
  } catch (e) {
    const t = await viewerT();
    return {
      ok: false as const,
      error:
        (e as Error).message ||
        t("Could not connect. Check the URL and access key."),
    };
  }
}

export async function createExhibition(formData: FormData): Promise<void> {
  await requireStudio();
  const url = String(formData.get("vaultUrl") || "");
  const readKey = String(formData.get("readVaultKey") || "").trim();
  const writeKey = String(formData.get("writeVaultKey") || "").trim();
  let binding: Awaited<ReturnType<typeof discover>>;
  try {
    binding = await discover(url, readKey, writeKey);
  } catch (error) {
    const t = await viewerT();
    const detail =
      error instanceof ConnectionError
        ? error.message
        : t("Could not validate the vault connection. Try again.");
    redirect(`/admin?error=vault&detail=${encodeURIComponent(detail)}`);
  }
  const { meta, parsed, baseUrl, organization } = binding;
  // A curator files the exhibition under the vault's own organization, and
  // must manage it there; only the installation admin may connect a vault
  // without a write key (its organization then stays unknown).
  const session = await studioSession();
  if (session?.kind === "curator") {
    const t = await viewerT();
    const detail = !organization
      ? t("Add the vault’s write key: it tells FullFrame which organization the exhibition belongs to.")
      : !managedOrganizations(session).some((o) => o.id === organization.id)
        ? t("This vault belongs to {organization}, where you can’t create exhibitions.", {
            organization: organization.name,
          })
        : null;
    if (detail) redirect(`/admin?error=vault&detail=${encodeURIComponent(detail)}`);
  }
  // Chosen when connecting (it sets the language authors and jurors see);
  // else the language the photographs' texts are written in, when FullFrame
  // speaks it; else the curator's own. Editable later in the details.
  const chosen = String(formData.get("locale") || "");
  const written = photoLanguage(meta);
  const locale = isLocale(chosen)
    ? chosen
    : written && isLocale(written)
      ? written
      : await viewerLocale();
  const title = String(formData.get("title") || meta.name).trim();
  const proposed =
    String(formData.get("slug") || title)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "exhibition";
  const duplicate = await db.query.exhibitions.findFirst({
    where: eq(schema.exhibitions.vaultHash, meta.hash),
  });
  if (duplicate) redirect(`/admin/${duplicate.id}?error=connected`);
  // Unique within the organization: its address is /{organization}/{slug}.
  const organizationSlug = meta.organization || null;
  let slug = proposed;
  for (
    let n = 2;
    await db.query.exhibitions.findFirst({
      where: and(
        organizationSlug
          ? eq(schema.exhibitions.organizationSlug, organizationSlug)
          : isNull(schema.exhibitions.organizationSlug),
        eq(schema.exhibitions.slug, slug),
      ),
    });
    n++
  )
    slug = `${proposed}-${n}`;
  const [exhibition] = await db
    .insert(schema.exhibitions)
    .values({
      title,
      slug,
      vaultHash: meta.hash,
      vaultUrl: parsed.url,
      vaultBaseUrl: baseUrl,
      organizationId: organization?.id ?? null,
      organizationName: organization?.name ?? null,
      organizationSlug,
      phase: "setup",
      locale,
      appearance: DEFAULT_APPEARANCE,
      readVaultKey: encryptSecret(readKey),
      writeVaultKey: encryptSecret(writeKey),
    })
    .returning();
  const t = exhibitionT(exhibition);
  await db.insert(schema.criteria).values({
    exhibitionId: exhibition.id,
    name: t("Overall impression"),
    scaleMax: 5,
    weight: 1,
    position: 1,
  });
  // Straight to the overview's first box.
  redirect(`/admin/${exhibition.id}#submissions`);
}

export async function updateBinding(
  exhibitionId: number,
  formData: FormData,
): Promise<void> {
  await requireManage(exhibitionId);
  const existing = await db.query.exhibitions.findFirst({
    where: eq(schema.exhibitions.id, exhibitionId),
  });
  if (!existing) redirect("/admin");
  const t = await viewerT();
  try {
    const readKey =
      String(formData.get("readVaultKey") || "").trim() ||
      decryptSecret(existing.readVaultKey) ||
      "";
    const writeKey =
      String(formData.get("writeVaultKey") || "").trim() ||
      decryptSecret(existing.writeVaultKey) ||
      "";
    const { meta, parsed, baseUrl, organization } = await discover(
      String(formData.get("vaultUrl") || ""),
      readKey,
      writeKey,
    );
    // A different vault needs a new exhibition: jury records belong to this binding.
    if (existing.vaultHash && meta.hash !== existing.vaultHash)
      throw new ConnectionError(
        t(
          "This URL points to a different vault. Create a new exhibition to keep its jury records separate.",
        ),
      );
    await db
      .update(schema.exhibitions)
      .set({
        vaultHash: meta.hash,
        vaultUrl: parsed.url,
        vaultBaseUrl: baseUrl,
        readVaultKey: encryptSecret(readKey),
        writeVaultKey: encryptSecret(writeKey),
        // Same vault, so the same organization — filled in if it was unknown,
        // and its slug kept current (a rename in TYDAL moves the address).
        ...(meta.organization ? { organizationSlug: meta.organization } : {}),
        ...(organization
          ? { organizationId: organization.id, organizationName: organization.name }
          : {}),
      })
      .where(eq(schema.exhibitions.id, exhibitionId));
  } catch (error) {
    const detail =
      error instanceof ConnectionError
        ? error.message
        : t(
            "Could not save the vault credentials. Check FullFrame’s encryption configuration and try again.",
          );
    redirect(
      `/admin/${exhibitionId}?error=vault&detail=${encodeURIComponent(detail)}`,
    );
  }
  revalidatePath(`/admin/${exhibitionId}`);
  redirect(`/admin/${exhibitionId}?saved=1`);
}

export async function saveExhibitionDetails(
  exhibitionId: number,
  form: FormData,
): Promise<void> {
  await requireManage(exhibitionId);
  const title = String(form.get("title") || "").trim();
  if (!title) return;
  const locale = String(form.get("locale") || "");
  await db
    .update(schema.exhibitions)
    .set({
      title,
      ...(isLocale(locale) ? { locale } : {}),
      subtitle: String(form.get("subtitle") || "").trim(),
      welcomeContent: String(form.get("content") || "").trim(),
      coverImage: String(form.get("coverImage") || "") || null,
    })
    .where(eq(schema.exhibitions.id, exhibitionId));
  revalidatePath("/", "layout");
}

export async function saveAppearance(
  exhibitionId: number,
  appearance: Appearance,
): Promise<void> {
  await requireManage(exhibitionId);
  await db
    .update(schema.exhibitions)
    .set({ appearance: resolveAppearance(appearance) })
    .where(eq(schema.exhibitions.id, exhibitionId));
  revalidatePath("/", "layout");
}

export async function saveCuratedSelection(
  exhibitionId: number,
  hashes: string[],
): Promise<void> {
  await requireManage(exhibitionId);
  const t = await viewerT();
  const exhibition = await db.query.exhibitions.findFirst({
    where: eq(schema.exhibitions.id, exhibitionId),
  });
  if (
    !exhibition ||
    exhibition.phase === "open" ||
    exhibition.phase === "judging"
  )
    throw new Error(t("Close judging before saving the selection."));
  const { loadGallery } = await import("./gallery");
  const { works } = await loadGallery(exhibition);
  const allowed = new Set(works.map((w) => w.id));
  if (hashes.some((h) => !allowed.has(h)))
    throw new Error(
      t("Some photographs have left the vault. Reload before selecting."),
    );
  await db
    .update(schema.exhibitions)
    .set({ selectedHashes: [...new Set(hashes)] })
    .where(eq(schema.exhibitions.id, exhibitionId));
  revalidatePath(`/admin/${exhibitionId}/results`);
}

/**
 * Move the exhibition between stages (the 4-chip control). The stages are
 * setup → judging → selection → open, and each transition does the right
 * thing:
 *
 *   - setup ↔ judging ↔ selection : just the phase flag (the vault is private
 *     throughout). Leaving `judging` IS the jury freeze — the vote endpoints
 *     gate on that phase — so no separate "close the jury" action exists.
 *   - → open   : the real opening (write-back + publish). It runs from the
 *     Selection page or the stage modal via `openExhibition`, never here.
 *   - open → * : reopen — close the vault first (un-publish, restore the full
 *     submission projection, which TYDAL remembers), then drop back.
 *
 * Takes plain arguments rather than FormData: the caller is a client
 * component that awaits the result to close its modal, and a resolved promise
 * is a much better close signal than a form's navigation.
 */
export async function setPhase(
  exhibitionId: number,
  target: ExhibitionPhase,
): Promise<{ ok: true } | { error: string; detail?: string }> {
  await requireManage(exhibitionId);
  const t = await viewerT();
  if (!EXHIBITION_PHASES.includes(target))
    return { error: t("Unknown exhibition stage.") };

  const exhibition = await db.query.exhibitions.findFirst({
    where: eq(schema.exhibitions.id, exhibitionId),
  });
  if (!exhibition) return { error: t("This exhibition no longer exists.") };
  if (exhibition.phase === target) return { ok: true };

  // Opening is a process, not a flag — `openExhibition` owns it.
  if (target === "open") redirect(`/admin/${exhibitionId}/results`);

  // Reopen: close the vault before dropping back — un-publish and restore the
  // full submission projection.
  if (exhibition.phase === "open") {
    const { reverseOpening } = await import("./writeback");
    const result = await reverseOpening(exhibition);
    if (!result.ok) {
      return {
        error: result.errors.map((e) => t(e)).join(" · "),
        detail: result.detail && t(result.detail),
      };
    }
    await db
      .update(schema.exhibitions)
      .set({ phase: target, openedAt: null, writebackAt: null })
      .where(eq(schema.exhibitions.id, exhibitionId));
    revalidatePath(`/admin/${exhibitionId}`, "layout");
    revalidatePath(exhibitionPath(exhibition), "layout");
    revalidatePath("/admin");
    return { ok: true };
  }

  // setup ↔ judging ↔ selection. Leaving setup ends the submission period;
  // coming back doesn't reopen it by itself.
  await db
    .update(schema.exhibitions)
    .set({
      phase: target,
      ...(exhibition.submissions === "open" ? { submissions: "closed" as const } : {}),
    })
    .where(eq(schema.exhibitions.id, exhibitionId));
  revalidatePath(`/admin/${exhibitionId}`, "layout");
  revalidatePath(exhibitionPath(exhibition), "layout");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Delete an exhibition and everything FullFrame holds about it (criteria,
 * jurors, votes, notes). The works themselves live in TYDAL and are never
 * touched — this removes the *product*, not the pictures.
 *
 * Two guards: an open exhibition must be closed first (deleting the row would
 * strand a published vault with no way back to it from here), and the admin
 * has to type the slug — the one destructive button in the backoffice.
 *
 * `force` overrides the first guard for when the close cannot succeed (vault
 * deleted in TYDAL, a misconfigured connection, TYDAL down). FullFrame cannot
 * tell those apart, so it never decides on its own: only the installation
 * admin may force, only after acknowledging the vault may stay public, and the
 * close is still attempted once more. The outcome is logged with the vault's
 * coordinates — the only record left of a vault that may still be published.
 */
export async function deleteExhibition(
  exhibitionId: number,
  confirmSlug: string,
  options: { force?: boolean; acknowledged?: boolean } = {},
): Promise<void> {
  await requireManage(exhibitionId);
  const exhibition = await db.query.exhibitions.findFirst({
    where: eq(schema.exhibitions.id, exhibitionId),
  });
  if (!exhibition) redirect("/admin");
  const t = await viewerT();
  const fail: (detail: string) => never = (detail) =>
    redirect(
      `/admin/${exhibitionId}?error=delete&detail=${encodeURIComponent(detail)}`,
    );
  if (confirmSlug.trim() !== exhibition.slug)
    fail(t("Type the exhibition slug to confirm deletion."));
  if (exhibition.phase === "open") {
    if (!options.force) fail(t("Close this exhibition before deleting it."));
    await requireInstallationAdmin();
    if (!options.acknowledged)
      fail(
        t(
          "Confirm that you will close the vault in TYDAL yourself before deleting without closing.",
        ),
      );
    const { reverseOpening } = await import("./writeback");
    const { tydalBaseUrl } = await import("./tydal");
    const close = await reverseOpening(exhibition);
    console.warn(
      "[fullframe] forced exhibition delete",
      JSON.stringify({
        at: new Date().toISOString(),
        exhibitionId,
        slug: exhibition.slug,
        vaultHash: exhibition.vaultHash,
        vaultBaseUrl: exhibition.vaultBaseUrl || tydalBaseUrl() || null,
        vaultClosed: close.ok,
        closeDetail: close.detail ? english(close.detail) : null,
      }),
    );
  }

  const jurors = await db.query.jurors.findMany({
    where: eq(schema.jurors.exhibitionId, exhibitionId),
  });
  for (const juror of jurors) {
    await db.delete(schema.votes).where(eq(schema.votes.jurorId, juror.id));
    await db
      .delete(schema.comments)
      .where(eq(schema.comments.jurorId, juror.id));
  }
  await db
    .delete(schema.jurors)
    .where(eq(schema.jurors.exhibitionId, exhibitionId));
  const authors = await db.query.authors.findMany({
    where: eq(schema.authors.exhibitionId, exhibitionId),
  });
  for (const author of authors)
    await db
      .delete(schema.submissions)
      .where(eq(schema.submissions.authorId, author.id));
  await db
    .delete(schema.authors)
    .where(eq(schema.authors.exhibitionId, exhibitionId));
  await db
    .delete(schema.criteria)
    .where(eq(schema.criteria.exhibitionId, exhibitionId));
  await db
    .delete(schema.exhibitions)
    .where(eq(schema.exhibitions.id, exhibitionId));

  revalidatePath("/admin");
  redirect("/admin?deleted=" + encodeURIComponent(exhibition.title));
}

// ── Jurors ───────────────────────────────────────────────────────────────────

export type MintResult =
  { url: string; name: string } | { error: string } | null;

export async function mintJuror(
  exhibitionId: number,
  _previous: MintResult,
  formData: FormData,
): Promise<MintResult> {
  await requireManage(exhibitionId);
  let t = await viewerT();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: t("A juror needs a name.") };

  const exhibition = await db.query.exhibitions.findFirst({
    where: eq(schema.exhibitions.id, exhibitionId),
  });
  if (!exhibition) return { error: t("This exhibition no longer exists.") };
  // The criterion is shown to jurors, so it speaks the exhibition's language.
  t = exhibitionT(exhibition);
  const criterion = await db.query.criteria.findFirst({
    where: eq(schema.criteria.exhibitionId, exhibitionId),
  });
  if (!criterion)
    await db.insert(schema.criteria).values({
      exhibitionId,
      name: t("Overall impression"),
      scaleMax: 5,
      weight: 1,
      position: 1,
    });
  const token = randomBytes(24).toString("base64url");
  await db.insert(schema.jurors).values({
    exhibitionId,
    name,
    email: String(formData.get("email") ?? "").trim() || null,
    tokenHash: createHash("sha256").update(token).digest("hex"),
    token,
  });
  revalidatePath(`/admin/${exhibitionId}`);

  return { url: jurorUrl(token), name };
}

function jurorUrl(token: string): string {
  return `${(process.env.APP_URL ?? "").replace(/\/$/, "")}/j/${token}`;
}

export async function revokeJuror(
  exhibitionId: number,
  jurorId: number,
): Promise<void> {
  await requireManage(exhibitionId);
  await db
    .update(schema.jurors)
    .set({ revokedAt: new Date() })
    // Scoped to this exhibition: access was checked for it, not for the juror.
    .where(and(eq(schema.jurors.id, jurorId), eq(schema.jurors.exhibitionId, exhibitionId)));
  revalidatePath(`/admin/${exhibitionId}`);
}

/** Fresh token for a juror (old link dies). Returns the new URL to copy. */
export async function regenerateJuror(
  exhibitionId: number,
  jurorId: number,
): Promise<{ url: string } | { error: string }> {
  await requireManage(exhibitionId);
  const token = randomBytes(24).toString("base64url");
  await db
    .update(schema.jurors)
    .set({
      token,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      revokedAt: null,
    })
    // Scoped to this exhibition: access was checked for it, not for the juror.
    .where(and(eq(schema.jurors.id, jurorId), eq(schema.jurors.exhibitionId, exhibitionId)));
  revalidatePath(`/admin/${exhibitionId}`);
  return { url: jurorUrl(token) };
}

// ── Submissions ──────────────────────────────────────────────────────────────

/**
 * Move the submission period: open it, close it, or skip it (closed without
 * ever opening). Only while the exhibition is in setup.
 */
export async function setSubmissions(
  exhibitionId: number,
  state: "open" | "closed",
): Promise<{ ok: true } | { error: string }> {
  await requireManage(exhibitionId);
  const t = await viewerT();
  const exhibition = await db.query.exhibitions.findFirst({
    where: eq(schema.exhibitions.id, exhibitionId),
  });
  if (!exhibition) return { error: t("This exhibition no longer exists.") };
  if (exhibition.phase !== "setup")
    return {
      error: t("Submissions can only be open while you prepare the exhibition."),
    };
  if (
    state === "open" &&
    !(await db.query.authors.findFirst({
      where: and(
        eq(schema.authors.exhibitionId, exhibitionId),
        isNull(schema.authors.revokedAt),
      ),
    }))
  )
    return { error: t("Invite an author first: nobody could send photographs yet.") };
  await db
    .update(schema.exhibitions)
    .set({ submissions: state })
    .where(eq(schema.exhibitions.id, exhibitionId));
  revalidatePath(`/admin/${exhibitionId}`);
  return { ok: true };
}

/** How many photographs each invited author may send. */
export async function setSubmissionLimit(
  exhibitionId: number,
  limit: number,
): Promise<{ ok: true } | { error: string }> {
  await requireManage(exhibitionId);
  const t = await viewerT();
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    return { error: t("Allow between 1 and 100 photographs.") };
  await db
    .update(schema.exhibitions)
    .set({ submissionLimit: limit })
    .where(eq(schema.exhibitions.id, exhibitionId));
  revalidatePath(`/admin/${exhibitionId}`);
  return { ok: true };
}

export type MintAuthorResult = { ok: true } | { error: string } | null;

/** Invite an author: a name, fixed from now on, and a personal link. */
export async function mintAuthor(
  exhibitionId: number,
  _previous: MintAuthorResult,
  formData: FormData,
): Promise<MintAuthorResult> {
  await requireManage(exhibitionId);
  const t = await viewerT();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: t("An author needs a name.") };
  const { newToken } = await import("./authors");
  await db
    .insert(schema.authors)
    .values({ exhibitionId, name, ...newToken() });
  revalidatePath(`/admin/${exhibitionId}`);
  return { ok: true };
}

/**
 * A new personal link for an author (the old one stops working) — the answer
 * to a lost or leaked link. Photographs already sent stay theirs.
 */
export async function regenerateAuthor(
  exhibitionId: number,
  authorId: number,
): Promise<{ url: string } | { error: string }> {
  await requireManage(exhibitionId);
  const { authorUrl, newToken } = await import("./authors");
  const fresh = newToken();
  await db
    .update(schema.authors)
    .set({ ...fresh, revokedAt: null })
    // Scoped to this exhibition: access was checked for it, not for the author.
    .where(
      and(
        eq(schema.authors.id, authorId),
        eq(schema.authors.exhibitionId, exhibitionId),
      ),
    );
  revalidatePath(`/admin/${exhibitionId}`);
  return { url: authorUrl(fresh.token) };
}

/** The author's link stops working; photographs already sent stay. */
export async function revokeAuthor(
  exhibitionId: number,
  authorId: number,
): Promise<void> {
  await requireManage(exhibitionId);
  await db
    .update(schema.authors)
    .set({ revokedAt: new Date() })
    // Scoped to this exhibition: access was checked for it, not for the author.
    .where(
      and(
        eq(schema.authors.id, authorId),
        eq(schema.authors.exhibitionId, exhibitionId),
      ),
    );
  revalidatePath(`/admin/${exhibitionId}`);
}

// ── Selection & opening (E4) ─────────────────────────────────────────────────

/**
 * The opening flow, one action: write-back → publish the vault →
 * phase `open` (which freezes the jury by itself). The modal on the
 * dashboard is the confirmation; the only hard requirement is a saved
 * selection (theme/text are optional — already chosen by now). Any failure
 * keeps the local publication state unchanged and reports any completed TYDAL step.
 */
export async function openExhibition(exhibitionId: number): Promise<void> {
  await requireManage(exhibitionId);

  const exhibition = await db.query.exhibitions.findFirst({
    where: eq(schema.exhibitions.id, exhibitionId),
  });
  if (!exhibition) return;
  if (!exhibition.selectedHashes?.length)
    redirect(`/admin/${exhibitionId}/results?error=selection`);
  if (exhibition.phase === "judging")
    redirect(`/admin/${exhibitionId}/results?error=judging`);

  const { rawVotes } = await import("./votesData");
  const { computeScores } = await import("./scoring");
  const { executeOpening } = await import("./writeback");

  const data = await rawVotes(exhibitionId);
  const ranked = computeScores(data);
  const selected = exhibition.selectedHashes ?? [];
  if (selected.length === 0)
    redirect(`/admin/${exhibitionId}/results?error=empty`);

  // The immutable scoring record — FullFrame owns scoring, so this is the
  // record of record (persisted below; the exhibition is phase-frozen once
  // open). Downloadable from the admin.
  const scoringRecord = {
    format: "fullframe-scoring/2",
    exhibition: exhibition.slug,
    generated_at: new Date().toISOString(),
    method: {
      aggregation: "mean",
      scale: 5,
      selection: "curator",
      hashes: selected,
    },
    criteria: data.criteria,
    jurors: data.jurors,
    selected,
    ranking: ranked.map((w, i) => ({
      rank: i + 1,
      ...w,
      selected: selected.includes(w.hash),
    })),
  };

  // One privileged step: activate the selection and publish the vault, both on
  // the vault's own write key (no org token, no management API).
  const result = await executeOpening(exhibition, selected);
  const t = await viewerT();
  if (!result.ok) {
    redirect(
      `/admin/${exhibitionId}/results?error=writeback&detail=${encodeURIComponent(
        result.errors
          .map((e) => t(e))
          .join(" · ")
          .slice(0, 300),
      )}`,
    );
  }

  await db
    .update(schema.exhibitions)
    .set({
      phase: "open",
      openedAt: new Date(),
      writebackAt: new Date(),
      scoringRecord,
    })
    .where(eq(schema.exhibitions.id, exhibitionId));

  revalidatePath(`/admin/${exhibitionId}/results`);
  redirect(`/admin/${exhibitionId}/results?opened=1`);
}
