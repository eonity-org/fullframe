import { notFound, redirect } from "next/navigation";
import { canView, getExhibition } from "@/lib/exhibitions";
import { studioAccess } from "@/lib/admin";
import {
  previewAppearance,
  resolveAppearance,
  type GalleryView,
} from "@/lib/appearance";
import { loadGallery } from "@/lib/gallery";
import { directoryPathFor, exhibitionPath } from "@/lib/paths";
import { ExhibitionGallery } from "./ExhibitionGallery";
import { Teaser } from "./Teaser";
import { exhibitionT } from "@/i18n/server";

export type GalleryPageProps = {
  params: Promise<{ org: string; exhibition: string; work?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function GalleryPage({
  params,
  searchParams,
  mode,
}: GalleryPageProps & { mode: GalleryView }) {
  const p = await params;
  const exhibition = await getExhibition(p.org, p.exhibition);
  if (!exhibition) notFound();
  if (!(await canView(exhibition))) return (
      <Teaser title={exhibition.title} directory={directoryPathFor(exhibition)} />
    );
  const saved = resolveAppearance(exhibition.appearance);
  const query = new URLSearchParams();
  // Unsaved appearance previews, for those who may manage this exhibition.
  if ((await studioAccess(exhibition)) === "manage") {
    const search = await searchParams;
    for (const key of [
      "ffTheme",
      "ffType",
      "ffPalette",
      "ffLayout",
      "ffViews",
      "ffDefault",
    ]) {
      if (typeof search[key] === "string") query.set(key, search[key]);
    }
  }
  const appearance = previewAppearance(saved, query);
  // Disabled views remain unavailable through direct links as well as navigation.
  if (!appearance.enabledViews.includes(mode))
    redirect(
      `${exhibitionPath(exhibition, appearance.defaultView)}${query.size ? `?${query}` : ""}`,
    );
  try {
    const { works } = await loadGallery(exhibition);
    return (
      <ExhibitionGallery
        base={exhibitionPath(exhibition)}
        title={exhibition.title}
        subtitle={exhibition.subtitle}
        works={works}
        mode={mode}
        initialIndex={
          p.work?.length
            ? p.work.length === 1
              ? works.findIndex((work) => work.id === p.work![0])
              : -1
            : 0
        }
      />
    );
  } catch {
    const t = exhibitionT(exhibition);
    return (
      <main className="empty-state">
        <h1>{t("We couldn’t load the photographs.")}</h1>
        <p>{t("The exhibition vault is temporarily unavailable.")}</p>
        <a
          className="button"
          href={`${exhibitionPath(exhibition, mode)}${query.size ? `?${query}` : ""}`}
        >
          {t("Try again")}
        </a>
      </main>
    );
  }
}
