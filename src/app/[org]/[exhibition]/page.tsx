import {
  ExhibitionEntryLink,
  ExhibitionEntryLinks,
} from "@/components/ExhibitionEntryLinks";
import { notFound, permanentRedirect } from "next/navigation";
import { canView, getExhibition, legacyAddress } from "@/lib/exhibitions";
import { directoryPathFor, exhibitionPath } from "@/lib/paths";
import { loadGallery } from "@/lib/gallery";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Photograph } from "@/components/Photograph";
import { Teaser } from "@/components/Teaser";
import { exhibitionT } from "@/i18n/server";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ org: string; exhibition: string }>;
}) {
  const { org, exhibition } = await params;
  const e = await getExhibition(org, exhibition);
  const t = exhibitionT(e ?? {});
  return {
    title: e?.title || "FullFrame",
    description: e?.subtitle || t("A photography exhibition"),
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ org: string; exhibition: string }>;
}) {
  const { org, exhibition } = await params;
  const e = await getExhibition(org, exhibition);
  if (!e) {
    // An old `/{exhibition}/{view}` address lands here as org + exhibition.
    const moved = await legacyAddress([org, exhibition]);
    if (moved) permanentRedirect(moved);
    notFound();
  }
  if (!(await canView(e))) return <Teaser title={e.title} directory={directoryPathFor(e)} />;
  let works: Awaited<ReturnType<typeof loadGallery>>["works"] = [];
  try {
    works = (await loadGallery(e)).works;
  } catch {
    /* Entry remains navigable while the vault recovers. */
  }
  const t = exhibitionT(e);
  const cover = works.find((w) => w.preview === e.coverImage) || works[0];
  return (
    <>
      <SiteHeader directory={directoryPathFor(e)} />
      <main className="welcome-page">
        <div className="welcome-copy">
          <p className="eyebrow">{t("An exhibition of photography")}</p>
          <h1>{e.title}</h1>
          {e.subtitle && <p className="intro">{e.subtitle}</p>}
          <div className="welcome-prose">
            {(
              e.welcomeContent ||
              t(
                "A collection of perspectives. An invitation to pause, explore, and see things differently.",
              )
            )
              .split(/\n\s*\n/)
              .map((p, i) => (
                <p key={i}>{p}</p>
              ))}
          </div>
          <ExhibitionEntryLinks base={exhibitionPath(e)} />
          <p className="welcome-count">
            {works.length
              ? t.n(
                  works.length,
                  "{count} photograph · Curated with care",
                  "{count} photographs · Curated with care",
                )
              : t("Explore the collection")}
          </p>
        </div>
        <div className="welcome-image">
          {cover && (
            <>
              <ExhibitionEntryLink
                base={exhibitionPath(e)}
                className="welcome-image-link"
                aria-label={t("Enter the exhibition: {title}", {
                  title: e.title,
                })}
              >
                <Photograph work={cover} large priority />
              </ExhibitionEntryLink>
              <p>
                {cover.name}
                {cover.credit ? ` — ${cover.credit}` : ""}
              </p>
            </>
          )}
        </div>
      </main>
      <SiteFooter title={e.title} />
    </>
  );
}
