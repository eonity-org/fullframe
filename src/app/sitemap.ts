import type { MetadataRoute } from "next";
import { db } from "@db/index";
import { resolveAppearance } from "@/lib/appearance";
import { vaultFor } from "@/lib/tydal";
import { withOrganizationSlug } from "@/lib/exhibitions";
import { exhibitionPath } from "@/lib/paths";

/**
 * Public sitemap: only OPEN, public exhibitions and their works — a
 * pre-opening or unlisted exhibition leaks nothing here either. Works come from the
 * vault (now public), so the URLs match what a visitor sees.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.APP_URL ?? "").replace(/\/$/, "");
  if (!base) return [];

  const exhibitions = await Promise.all(
    (await db.query.exhibitions.findMany()).map(withOrganizationSlug),
  );
  const entries: MetadataRoute.Sitemap = [];

  for (const exhibition of exhibitions) {
    if (exhibition.phase !== "open" || exhibition.visibility !== "public") continue;
    const lastModified = exhibition.openedAt ?? exhibition.updatedAt;

    const { enabledViews } = resolveAppearance(exhibition.appearance);
    for (const path of ["", ...enabledViews.map((view) => `/${view}`)]) {
      entries.push({ url: `${base}${exhibitionPath(exhibition)}${path}`, lastModified });
    }

    if (!enabledViews.includes("wall")) continue;
    try {
      const vault = vaultFor(exhibition);
      for (let page = 1; page <= 20; page++) {
        const res = await vault.resources({ page, perPage: 50 });
        for (const card of res.resources) {
          if (card.id) {
            entries.push({
              url: `${base}${exhibitionPath(exhibition, "wall", card.id)}`,
              lastModified,
            });
          }
        }
        if (!res.pagination.has_more) break;
      }
    } catch {
      // vault unreachable — the exhibition pages are still listed
    }
  }

  return entries;
}
