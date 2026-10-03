import { vaultFor } from "@/lib/tydal";
import { galleryImages } from "@/lib/galleryImages";
import { proxyVaultUrl } from "@/lib/vaultUrls";
import type { Exhibition } from "@/lib/exhibitions";
import { Photograph } from "./Photograph";
import { FrameMark } from "./FrameMark";

/** A cover needs one card, never a scan of every photograph in the exhibition. */
export async function ExhibitionCover({
  exhibition,
  priority,
}: {
  exhibition: Exhibition;
  priority: boolean;
}) {
  try {
    const vault = vaultFor(exhibition);
    const coverPath = proxyVaultUrl(
      exhibition.coverImage,
      exhibition.vaultHash,
    );
    const hash = coverPath?.match(
      /^\/api\/vault\/h\/[A-Za-z0-9]+\/([A-Za-z0-9]+)\/preview(?:\?|$)/,
    )?.[1];
    const selected = hash
      ? await vault
          .resource(hash)
          .meta()
          .catch(() => null)
      : null;
    const card =
      selected || (await vault.resources({ page: 1, perPage: 1 })).resources[0];
    if (card && exhibition.vaultHash) {
      const images = galleryImages(card, exhibition.vaultHash);
      return (
        <Photograph
          priority={priority}
          work={{
            id: card.id,
            name: exhibition.title,
            credit: null,
            description: null,
            preview: images.preview,
            thumbnail: images.preview,
            url: null,
            badges: [],
            details: [],
          }}
        />
      );
    }
  } catch {
    /* Keep the exhibition navigable while its cover is unavailable. */
  }
  return (
    <span className="cover-placeholder" aria-hidden="true">
      <FrameMark />
    </span>
  );
}
