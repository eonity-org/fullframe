/**
 * Vote endpoint. Upserts one score per juror × work ×
 * criterion. Works are keyed only by their vault-issued machine hash.
 * The jury-phase gate IS the freeze: any other phase rejects writes.
 */
import { and, eq } from "drizzle-orm";
import { db, schema } from "@db/index";
import { vaultFor } from "@/lib/tydal";
import { currentJuror } from "@/lib/jury";
import { rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { exhibitionT, viewerT } from "@/i18n/server";

export async function POST(request: Request) {
  const juror = await currentJuror();
  if (!juror) {
    const t = await viewerT();
    return Response.json(
      {
        error: t("Your jury session has ended. Open your personal link again."),
      },
      { status: 401 },
    );
  }

  const exhibition = await db.query.exhibitions.findFirst({
    where: eq(schema.exhibitions.id, juror.exhibitionId),
  });
  const t = exhibitionT(exhibition ?? {});
  if (!exhibition || exhibition.phase !== "judging") {
    return Response.json({ error: t("The jury is closed.") }, { status: 409 });
  }

  // 120 writes/min per juror — generous for real voting, caps a runaway client.
  const limit = rateLimit(`vote:${juror.id}`, 120, 60_000);
  if (!limit.ok)
    return tooManyRequests(limit, t("Too many requests — slow down."));

  let body: {
    resourceHash?: unknown;
    criterionId?: unknown;
    score?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const resourceHash =
    typeof body.resourceHash === "string" ? body.resourceHash.trim() : "";
  const criterionId = Number(body.criterionId);
  const score = Number(body.score);
  if (!resourceHash || !criterionId || !Number.isInteger(score)) {
    return Response.json(
      { error: "resourceHash, criterionId and integer score required" },
      { status: 400 },
    );
  }

  try {
    const card = await vaultFor(exhibition).resource(resourceHash).meta();
    if (card.id !== resourceHash)
      return Response.json(
        { error: t("Use the photograph’s vault reference.") },
        { status: 400 },
      );
  } catch {
    return Response.json(
      { error: t("This photograph is no longer available in the vault.") },
      { status: 409 },
    );
  }

  const criterion = await db.query.criteria.findFirst({
    where: and(
      eq(schema.criteria.id, criterionId),
      eq(schema.criteria.exhibitionId, exhibition.id),
    ),
  });
  if (!criterion)
    return Response.json({ error: "Unknown criterion" }, { status: 400 });
  if (score < 1 || score > criterion.scaleMax) {
    return Response.json(
      { error: t("Score must be 1–{max}.", { max: criterion.scaleMax }) },
      { status: 400 },
    );
  }

  await db
    .insert(schema.votes)
    .values({ jurorId: juror.id, criterionId, resourceHash, score })
    .onConflictDoUpdate({
      target: [
        schema.votes.jurorId,
        schema.votes.resourceHash,
        schema.votes.criterionId,
      ],
      set: { score, updatedAt: new Date() },
    });

  return Response.json({ ok: true });
}
