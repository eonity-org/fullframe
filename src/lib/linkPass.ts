import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { sessionSecret } from "./admin";

/**
 * The private link's pass. An `unlisted` exhibition is reached only through
 * `/x/{vaultHash}` (src/app/x/[hash]/route.ts), which leaves this cookie: a
 * signature over the exhibition and its vault hash, so it is worth nothing
 * for another exhibition, and stops working if the exhibition is
 * reconnected to another vault. Like the jury's link, it is the address that
 * grants access; the cookie only carries it through the exhibition's pages
 * and the vault proxy.
 */

const DAYS = 365;

type Passable = { id: number; vaultHash: string | null };

const cookieName = (exhibition: Passable) => `ff_x_${exhibition.id}`;

function signature(exhibition: Passable, key: string): string {
  return createHmac("sha256", key)
    .update(`ff-link:${exhibition.id}:${exhibition.vaultHash}`)
    .digest("base64url");
}

export async function grantLinkPass(exhibition: Passable): Promise<void> {
  const key = sessionSecret();
  if (!key || !exhibition.vaultHash) return;
  (await cookies()).set(cookieName(exhibition), signature(exhibition, key), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: DAYS * 24 * 3600,
  });
}

export async function hasLinkPass(exhibition: Passable): Promise<boolean> {
  const key = sessionSecret();
  if (!key || !exhibition.vaultHash) return false;
  const value = (await cookies()).get(cookieName(exhibition))?.value;
  if (!value) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(signature(exhibition, key));
  return a.length === b.length && timingSafeEqual(a, b);
}
