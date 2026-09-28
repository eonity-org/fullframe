import { proxyVaultUrl } from "./vaultUrls";

/** Select only advertised, vault-scoped versions of the resource's face. */
export function galleryImages(
  card: {
    preview?: string | null;
    url?: string | null;
    preview_renditions?: unknown;
  },
  vaultHash: string,
) {
  const renditions = new Map<string, string>();
  if (Array.isArray(card.preview_renditions)) {
    for (const rendition of card.preview_renditions) {
      if (
        !rendition ||
        typeof rendition.name !== "string" ||
        typeof rendition.url !== "string"
      )
        continue;
      const url = proxyVaultUrl(rendition.url, vaultHash);
      if (url) renditions.set(rendition.name, url);
    }
  }
  const original =
    proxyVaultUrl(card.preview, vaultHash) ||
    renditions.get("original") ||
    proxyVaultUrl(card.url, vaultHash);
  return {
    preview:
      renditions.get("medium") ||
      renditions.get("small") ||
      renditions.get("thumbnail") ||
      original,
    url:
      renditions.get("large") ||
      original ||
      renditions.get("medium") ||
      renditions.get("small") ||
      renditions.get("thumbnail") ||
      null,
  };
}
