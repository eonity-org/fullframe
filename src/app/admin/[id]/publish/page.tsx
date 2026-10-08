import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@db/index";
import { requireStudioAccess } from "@/lib/studioPage";
import { resolveAppearance } from "@/lib/appearance";
import { AppearancePicker } from "@/components/admin/AppearancePicker";
import { AdminNav } from "@/components/admin/AdminNav";
import { StageBar } from "@/components/admin/StageBar";
import { OverviewStats } from "@/components/admin/OverviewStats";
import { loadGallery } from "@/lib/gallery";
import { viewerT } from "@/i18n/server";
import { exhibitionPath } from "@/lib/paths";
export const dynamic = "force-dynamic";
/**
 * Appearance & publish — the last tab, and the studio's first page once the
 * exhibition is selecting or live: its style, where it stands, and the only
 * Publish button.
 */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; detail?: string; opened?: string }>;
}) {
  const id = Number((await params).id);
  const e = await db.query.exhibitions.findFirst({
    where: eq(schema.exhibitions.id, id),
  });
  if (!e) notFound();
  const access = await requireStudioAccess(e);
  const t = await viewerT();
  const { error, detail } = await searchParams;
  let photographs: number | null = null;
  try {
    photographs = (await loadGallery(e)).works.length;
  } catch {}
  const jurors = await db.query.jurors.findMany({
    where: and(eq(schema.jurors.exhibitionId, id), isNull(schema.jurors.revokedAt)),
  });
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
          <p className="eyebrow">{t("Appearance & publication")}</p>
          <h1>{e.title}</h1>
          <p className="intro">{t("Give the exhibition its look, then open it to the public.")}</p>
        </div>
        <Link className="button" href={exhibitionPath(e, "salon")} target="_blank">
          {e.phase === "open" ? t("Visit exhibition ↗") : t("Preview exhibition ↗")}
        </Link>
      </div>
      <AdminNav id={id} />
      <StageBar
        id={id}
        phase={e.phase}
        page="publish"
        selected={e.selectedHashes?.length ?? null}
        visibility={e.visibility}
        privateLink={
          e.phase === "open" && e.visibility === "unlisted" && e.vaultHash
            ? `/x/${e.vaultHash}`
            : null
        }
      />
      {error && (
        <p className="error" role="alert">
          {detail ||
            t(
              "The exhibition could not be published. Save a selection and check the vault connection.",
            )}
        </p>
      )}
      <OverviewStats exhibition={e} photographs={photographs} jurors={jurors.length} />
      <AppearancePicker
        id={id}
        base={exhibitionPath(e)}
        initial={resolveAppearance(e.appearance)}
      />
      </fieldset>
    </main>
  );
}
