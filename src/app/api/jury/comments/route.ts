/**
 * Comment endpoint — one note per juror per work, upserted.
 * An empty body deletes the note. Same phase gate as votes.
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

  const limit = rateLimit(`comment:${juror.id}`, 60, 60_000);
  if (!limit.ok)
    return tooManyRequests(limit, t("Too many requests — slow down."));

  let payload: { resourceHash?: unknown; body?: unknown };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const resourceHash =
    typeof payload.resourceHash === "string" ? payload.resourceHash.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (!resourceHash)
    return Response.json({ error: "resourceHash required" }, { status: 400 });

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

  const existing = await db.query.comments.findFirst({
    where: and(
      eq(schema.comments.jurorId, juror.id),
      eq(schema.comments.resourceHash, resourceHash),
    ),
  });

  if (!body) {
    if (existing)
      await db
        .delete(schema.comments)
        .where(eq(schema.comments.id, existing.id));
  } else if (existing) {
    await db
      .update(schema.comments)
      .set({ body, updatedAt: new Date() })
      .where(eq(schema.comments.id, existing.id));
  } else {
    await db
      .insert(schema.comments)
      .values({ jurorId: juror.id, resourceHash, body });
  }

  return Response.json({ ok: true });
}
