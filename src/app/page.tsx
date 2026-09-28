import Link from "next/link";
import { Suspense } from "react";
import { ExhibitionCover } from "@/components/ExhibitionCover";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { resolveAppearance } from "@/lib/appearance";
import { eq } from "drizzle-orm";
import { db, schema } from "@db/index";
import { viewerT } from "@/i18n/server";
export const dynamic = "force-dynamic";
export default async function Home() {
  const exhibitions = await db.query.exhibitions.findMany({
    where: eq(schema.exhibitions.phase, "open"),
  });
  const t = await viewerT();
  return (
    <>
      {/* Outside the width-capped main, so its border spans the page (as on
          an exhibition's welcome page). */}
      <SiteHeader switcher home />
      <main className="instance-home">
      {/* Intro and directory heading share a sidebar so the posters start at the top. */}
      <div className="instance-layout">
        <div className="instance-intro">
          <p className="eyebrow">{t("Independent photography exhibitions")}</p>
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
        <section
          className="exhibition-directory"
          aria-labelledby="exhibitions-heading"
        >
          <div className="exhibition-cards">
            {exhibitions.map((e, i) => (
              <Link
                href={`/${e.slug}`}
                key={e.id}
                className="exhibition-tile"
                data-palette={resolveAppearance(e.appearance).palette}
              >
                <div className="exhibition-tile-copy">
                  <span className="eyebrow">
                    {String(i + 1).padStart(2, "0")} · {t("On view")}
                  </span>
                  <h2>{e.title}</h2>
                  <p>{e.subtitle || t("Explore the collection")}</p>
                </div>
                <div className="exhibition-tile-image">
                  <Suspense fallback={<span className="cover-placeholder" />}>
                    <ExhibitionCover exhibition={e} priority={i < 2} />
                  </Suspense>
                </div>
                <span className="exhibition-tile-link">
                  {t("View exhibition")} <span aria-hidden="true">↗</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <SiteFooter lemma={false} />
      </main>
    </>
  );
}
