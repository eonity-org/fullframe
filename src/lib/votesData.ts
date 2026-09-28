/**
 * The raw jury data for one exhibition, shaped like the export
 * (`fullframe-votes/2`) — one source for the export route, the results
 * page, and the opening flow, so the scoring input is always the same.
 */
import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@db/index";

export async function rawVotes(exhibitionId: number) {
  const [criteria, jurors] = await Promise.all([
    db.query.criteria.findMany({
      where: eq(schema.criteria.exhibitionId, exhibitionId),
    }),
    db.query.jurors.findMany({
      where: eq(schema.jurors.exhibitionId, exhibitionId),
    }),
  ]);
  const jurorIds = jurors.map((j) => j.id);
  const [votes, comments] = await Promise.all([
    jurorIds.length
      ? db.query.votes.findMany({
          where: inArray(schema.votes.jurorId, jurorIds),
        })
      : Promise.resolve([]),
    jurorIds.length
      ? db.query.comments.findMany({
          where: inArray(schema.comments.jurorId, jurorIds),
        })
      : Promise.resolve([]),
  ]);

  return {
    criteria: criteria.map((c) => ({
      id: c.id,
      name: c.name,
      scale_max: c.scaleMax,
      weight: c.weight,
    })),
    jurors: jurors.map((j) => ({
      id: j.id,
      name: j.name,
      revoked: !!j.revokedAt,
    })),
    votes: votes.map((v) => ({
      juror_id: v.jurorId,
      resource_hash: v.resourceHash,
      criterion_id: v.criterionId,
      score: v.score,
      updated_at: v.updatedAt.toISOString(),
    })),
    comments: comments.map((c) => ({
      juror_id: c.jurorId,
      resource_hash: c.resourceHash,
      body: c.body,
      updated_at: c.updatedAt.toISOString(),
    })),
  };
}
