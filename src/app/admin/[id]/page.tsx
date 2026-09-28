import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@db/index";
import { requireStudioAccess } from "@/lib/studioPage";
import { loadGallery } from "@/lib/gallery";
import { saveExhibitionDetails, updateBinding } from "@/lib/actions";
import { tydalBaseUrl, tydalLinkBaseUrl } from "@/lib/tydal";
import { AdminNav } from "@/components/admin/AdminNav";
import { StageGuide } from "@/components/admin/StageGuide";
import { JurorList } from "@/components/admin/JurorList";
import { MintJurorForm } from "@/components/admin/MintJurorForm";
import { JuryToggle } from "@/components/admin/JuryToggle";
import { DeleteExhibition } from "@/components/admin/DeleteExhibition";
import { PhotoUploader } from "@/components/admin/PhotoUploader";
import { photoDetails, uploadAccess, UPLOAD_ACCESS_NOTES } from "@/lib/uploads";
import { Photograph } from "@/components/Photograph";
import { viewerT } from "@/i18n/server";
import { LOCALES, LOCALE_NAMES } from "@/i18n/core";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string; detail?: string }>;
}) {
  const id = Number((await params).id);
  const e = await db.query.exhibitions.findFirst({
    where: eq(schema.exhibitions.id, id),
  });
  if (!e) notFound();
  const access = await requireStudioAccess(e);
  const t = await viewerT();
  const { error, saved, detail } = await searchParams;
  let gallery: Awaited<ReturnType<typeof loadGallery>> | null = null;
  try {
    gallery = await loadGallery(e);
  } catch {}
  const jurors = await db.query.jurors.findMany({
    where: eq(schema.jurors.exhibitionId, id),
  });
  const jurorIds = jurors.map((j) => j.id);
  const votes = jurorIds.length
    ? await db.query.votes.findMany({
        where: inArray(schema.votes.jurorId, jurorIds),
      })
    : [];
  const criteria = await db.query.criteria.findMany({
    where: eq(schema.criteria.exhibitionId, id),
  });
  const url = e.vaultUrl || `${tydalLinkBaseUrl()}/h/${e.vaultHash}`;
  const { access: upload, ingested, maxUploadBytes } = await uploadAccess(e);
  const added = await photoDetails(e, ingested).catch(() => []);
  const previews = new Map(gallery?.works.map((w) => [w.id, w.preview]) ?? []);
  return (
    <main className="studio">
      {access === "view" && (
        <p className="status" role="status">
          {t("Read-only: your TYDAL role lets you look at this exhibition, not change it.")}
        </p>
      )}
      {/* A viewer's studio: every control disabled; the server refuses changes too. */}
      <fieldset className="studio-fieldset" disabled={access !== "manage"}>
      <Link className="back-link" href="/admin">
        {t("← All exhibitions")}
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("Exhibition overview")}</p>
          <h1>{e.title}</h1>
        </div>
        <Link className="button" href={`/${e.slug}/salon`} target="_blank">
          {t("Preview exhibition ↗")}
        </Link>
      </div>
      <AdminNav id={id} />
      <StageGuide id={id} phase={e.phase} />
      {error && (
        <p className="error" role="alert">
          {error === "connected"
            ? t("This vault already has an exhibition. You’re viewing it now.")
            : error === "readonly"
              ? t("Your TYDAL role lets you look at this exhibition, not change it.")
            : detail ||
              t(
                "Connection could not be saved. Check the shared URL and vault keys.",
              )}
        </p>
      )}
      {saved && <p className="status ok">{t("Connection saved.")}</p>}
      <div className="overview-stats">
        <div>
          <span className="eyebrow">{t("Photographs")}</span>
          <strong>{gallery?.works.length ?? "—"}</strong>
          <small>
            {gallery ? t("Connected to TYDAL") : t("Vault unavailable")}
          </small>
        </div>
        <div>
          <span className="eyebrow">{t("Exhibition")}</span>
          <strong>{e.phase === "open" ? t("Published") : t("Private")}</strong>
          <small>
            {e.phase === "open"
              ? t("Ready to share")
              : t("Only you and invited jurors")}
          </small>
        </div>
        <div>
          <span className="eyebrow">{t("Jury")}</span>
          <strong>{jurors.filter((j) => !j.revokedAt).length}</strong>
          <small>
            {e.phase === "judging"
              ? t("Judging is open")
              : t("Optional · invite people below")}
          </small>
        </div>
      </div>
      {e.phase === "setup" && (
        <PhotoUploader
          exhibitionId={id}
          canUpload={access === "manage" && upload === "ready"}
          maxUploadBytes={maxUploadBytes}
          note={upload === "ready" ? null : t(UPLOAD_ACCESS_NOTES[upload])}
          added={added.map((photo) => ({
            ...photo,
            preview: previews.get(photo.hash) ?? null,
          }))}
        />
      )}
      <div className="overview-columns">
        <section className="panel">
          <div className="section-heading">
            <h2>{t("The exhibition")}</h2>
            <span className="muted">{t("Public details")}</span>
          </div>
          <form
            action={saveExhibitionDetails.bind(null, id)}
            className="stack-form"
          >
            <label>
              {t("Title")}
              <input name="title" defaultValue={e.title} required />
            </label>
            <label>
              {t("Exhibition language")}
              <select name="locale" defaultValue={e.locale}>
                {LOCALES.map((l) => (
                  <option key={l} value={l} lang={l}>
                    {LOCALE_NAMES[l]}
                  </option>
                ))}
              </select>
              <small className="muted">
                {t(
                  "Visitors and jurors see FullFrame in this language. Write the texts below in it too.",
                )}
              </small>
            </label>
            <label>
              {t("Introduction")}
              <input
                name="subtitle"
                defaultValue={e.subtitle || ""}
                placeholder={t("A sentence to set the scene")}
              />
            </label>
            <label>
              {t("About this exhibition")}
              <textarea
                name="content"
                rows={5}
                defaultValue={e.welcomeContent || ""}
                placeholder={t("Share the story behind the photographs.")}
              />
            </label>
            <label>
              {t("Cover photograph")}
              <select name="coverImage" defaultValue={e.coverImage || ""}>
                <option value="">{t("First photograph")}</option>
                {gallery?.works
                  .filter((w) => w.preview)
                  .map((w) => (
                    <option key={w.id} value={w.preview!}>
                      {w.name}
                    </option>
                  ))}
              </select>
            </label>
            <button className="primary">{t("Save details")}</button>
          </form>
        </section>
        <aside className="panel collection-peek">
          <div className="section-heading">
            <h2>{t("The photographs")}</h2>
            <Link href={`/admin/${id}/results`}>{t("Select →")}</Link>
          </div>
          {gallery ? (
            <div className="mini-contact-sheet">
              {gallery.works.slice(0, 6).map((w) => (
                <div key={w.id}>
                  <Photograph work={w} />
                </div>
              ))}
            </div>
          ) : (
            <p className="error">
              {t(
                "We couldn’t reach the vault. Check Connection settings below.",
              )}
            </p>
          )}
          <p className="muted">
            {t(
              "Photographs and their descriptions live in TYDAL. Choose which ones to exhibit in Selection & publish.",
            )}
          </p>
          <Link className="button primary" href={`/admin/${id}/results`}>
            {t("Choose photographs →")}
          </Link>
        </aside>
      </div>
      <section className="panel" id="jury">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("A second perspective · Optional")}</p>
            <h2>{t("Invite a jury")}</h2>
          </div>
          <JuryToggle
            id={id}
            phase={e.phase}
            hasJurors={jurors.some((j) => !j.revokedAt)}
          />
        </div>
        <p className="muted">
          {t(
            "Each juror gets a personal link. New exhibitions use one score from 1 to 5 and an optional private note.",
          )}
        </p>
        <JurorList
          exhibitionId={id}
          expectedVotes={
            gallery ? gallery.works.length * criteria.length : null
          }
          jurors={jurors.map((j) => ({
            id: j.id,
            name: j.name,
            email: j.email,
            url: j.token
              ? `${(process.env.APP_URL || "").replace(/\/$/, "")}/j/${j.token}`
              : null,
            revoked: !!j.revokedAt,
            votes: votes.filter((v) => v.jurorId === j.id).length,
          }))}
        />
        <MintJurorForm exhibitionId={id} />
      </section>
      <details
        className="panel connection-settings"
        open={error === "vault" || !!saved}
      >
        <summary>
          {t("Connection settings")}{" "}
          <span className="muted">
            {gallery ? t("Connected") : t("Needs attention")}
          </span>
        </summary>
        <form action={updateBinding.bind(null, id)} className="stack-form">
          <label>
            {t("Shared vault URL")}
            <input name="vaultUrl" type="url" defaultValue={url} required />
          </label>
          <div className="form-grid">
            <label>
              {t("Read key")}
              <input
                name="readVaultKey"
                type="password"
                autoComplete="off"
                placeholder={t("Leave blank to keep the saved key")}
              />
            </label>
            <label>
              {t("Write key")}
              <input
                name="writeVaultKey"
                type="password"
                aria-describedby="write-key-permissions"
                autoComplete="off"
                placeholder={
                  e.writeVaultKey
                    ? t("Leave blank to keep the saved key")
                    : t("Add a key to publish from FullFrame")
                }
              />
            </label>
          </div>
          <p id="write-key-permissions" className="hint">
            {t.rich(
              "Write key permissions in TYDAL: {activate}, {open} and {close} to publish; {ingest}, {update} and {withdraw} to add and correct photographs from here. Leave a key field blank to keep its saved value.",
              {
                activate: <code>w:activate</code>,
                open: <code>w:open</code>,
                close: <code>w:close</code>,
                ingest: <code>w:ingest</code>,
                update: <code>w:update</code>,
                withdraw: <code>w:withdraw</code>,
              },
            )}
          </p>
          <button>{t("Save connection")}</button>
        </form>
      </details>
      <details className="panel danger-zone">
        <summary>{t("Delete exhibition")}</summary>
        <DeleteExhibition
          exhibitionId={id}
          slug={e.slug}
          title={e.title}
          phase={e.phase}
          vaultHash={e.vaultHash}
          vaultBaseUrl={e.vaultBaseUrl || tydalBaseUrl() || null}
        />
      </details>
      </fieldset>
    </main>
  );
}
