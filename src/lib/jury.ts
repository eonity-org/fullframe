/**
 * Juror access. A juror authenticates to FullFrame with the
 * personal opaque token from their minted URL — never a TYDAL credential.
 * Only the token's sha256 lives in the DB; the entry route swaps the token
 * for an HMAC-signed session cookie so the URL itself stops mattering after
 * the first visit (and revocation is checked on every request anyway).
 */
import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@db/index";
import { sessionSecret } from "./admin";

const COOKIE = "ff_jury";
const SESSION_DAYS = 30;

export type Juror = typeof schema.jurors.$inferSelect;

function sign(jurorId: number, exp: number, key: string): string {
  return createHmac("sha256", key)
    .update(`ff-jury:${jurorId}:${exp}`)
    .digest("base64url");
}

/** Resolve a personal-URL token to its active juror, or null. */
export async function jurorFromToken(token: string): Promise<Juror | null> {
  if (!token || token.length < 20) return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const juror = await db.query.jurors.findFirst({
    where: eq(schema.jurors.tokenHash, tokenHash),
  });
  return juror && !juror.revokedAt ? juror : null;
}

export async function createJurySession(jurorId: number): Promise<void> {
  const key = sessionSecret();
  if (!key) throw new Error("SESSION_SECRET / ADMIN_PASSWORD is not set");
  const exp = Date.now() + SESSION_DAYS * 24 * 3600_000;
  (await cookies()).set(
    COOKIE,
    `${jurorId}.${exp}.${sign(jurorId, exp, key)}`,
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      expires: new Date(exp),
    },
  );
}

/** The active juror behind this request's session — revocation re-checked. */
export async function currentJuror(): Promise<Juror | null> {
  const key = sessionSecret();
  if (!key) return null;
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return null;
  const [idRaw, expRaw, mac] = value.split(".");
  const jurorId = Number(idRaw);
  const exp = Number(expRaw);
  if (!jurorId || !exp || exp < Date.now() || !mac) return null;
  const expected = sign(jurorId, exp, key);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const juror = await db.query.jurors.findFirst({
    where: eq(schema.jurors.id, jurorId),
  });
  return juror && !juror.revokedAt ? juror : null;
}

/** The juror for THIS exhibition, only while the jury is at work. */
export async function jurorFor(exhibition: {
  id: number;
  phase: string;
}): Promise<Juror | null> {
  if (!["judging", "selection"].includes(exhibition.phase)) return null;
  const juror = await currentJuror();
  return juror && juror.exhibitionId === exhibition.id ? juror : null;
}
