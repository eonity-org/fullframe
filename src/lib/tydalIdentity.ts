import "server-only";
import { tydalBaseUrl } from "./tydal";
import type { StudioOrganization } from "./admin";

/**
 * TYDAL as the studio's identity provider: `POST /api/v1/auth/identify`
 * confirms an email and password and returns the user with their
 * organizations and roles. It issues no token, so FullFrame never holds a
 * TYDAL credential for a curator, and the curator's own TYDAL sessions are
 * left alone. (A direct `fetch`: this is the one TYDAL call outside the vault
 * boundary, and `@tydal/client` has no method for it yet.)
 */
export type Identity = {
  id: string;
  name: string;
  email: string;
  isSuperadmin: boolean;
  organizations: StudioOrganization[];
};

export type IdentifyResult =
  | { ok: true; identity: Identity }
  | { ok: false; reason: "invalid" | "disabled" | "throttled" | "unavailable" };

export async function identify(email: string, password: string): Promise<IdentifyResult> {
  const base = tydalBaseUrl();
  if (!base) return { ok: false, reason: "unavailable" };
  let response: Response;
  try {
    response = await fetch(`${base}/api/v1/auth/identify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { ok: false, reason: "unavailable" };
  }
  if (response.status === 401 || response.status === 422) return { ok: false, reason: "invalid" };
  if (response.status === 403) return { ok: false, reason: "disabled" };
  if (response.status === 429) return { ok: false, reason: "throttled" };
  if (!response.ok) return { ok: false, reason: "unavailable" };

  const body = (await response.json().catch(() => null)) as {
    data?: {
      user?: { id?: string; name?: string; email?: string; is_superadmin?: boolean };
      organizations?: Array<{ id?: string; slug?: string; name?: string; role?: string | null }>;
    };
  } | null;
  const user = body?.data?.user;
  if (!user?.id || !user.email) return { ok: false, reason: "unavailable" };
  return {
    ok: true,
    identity: {
      id: user.id,
      name: user.name || user.email,
      email: user.email,
      isSuperadmin: !!user.is_superadmin,
      organizations: (body?.data?.organizations ?? []).flatMap((o) =>
        o.id && o.name && o.role
          ? [{ id: o.id, slug: o.slug ?? "", name: o.name, role: o.role }]
          : [],
      ),
    },
  };
}
