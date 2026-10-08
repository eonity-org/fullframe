import "server-only";
import { cache } from "react";
import type { Exhibition } from "./exhibitions";
import { vaultFor } from "./tydal";
import { buildSlotMap } from "./presentation";
import { galleryImages } from "./galleryImages";
import { proxyVaultUrl } from "./vaultUrls";
export type GalleryWork = {
  id: string;
  name: string;
  credit: string | null;
  description: string | null;
  preview: string | null;
  url: string | null;
  thumbnail?: string | null;
  display?: string | null;
  badges: string[];
  details: Array<{ label: string; value: string }>;
};
export const loadGallery = cache(async (exhibition: Exhibition) => {
  const vault = vaultFor(exhibition);
  const meta = await vault.meta();
  const slots = buildSlotMap(meta);
  const works: GalleryWork[] = [];
  const seen = new Set<string>();
  for (let page = 1; ; page++) {
    if (page > 100)
      throw new Error(
        "This exhibition exceeds the current 10,000 photograph limit.",
      );
    const response = await vault.resources({ page, perPage: 100 });
    for (const card of response.resources) {
      if (seen.has(card.id)) continue;
      seen.add(card.id);
      const images = galleryImages(card, meta.hash);
      works.push({
        id: card.id,
        name: slots.caption(card),
        credit: slots.credit(card),
        description: slots.subcaption(card),
        // Keep the original references stable for stored cover selections.
        preview: proxyVaultUrl(card.preview, meta.hash),
        url: proxyVaultUrl(card.url, meta.hash),
        thumbnail: images.preview,
        display: images.url,
        badges: slots.badges(card),
        details: slots.details(card),
      });
    }
    if (!response.pagination.has_more) break;
  }
  return { works, meta };
});

/**
 * What visitors see — and so what the preview shows. Once open, TYDAL's vault
 * holds only the selection (the opening's `activate`); before that it still
 * projects every photograph, so a saved selection is applied here, while
 * preparing or selecting. Not while judging: the jury sees them all. The
 * studio itself keeps using `loadGallery`, which sees everything.
 */
export function exhibitedWorks(
  exhibition: Pick<Exhibition, "phase" | "selectedHashes">,
  works: GalleryWork[],
): GalleryWork[] {
  const selected = exhibition.selectedHashes;
  if (exhibition.phase === "open" || exhibition.phase === "judging" || !selected?.length)
    return works;
  const keep = new Set(selected);
  return works.filter((work) => keep.has(work.id));
}
