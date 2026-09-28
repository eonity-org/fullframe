import type { MetadataRoute } from "next";
import { db } from "@db/index";
import { resolveAppearance } from "@/lib/appearance";
import { vaultFor } from "@/lib/tydal";

/**
 * Public sitemap: only OPEN exhibitions and their works — a
 * pre-opening exhibition leaks nothing here either. Works come from the
 * vault (now public), so the URLs match what a visitor sees.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.APP_URL ?? "").replace(/\/$/, "");
  if (!base) return [];

  const exhibitions = await db.query.exhibitions.findMany();
  const entries: MetadataRoute.Sitemap = [];

  for (const exhibition of exhibitions) {
    if (exhibition.phase !== "open") continue;
    const lastModified = exhibition.openedAt ?? exhibition.updatedAt;

    const { enabledViews } = resolveAppearance(exhibition.appearance);
    for (const path of ["", ...enabledViews.map((view) => `/${view}`)]) {
      entries.push({ url: `${base}/${exhibition.slug}${path}`, lastModified });
    }

    if (!enabledViews.includes("wall")) continue;
    try {
      const vault = vaultFor(exhibition);
      for (let page = 1; page <= 20; page++) {
        const res = await vault.resources({ page, perPage: 50 });
        for (const card of res.resources) {
          if (card.id) {
            entries.push({
              url: `${base}/${exhibition.slug}/wall/${card.id}`,
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
