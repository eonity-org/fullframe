import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@db/index";
import { requireStudioAccess } from "@/lib/studioPage";
import { loadGallery } from "@/lib/gallery";
import { rawVotes } from "@/lib/votesData";
import { computeScores } from "@/lib/scoring";
import { AdminNav } from "@/components/admin/AdminNav";
import { StageBar } from "@/components/admin/StageBar";
import { SelectionEditor } from "@/components/admin/SelectionEditor";
import { ExhibitionDetails } from "@/components/admin/ExhibitionDetails";
import { viewerT } from "@/i18n/server";
import { exhibitionPath } from "@/lib/paths";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  const e = await db.query.exhibitions.findFirst({
    where: eq(schema.exhibitions.id, id),
  });
  if (!e) notFound();
  const access = await requireStudioAccess(e);
  const t = await viewerT();
  let gallery: Awaited<ReturnType<typeof loadGallery>> | null = null;
  try {
    gallery = await loadGallery(e);
  } catch {}
  const ranked = computeScores(await rawVotes(id));
  const averages = Object.fromEntries(ranked.map((w) => [w.hash, w.score * 5]));
  return (
    <main className="studio">
      {access === "view" && (
        <p className="status" role="status">
          {t("Read-only: your TYDAL role lets you look at this exhibition, not change it.")}
        </p>
      )}
      {/* A viewer's studio: every control disabled; the server refuses changes too. */}
      <fieldset className="studio-fieldset" disabled={access !== "manage"}>
      <Link href="/admin" className="back-link">
        {t("← All exhibitions")}
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("Selection")}</p>
          <h1>{e.title}</h1>
          <p className="intro">
            {t("Choose the photographs that tell your story.")}
          </p>
        </div>
        <Link className="button" href={exhibitionPath(e, "salon")} target="_blank">
          {e.phase === "open" ? t("Visit exhibition ↗") : t("Preview exhibition ↗")}
        </Link>
      </div>
      <AdminNav id={id} />
      <StageBar
        id={id}
        phase={e.phase}
        page="selection"
        selected={e.selectedHashes?.length ?? null}
        visibility={e.visibility}
        privateLink={
          e.phase === "open" && e.visibility === "unlisted" && e.vaultHash
            ? `/x/${e.vaultHash}`
            : null
        }
      />
      <ExhibitionDetails exhibition={e} works={gallery?.works ?? []} />
      {gallery ? (
        <SelectionEditor
          id={id}
          phase={e.phase}
          works={gallery.works}
          initial={e.selectedHashes}
          averages={averages}
        />
      ) : (
        <div className="empty-state">
          <h2>{t("Photographs couldn’t be loaded.")}</h2>
          <p>{t("Check the connection in Setup, then try again.")}</p>
        </div>
      )}
      {ranked.length > 0 && (
        <p className="muted">
          {t(
            "Jury averages are shown out of 5. Your selection is always yours to make.",
          )}{" "}
          <a href={`/admin/${id}/votes`}>{t("Download jury record ↓")}</a>
        </p>
      )}
      </fieldset>
    </main>
  );
}
