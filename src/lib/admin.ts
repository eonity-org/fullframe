/**
 * Studio sign-in — who may run exhibitions, and which.
 *
 * Two kinds of studio session, both in one stateless HMAC-signed cookie (no
 * session table):
 *
 * - the **installation admin** — the `ADMIN_PASSWORD` holder, or a TYDAL
 *   platform admin — sees and manages every exhibition;
 * - a **curator** — a TYDAL user, confirmed by TYDAL's identify endpoint
 *   (src/lib/tydalIdentity.ts) — carries their TYDAL organizations and roles,
 *   and reaches only the exhibitions of those organizations.
 *
 * FullFrame keeps no TYDAL credential for a curator: TYDAL only confirms who
 * they are. What they may do here follows their organization role, as in
 * TYDAL: owner, admin and editor manage; a viewer gets a read-only studio.
 * Losing access in TYDAL takes effect at the next sign-in, so curator
 * sessions are kept short.
 *
 * Any studio session with access to an exhibition also bypasses its phase gate
 * (pages and vault proxy), which makes PREVIEW_MODE a pure dev switch.
 */
import 'server-only';
import { cache } from 'react';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const COOKIE = 'ff_studio';
const ADMIN_SESSION_HOURS = 24 * 7;
const CURATOR_SESSION_HOURS = 12;

export type StudioOrganization = { id: string; slug: string; name: string; role: string };

export type StudioSession =
  | { kind: 'admin'; name?: string }
  | { kind: 'curator'; id: string; name: string; email: string; organizations: StudioOrganization[] };

/** What someone may do with one exhibition in the studio. */
export type StudioAccess = 'manage' | 'view';

/** TYDAL organization roles that may change an exhibition; `viewer` only looks. */
const MANAGING_ROLES = ['owner', 'admin', 'editor'];

/** Shared HMAC key for the studio AND jury session cookies. */
export function sessionSecret(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password && !process.env.SESSION_SECRET) return null;
  // Compose passes an omitted optional secret as an empty string.
  return process.env.SESSION_SECRET || `ff-session:${password}`;
}

export function adminEnabled(): boolean {
  return !!process.env.ADMIN_PASSWORD;
}

/** Curators sign in against TYDAL, so the server must reach it (and sign cookies). */
export function curatorLoginEnabled(): boolean {
  return !!process.env.TYDAL_BASE_URL && !!sessionSecret();
}

export function checkPassword(candidate: string): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(password);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sign(payload: string, key: string): string {
  return createHmac('sha256', key).update(`ff-studio:${payload}`).digest('base64url');
}

/** `payload.exp.mac` — exported for tests; the cookie value. */
export function encodeSession(session: StudioSession, exp: number, key: string): string {
  const payload = `${Buffer.from(JSON.stringify(session)).toString('base64url')}.${exp}`;
  return `${payload}.${sign(payload, key)}`;
}

/** The session in a cookie value, if it is intact and unexpired — exported for tests. */
export function decodeSession(value: string, key: string, now = Date.now()): StudioSession | null {
  const [data, expRaw, mac] = value.split('.');
  if (!data || !expRaw || !mac) return null;
  const expected = Buffer.from(sign(`${data}.${expRaw}`, key));
  const given = Buffer.from(mac);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  if (!(Number(expRaw) > now)) return null;
  try {
    return JSON.parse(Buffer.from(data, 'base64url').toString()) as StudioSession;
  } catch {
    return null;
  }
}

/**
 * Access to an exhibition filed under `organizationId` — exported for tests.
 * An exhibition with no organization (connected without a write key, or
 * before organizations existed) belongs to the installation admin alone.
 */
export function accessFor(
  session: StudioSession | null,
  organizationId: string | null | undefined,
): StudioAccess | null {
  if (!session) return null;
  if (session.kind === 'admin') return 'manage';
  const membership = organizationId
    ? session.organizations.find((o) => o.id === organizationId)
    : undefined;
  if (!membership) return null;
  return MANAGING_ROLES.includes(membership.role) ? 'manage' : 'view';
}

/** Organizations where this session may create or manage exhibitions. */
export function managedOrganizations(session: StudioSession | null): StudioOrganization[] {
  if (session?.kind !== 'curator') return [];
  return session.organizations.filter((o) => MANAGING_ROLES.includes(o.role));
}

export async function createStudioSession(session: StudioSession): Promise<void> {
  const key = sessionSecret();
  if (!key) throw new Error('Set ADMIN_PASSWORD or SESSION_SECRET to sign studio sessions');
  const hours = session.kind === 'admin' ? ADMIN_SESSION_HOURS : CURATOR_SESSION_HOURS;
  const exp = Date.now() + hours * 3600_000;
  (await cookies()).set(COOKIE, encodeSession(session, exp, key), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires: new Date(exp),
  });
}

export async function destroyStudioSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** The signed-in studio session, if any (once per request). */
export const studioSession = cache(async (): Promise<StudioSession | null> => {
  const key = sessionSecret();
  const value = (await cookies()).get(COOKIE)?.value;
  return key && value ? decodeSession(value, key) : null;
});

export async function isInstallationAdmin(): Promise<boolean> {
  return (await studioSession())?.kind === 'admin';
}

/** This session's access to one exhibition. */
export async function studioAccess(exhibition: {
  organizationId: string | null;
}): Promise<StudioAccess | null> {
  return accessFor(await studioSession(), exhibition.organizationId);
}
