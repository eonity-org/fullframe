import "server-only";
/** Only vault-issued machine paths are forwarded. Raw storage URLs stay out. */
export function proxyVaultUrl(
  url: string | null | undefined,
  vaultHash?: string | null,
): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, "http://fullframe.local");
    const match = parsed.pathname.match(/\/h\/([A-Za-z0-9]+)(\/.*)?$/);
    if (!match || (vaultHash && match[1] !== vaultHash)) return null;
    return `/api/vault/h/${match[1]}${match[2] || ""}${parsed.search}`;
  } catch {
    return null;
  }
}
