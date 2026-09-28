/** Exhibition lookup and access gates for the public, curator and jury. */
import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db, schema } from "@db/index";

export type Exhibition = typeof schema.exhibitions.$inferSelect;

export const getExhibition = cache(
  async (slug: string): Promise<Exhibition | null> =>
    (await db.query.exhibitions.findFirst({
      where: eq(schema.exhibitions.slug, slug),
    })) ?? null,
);

export function isPreviewMode(): boolean {
  return process.env.PREVIEW_MODE === "true";
}

/**
 * The phase gate. Pre-opening, an exhibition is visible only to: a studio
 * session with access to it (the installation admin, or a member of its TYDAL
 * organization — curator preview), this exhibition's juror while the phase is
 * `judging` or `selection`, or the PREVIEW_MODE dev switch.
 */
export async function canView(
  exhibition: Pick<Exhibition, "id" | "phase" | "organizationId">,
): Promise<boolean> {
  if (exhibition.phase === "open" || isPreviewMode()) return true;
  const { studioAccess } = await import("./admin");
  if (await studioAccess(exhibition)) return true;
  const { jurorFor } = await import("./jury");
  return (await jurorFor(exhibition)) !== null;
}

/**
 * Map a proxied vault path to the exhibition that owns that vault.
 * Only the persisted machine vault hash can select a proxy binding.
 */
export async function exhibitionForVaultPath(
  path: string[],
): Promise<Exhibition | null> {
  if (path[0] !== "h" || !path[1]) return null;
  return (
    (await db.query.exhibitions.findFirst({
      where: eq(schema.exhibitions.vaultHash, path[1]),
    })) ?? null
  );
}
