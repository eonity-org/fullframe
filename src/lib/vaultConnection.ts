import type { VaultAddress } from "@tydal/client";

/** A shared URL is discovery input; its resolved hash is the binding. */
export function parseVaultUrl(input: string): {
  url: string;
  baseUrl: string;
  vault: VaultAddress;
} {
  const url = new URL(input.trim());
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error("Use an HTTP or HTTPS vault URL.");
  }
  if (url.search || url.hash)
    throw new Error(
      "Use the standing vault URL, without a temporary signed grant or fragment.",
    );
  const match = url.pathname.match(
    /^(.*)\/(h\/([A-Za-z0-9]+)|v\/([^/]+)\/([^/]+))\/?(?:meta)?$/,
  );
  if (!match)
    throw new Error(
      "Paste a shared vault URL, not an individual photograph or an admin page.",
    );
  const prefix = match[1];
  return {
    url: `${url.origin}${prefix}/${match[2]}`,
    baseUrl: `${url.origin}${prefix}`,
    vault: match[3]
      ? { hash: match[3] }
      : {
          org: decodeURIComponent(match[4]),
          slug: decodeURIComponent(match[5]),
        },
  };
}

/** Docker may reach the same TYDAL instance through a different hostname. */
export function serverVaultBase(
  publicBase: string,
  internal?: string,
  publicAlias?: string,
): string {
  if (!internal) return publicBase;
  const server = internal.replace(/\/$/, "");
  if (publicBase === server || publicBase === publicAlias?.replace(/\/$/, ""))
    return server;
  const a = new URL(publicBase);
  const b = new URL(server);
  if (
    ["localhost", "127.0.0.1", "[::1]"].includes(a.hostname) &&
    b.hostname === "host.docker.internal" &&
    a.port === b.port &&
    a.pathname === b.pathname
  )
    return server;
  return publicBase;
}
