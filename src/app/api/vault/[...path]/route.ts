/**
 * Vault proxy — the browser's only road to TYDAL.
 *
 * Forwards GET requests to the TYDAL vault boundary, injecting the
 * server-held VaultKey (private, pre-opening vaults) so no credential ever
 * ships client-side. JSON responses get their minted vault URLs rewritten
 * to stay behind this proxy (otherwise `preview`/`url` fields would point
 * the browser straight at TYDAL, keyless, and 404 on a private vault).
 * Binaries (previews, renditions) stream through untouched.
 *
 * Gated by the exhibition phase : while an exhibition is pre-opening
 * the proxy refuses — otherwise the phase gate on pages would be cosmetic,
 * with the whole private vault readable through this route. PREVIEW_MODE
 * bypasses in development; curator and jury sessions also pass the gate.
 * Paths that resolve to no bound exhibition are refused outright.
 *
 * Read-only by design — the vault boundary itself is read-only; votes and
 * comments go to FullFrame's own API, never through here.
 */
import type { NextRequest } from "next/server";
import { canView, exhibitionForVaultPath } from "@/lib/exhibitions";
import { vaultBaseFor, vaultKeyFor } from "@/lib/tydal";
import { proxyVaultUrl } from "@/lib/vaultUrls";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;

  // Only vault address forms, and only for vaults bound to an exhibition —
  // this proxy is not a general tunnel to TYDAL.
  if (path[0] !== "h") {
    return Response.json({ error: "Not a vault address" }, { status: 404 });
  }
  const exhibition = await exhibitionForVaultPath(path);
  if (!exhibition || !(await canView(exhibition))) {
    return Response.json({ error: "Not available" }, { status: 404 });
  }

  const base = vaultBaseFor(exhibition);
  const target = new URL(`${base}/${path.map(encodeURIComponent).join("/")}`);
  req.nextUrl.searchParams.forEach((value, key) =>
    target.searchParams.append(key, value),
  );

  const headers: Record<string, string> = {
    accept: req.headers.get("accept") ?? "*/*",
  };
  const key = vaultKeyFor(exhibition);
  if (key) headers["X-Vault-Key"] = key;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    return Response.json(
      { error: "The exhibition vault is temporarily unavailable." },
      { status: 502 },
    );
  }

  const contentType =
    upstream.headers.get("content-type") ?? "application/octet-stream";

  if (contentType.includes("application/json")) {
    const rewrite = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(rewrite);
      if (value && typeof value === "object")
        return Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, rewrite(v)]),
        );
      if (typeof value === "string" && /^(https?:\/\/|\/h\/)/.test(value))
        return proxyVaultUrl(value, exhibition.vaultHash) ?? value;
      return value;
    };
    const body = JSON.stringify(rewrite(await upstream.json()));
    return new Response(body, {
      status: upstream.status,
      headers: { "content-type": contentType },
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": contentType,
      "cache-control": upstream.headers.get("cache-control") ?? "no-store",
    },
  });
}
