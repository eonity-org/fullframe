import Link from "next/link";
import { Suspense } from "react";
import { ExhibitionCover } from "@/components/ExhibitionCover";
import { AboutMark } from "@/components/AboutMark";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { resolveAppearance } from "@/lib/appearance";
import type { Exhibition } from "@/lib/exhibitions";
import { exhibitionPath, organizationLink } from "@/lib/paths";
import { viewerT } from "@/i18n/server";

/**
 * The directory of exhibitions on view — every organization's at `/`, one
 * organization's at `/{organization}` (then its name follows FullFrame in
 * the header). On `/` each poster names its organization, the one way to
 * reach an organization's page without entering an exhibition first, and
 * the page ends with what the mark means (BRAND.md).
 */
export async function ExhibitionDirectory({
  exhibitions,
  organization,
}: {
  exhibitions: Exhibition[];
  organization?: string;
}) {
  const t = await viewerT();
  return (
    <>
      <SiteHeader switcher current={organization} />
      <main className="instance-home">
      {/* Intro and directory heading share a sidebar so the posters start at the top. */}
      <div className="instance-layout">
        <div className="instance-intro">
          <p className="eyebrow">
            {t("Independent photography exhibitions")}
          </p>
          <h1>
            {t("Make room")}
            <br />
            {t("for a different view.")}
          </h1>
          {/* Two related lines, as written. */}
          <p>
            {t("Photographs worth spending time with.")}
            <br />
            {t("Collections worth exploring.")}
          </p>
          {/* Nothing on view: say so where the section would start, instead of
              an "On view" heading over an empty area that looks unloaded. */}
          {!exhibitions.length && (
            <p className="directory-empty">
              {t("Our next exhibition is taking shape. Check back soon.")}
            </p>
          )}
          <div className="directory-heading" hidden={!exhibitions.length}>
            <p className="eyebrow">{t("On view")}</p>
            <h2 id="exhibitions-heading">{t("Exhibitions")}</h2>
            {exhibitions.length > 0 && (
              <p>
                {t.n(
                  exhibitions.length,
                  "{count} collection to explore",
                  "{count} collections to explore",
                )}
              </p>
            )}
          </div>
        </div>
        {/* The posters' column; on `/` it ends with what the mark means,
            where a reader scrolling the posters arrives (the intro and the
            header may be long out of view by then). */}
        <div className="instance-main">
          <section
            className="exhibition-directory"
            aria-labelledby="exhibitions-heading"
          >
            <div className="exhibition-cards">
              {exhibitions.map((e, i) => {
                const up = organizationLink(e);
                return (
                  // The title's link covers the whole poster; the organization
                  // link sits above it (links can't nest).
                  <article
                    key={e.id}
                    className="exhibition-tile"
                    data-palette={resolveAppearance(e.appearance).palette}
                  >
                    <div className="exhibition-tile-copy">
                      <span className="eyebrow">
                        {String(i + 1).padStart(2, "0")} · {t("On view")}
                      </span>
                      <h2>
                        <Link href={exhibitionPath(e)}>{e.title}</Link>
                      </h2>
                      <p>{e.subtitle || t("Explore the collection")}</p>
                      {!organization && up.label && (
                        <div className="exhibition-tile-organization">
                          {t("Organized by")}{" "}
                          <Link href={up.href}>{up.label}</Link>
                        </div>
                      )}
                    </div>
                    <div className="exhibition-tile-image">
                      <Suspense fallback={<span className="cover-placeholder" />}>
                        <ExhibitionCover exhibition={e} priority={i < 2} />
                      </Suspense>
                    </div>
                    <span className="exhibition-tile-link" aria-hidden="true">
                      {t("View exhibition")} <span>↗</span>
                    </span>
                  </article>
                );
              })}
            </div>
          </section>
          {!organization && (
            <section className="about-mark" aria-labelledby="about-mark-heading">
              <div>
                <h2 id="about-mark-heading">
                  {t("Every view is partial. Together, they make the full frame.")}
                </h2>
                <p>
                  {t(
                    "The square is a photograph on the wall. The corner inside it is a viewfinder: one person’s view. It’s only a corner, because nobody sees the whole picture alone. FullFrame brings the views together, from those who curate, judge, take and look at the photographs.",
                  )}
                </p>
              </div>
              <AboutMark />
            </section>
          )}
        </div>
      </div>
      <SiteFooter lemma={false} />
      </main>
    </>
  );
}
