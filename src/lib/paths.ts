/**
 * Public addresses. An exhibition lives under its TYDAL organization's slug —
 * `/{organization}/{exhibition}/…` — so each organization has its own
 * directory at `/{organization}`, while `/` still lists every exhibition on
 * view. Client-safe: no server imports.
 */

/**
 * First path segments FullFrame itself uses (routes and public files). An
 * organization with one of these slugs would be unreachable, so a vault from
 * it is refused when connecting.
 */
export const RESERVED_ORGANIZATION_SLUGS = [
  "admin",
  "api",
  "e",
  "j",
  "x",
  "_next",
  "robots.txt",
  "sitemap.xml",
  "favicon.ico",
  "tydal-logo.png",
  "tydal-logo-white.png",
] as const;

export function isReservedOrganizationSlug(slug: string): boolean {
  return (RESERVED_ORGANIZATION_SLUGS as readonly string[]).includes(
    slug.toLowerCase(),
  );
}

/**
 * The exhibition's public path, plus optional sub-path segments:
 * `exhibitionPath(e, "wall", id)` → `/lucila/semana-42/wall/{id}`. An
 * exhibition connected before organizations were in the URL may not know its
 * organization's slug yet: it gets its old `/{exhibition}` address, which
 * resolves the slug and redirects (src/lib/legacy.ts).
 */
export function exhibitionPath(
  exhibition: { organizationSlug?: string | null; slug: string },
  ...rest: string[]
): string {
  const segments = [
    ...(exhibition.organizationSlug ? [exhibition.organizationSlug] : []),
    exhibition.slug,
    ...rest,
  ];
  return `/${segments.map(encodeURIComponent).join("/")}`;
}

/** An organization's directory. */
export function organizationPath(slug: string): string {
  return `/${encodeURIComponent(slug)}`;
}

/**
 * An exhibition's organization as a header trail level: its directory and
 * name. Unknown yet (no slug), it has no label and the level is left out.
 */
export function organizationLink(exhibition: {
  organizationSlug?: string | null;
  organizationName?: string | null;
}): { href: string; label: string | null } {
  return exhibition.organizationSlug
    ? {
        href: organizationPath(exhibition.organizationSlug),
        label: exhibition.organizationName || exhibition.organizationSlug,
      }
    : { href: "/", label: null };
}

/** A path `exhibitionPath` could have produced — safe to redirect to. */
export function isExhibitionBase(path: string): boolean {
  return /^\/[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)?$/.test(path);
}

/**
 * Where the studio opens an exhibition: Appearance & publish once it's being
 * selected or is live (publishing, or closing, is what's left to do), Setup
 * before that.
 */
export function studioPath(exhibition: { id: number; phase: string }): string {
  return exhibition.phase === "selection" || exhibition.phase === "open"
    ? `/admin/${exhibition.id}/publish`
    : `/admin/${exhibition.id}`;
}
