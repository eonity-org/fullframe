/**
 * Raw votes export — the deterministic input the scoring
 * engine (and any external analysis) consumes. Admin session required.
 * Juror tokens never appear; works are keyed by vault-issued hash.
 */
import { eq } from "drizzle-orm";
import { db, schema } from "@db/index";
import { studioAccess, studioSession } from "@/lib/admin";
import { rawVotes } from "@/lib/votesData";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await studioSession()))
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: idRaw } = await params;
  const id = Number(idRaw);
  const exhibition = await db.query.exhibitions.findFirst({
    where: eq(schema.exhibitions.id, id),
  });
  // Viewers may read it too; outside the exhibition's organization it doesn't exist.
  if (!exhibition || !(await studioAccess(exhibition)))
    return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({
    format: "fullframe-votes/2",
    exported_at: new Date().toISOString(),
    exhibition: {
      slug: exhibition.slug,
      title: exhibition.title,
      vault: exhibition.vaultHash,
      phase: exhibition.phase,
    },
    ...(await rawVotes(id)),
  });
}
