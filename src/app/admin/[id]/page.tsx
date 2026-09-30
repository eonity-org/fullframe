import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@db/index";
import { requireStudioAccess } from "@/lib/studioPage";
import { loadGallery } from "@/lib/gallery";
import { updateBinding } from "@/lib/actions";
import { tydalBaseUrl, tydalLinkBaseUrl } from "@/lib/tydal";
import { AdminNav } from "@/components/admin/AdminNav";
import { StageBar } from "@/components/admin/StageBar";
import { OverviewStats } from "@/components/admin/OverviewStats";
import { JurorList } from "@/components/admin/JurorList";
import { MintJurorForm } from "@/components/admin/MintJurorForm";
import { JuryToggle } from "@/components/admin/JuryToggle";
import { PhaseButton } from "@/components/admin/PhaseButton";
import { DeleteExhibition } from "@/components/admin/DeleteExhibition";
import { PhotoUploader } from "@/components/admin/PhotoUploader";
import { SubmissionsPanel } from "@/components/admin/SubmissionsPanel";
import { StudioStep } from "@/components/admin/StudioStep";
import { authorUrl, submittedBy } from "@/lib/authors";
import { photoDetails, uploadAccess, UPLOAD_ACCESS_NOTES } from "@/lib/uploads";
import { Photograph } from "@/components/Photograph";
import { viewerT } from "@/i18n/server";
import { exhibitionPath } from "@/lib/paths";
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
  const larger = new Map(gallery?.works.map((w) => [w.id, w.display ?? w.preview]) ?? []);
  const sentBy = await submittedBy(ingested);
  const authors = await db.query.authors.findMany({
    where: eq(schema.authors.exhibitionId, id),
  });
  const setup = e.phase === "setup";
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
          <p className="eyebrow">{t("Exhibition setup")}</p>
          <h1>{e.title}</h1>
        </div>
        <Link className="button" href={exhibitionPath(e, "salon")} target="_blank">
          {t("Preview exhibition ↗")}
        </Link>
      </div>
      <AdminNav id={id} />
      <StageBar
        id={id}
        phase={e.phase}
        page="setup"
        selected={e.selectedHashes?.length ?? null}
        base={exhibitionPath(e)}
      />
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
      <OverviewStats
        exhibition={e}
        photographs={gallery?.works.length ?? null}
        jurors={jurors.filter((j) => !j.revokedAt).length}
      />
      <StudioStep
        number={1}
        id="submissions"
        eyebrow={t("Open call · Optional")}
        title={t("Submissions")}
        active={setup && e.submissions !== "closed"}
        status={
          // In setup the panel itself says the period is closed.
          setup
            ? undefined
            : t("Submissions are only possible while you prepare the exhibition.")
        }
      >
        {setup && (
          <SubmissionsPanel
            exhibitionId={id}
            state={e.submissions}
            limit={e.submissionLimit}
            canOpen={upload === "ready"}
            authors={authors.map((a) => ({
              id: a.id,
              name: a.name,
              url: a.token ? authorUrl(a.token) : null,
              sent: [...sentBy.values()].filter((s) => s.id === a.id).length,
              revoked: !!a.revokedAt,
            }))}
          />
        )}
      </StudioStep>
      <StudioStep
        number={2}
        id="photographs"
        eyebrow={t("Yours and the authors’")}
        title={t("Photographs")}
        active={setup}
        status={t(UPLOAD_ACCESS_NOTES["not-setup"])}
        action={
          e.phase === "selection" && (
            <PhaseButton id={id} target="setup" label={t("Back to preparing")} />
          )
        }
      >
        {setup && (
          <>
            <p className="muted">
              {t(
                "Photographs you add here go straight into this exhibition’s vault in TYDAL, with the details you give them — TYDAL keeps them exactly as written.",
              )}
            </p>
            <PhotoUploader
              endpoint={`/admin/${id}/photographs`}
              canUpload={access === "manage" && upload === "ready"}
              maxUploadBytes={maxUploadBytes}
              note={upload === "ready" ? null : t(UPLOAD_ACCESS_NOTES[upload])}
              addedTitle={t("In this exhibition")}
              added={added.map((photo) => ({
                ...photo,
                preview: previews.get(photo.hash) ?? null,
                large: larger.get(photo.hash) ?? null,
                authorLocked: sentBy.has(photo.hash),
              }))}
            />
          </>
        )}
      </StudioStep>
      <StudioStep
        number={3}
        id="jury"
        eyebrow={t("A second perspective · Optional")}
        title={t("Invite a jury")}
        active={(setup && e.submissions !== "open") || e.phase === "judging"}
        status={
          setup
            ? t("Close or skip submissions first.")
            : e.phase === "open"
            ? t("The exhibition is published; the jury’s work is done.")
            : t("Judging is closed. You can reopen it while you are choosing.")
        }
        action={
          <div className="button-row">
            <JuryToggle
              id={id}
              phase={e.phase}
              hasJurors={jurors.some((j) => !j.revokedAt)}
            />
            {setup && (
              <PhaseButton id={id} target="selection" label={t("Skip the jury →")} />
            )}
          </div>
        }
      >
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
        {e.phase !== "open" && <MintJurorForm exhibitionId={id} />}
      </StudioStep>
      <StudioStep
        number={4}
        id="choose"
        eyebrow={t("The photographs")}
        title={t("Choose and publish")}
        active={e.phase === "selection" || e.phase === "open"}
        status={
          e.phase === "judging"
            ? t("Close judging to choose the photographs.")
            : t("When the photographs are in, start judging or skip the jury to choose which to exhibit.")
        }
        action={
          <Link className="button primary" href={`/admin/${id}/results`}>
            {t("Choose photographs →")}
          </Link>
        }
      >
        {gallery ? (
          <div className="mini-contact-sheet wide">
            {gallery.works.slice(0, 8).map((w) => (
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
            "In Selection you write the exhibition’s texts and choose the photographs; then pick its style and publish it in Appearance & publish.",
          )}
        </p>
      </StudioStep>
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
