import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@db/index";
import { getExhibition } from "@/lib/exhibitions";
import { exhibitionPath } from "@/lib/paths";
import { currentJuror } from "@/lib/jury";
import { loadGallery } from "@/lib/gallery";
import { JuryRoom } from "@/components/jury/JuryRoom";
import { exhibitionT } from "@/i18n/server";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ org: string; exhibition: string }>;
}) {
  const { org, exhibition } = await params;
  const e = await getExhibition(org, exhibition);
  if (!e) notFound();
  const juror = await currentJuror();
  if (!juror || juror.exhibitionId !== e.id) redirect(exhibitionPath(e));
  const t = exhibitionT(e);
  // A juror can hold a link before the curator opens judging. Nothing to show
  // yet — the vault proxy refuses jurors until `judging` (see `jurorFor`).
  if (e.phase === "setup")
    return (
      <main className="empty-state">
        <h1>{t("Judging hasn’t opened yet.")}</h1>
        <p>
          {t(
            "The curator will open the jury for {title} soon. Your link stays valid, so come back to it then.",
            { title: e.title },
          )}
        </p>
        <a className="button" href={exhibitionPath(e, "jury")}>
          {t("Check again")}
        </a>
      </main>
    );
  const criteria = await db.query.criteria.findMany({
    where: eq(schema.criteria.exhibitionId, e.id),
  });
  const votes = await db.query.votes.findMany({
    where: eq(schema.votes.jurorId, juror.id),
  });
  const comments = await db.query.comments.findMany({
    where: eq(schema.comments.jurorId, juror.id),
  });
  const scores: Record<string, Record<number, number>> = {};
  for (const v of votes) {
    const key = v.resourceHash;
    (scores[key] ??= {})[v.criterionId] = v.score;
  }
  let gallery: Awaited<ReturnType<typeof loadGallery>> | null = null;
  try {
    gallery = await loadGallery(e);
  } catch {}
  if (!gallery)
    return (
      <main className="empty-state">
        <h1>{t("Your scores are safe.")}</h1>
        <p>
          {t(
            "We couldn’t reach the photographs. Please try again in a moment.",
          )}
        </p>
        <a className="button" href={exhibitionPath(e, "jury")}>
          {t("Try again")}
        </a>
      </main>
    );
  return (
    <JuryRoom
      title={e.title}
      base={exhibitionPath(e)}
      name={juror.name}
      works={gallery.works}
      criteria={criteria.map((c) => ({
        id: c.id,
        name: c.name,
        scaleMax: c.scaleMax,
      }))}
      initialScores={scores}
      initialNotes={Object.fromEntries(
        comments.map((c) => [c.resourceHash, c.body]),
      )}
      closed={e.phase !== "judging"}
    />
  );
}
