/** Exhibition lookup and access gates for the public, curator and jury. */
import "server-only";
import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@db/index";
import { exhibitionPath, isReservedOrganizationSlug } from "./paths";
import { vaultFor } from "./tydal";

export type Exhibition = typeof schema.exhibitions.$inferSelect;

/** The exhibition at `/{organization}/{slug}`. */
export const getExhibition = cache(
  async (organization: string, slug: string): Promise<Exhibition | null> =>
    (await db.query.exhibitions.findFirst({
      where: and(
        eq(schema.exhibitions.organizationSlug, organization),
        eq(schema.exhibitions.slug, slug),
      ),
    })) ?? null,
);

/** Every exhibition filed under an organization slug, any phase. */
export async function organizationExhibitions(
  organization: string,
): Promise<Exhibition[]> {
  return db.query.exhibitions.findMany({
    where: eq(schema.exhibitions.organizationSlug, organization),
  });
}

/**
 * Fill in the organization slug of an exhibition connected before it was
 * stored, from its vault's own description. Best effort: a vault that can't
 * be reached leaves it unknown until the next try.
 */
export async function withOrganizationSlug(
  exhibition: Exhibition,
): Promise<Exhibition> {
  if (exhibition.organizationSlug || !exhibition.vaultHash) return exhibition;
  try {
    const organization = (await vaultFor(exhibition).meta()).organization;
    if (!organization || isReservedOrganizationSlug(organization))
      return exhibition;
    await db
      .update(schema.exhibitions)
      .set({ organizationSlug: organization })
      .where(eq(schema.exhibitions.id, exhibition.id));
    return { ...exhibition, organizationSlug: organization };
  } catch {
    return exhibition;
  }
}

/** Sub-paths an old `/{exhibition}/…` address could carry. */
const LEGACY_VIEWS = ["album", "salon", "wall", "jury"];

/**
 * Where an address from before organizations were in the URL —
 * `/{exhibition}`, `/{exhibition}/{view}/…` — lives now, or null. Only an
 * unambiguous slug resolves: once two organizations share one, the old
 * address can no longer tell them apart.
 */
export async function legacyAddress(segments: string[]): Promise<string | null> {
  const [slug, view, ...rest] = segments;
  if (!slug || (view !== undefined && !LEGACY_VIEWS.includes(view))) return null;
  const matches = await db.query.exhibitions.findMany({
    where: eq(schema.exhibitions.slug, slug),
    limit: 2,
  });
  if (matches.length !== 1) return null;
  const exhibition = await withOrganizationSlug(matches[0]);
  if (!exhibition.organizationSlug) return null;
  return exhibitionPath(exhibition, ...(view ? [view, ...rest] : []));
}

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
