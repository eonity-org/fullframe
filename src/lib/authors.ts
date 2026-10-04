/**
 * Invited authors — the submission period. The curator invites an author by
 * name; the author sends up to the exhibition's `submissionLimit` photographs
 * through a personal `/e/{token}` link while submissions are open (exhibition
 * in setup, `submissions` = `open`). The photographs go through the same vault `ingest`
 * the curator uses, with the author's name put in by FullFrame — never taken
 * from the form — so it can't be changed afterwards.
 *
 * Like jurors, only the token's sha256 is the lookup key; the raw token is
 * kept so the curator can re-copy the link.
 */
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@db/index";
import type { Exhibition } from "./exhibitions";
import type { PhotoDetails } from "./photoFields";

export type Author = typeof schema.authors.$inferSelect;

export function newToken(): { token: string; tokenHash: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function authorUrl(token: string): string {
  return `${(process.env.APP_URL ?? "").replace(/\/$/, "")}/e/${token}`;
}

/** Resolve a personal-link token to its active author and exhibition, or null. */
export async function authorFromToken(
  token: string,
): Promise<{ author: Author; exhibition: Exhibition } | null> {
  if (!token || token.length < 20) return null;
  const author = await db.query.authors.findFirst({
    where: eq(schema.authors.tokenHash, hashToken(token)),
  });
  if (!author || author.revokedAt) return null;
  const exhibition = await db.query.exhibitions.findFirst({
    where: eq(schema.exhibitions.id, author.exhibitionId),
  });
  return exhibition ? { author, exhibition } : null;
}

/** Authors may send photographs now. */
export function submissionsOpen(exhibition: Exhibition): boolean {
  return exhibition.phase === "setup" && exhibition.submissions === "open";
}

/**
 * The photographs an author has in the vault now: their submissions that TYDAL
 * still lists as added through this vault (a photograph the curator removed
 * no longer counts against the limit).
 */
export async function authorEntries(
  authorId: number,
  ingested: string[],
): Promise<string[]> {
  const rows = await db.query.submissions.findMany({
    where: eq(schema.submissions.authorId, authorId),
  });
  const live = new Set(ingested);
  return rows.map((r) => r.resourceHash).filter((h) => live.has(h));
}

/** Which author sent each of these photographs, by hash. */
export async function submittedBy(
  hashes: string[],
): Promise<Map<string, Author>> {
  if (!hashes.length) return new Map();
  const rows = await db
    .select()
    .from(schema.submissions)
    .innerJoin(schema.authors, eq(schema.submissions.authorId, schema.authors.id))
    .where(inArray(schema.submissions.resourceHash, hashes));
  return new Map(rows.map((r) => [r.submissions.resourceHash, r.authors]));
}

/** An author-sent photograph keeps its author, whatever the edit form says. */
export async function keepAuthor(
  hash: string,
  details: PhotoDetails,
): Promise<PhotoDetails> {
  const author = (await submittedBy([hash])).get(hash);
  return author ? { ...details, author: author.name } : details;
}

export async function forgetSubmission(hash: string): Promise<void> {
  await db
    .delete(schema.submissions)
    .where(eq(schema.submissions.resourceHash, hash));
}
