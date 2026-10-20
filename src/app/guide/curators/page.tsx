import type { Metadata } from "next";
import { isLocale } from "@/i18n/core";
import { viewerLocale } from "@/i18n/server";
import { GuidePage } from "@/components/guides/GuidePage";
import { CuratorGuide, CURATOR_GUIDE_TITLE } from "@/components/guides/CuratorGuide";

type Props = { searchParams: Promise<{ lang?: string }> };

/** `?lang=` from the link that brought the reader here, else the viewer's language. */
async function guideLocale({ searchParams }: Props) {
  const { lang } = await searchParams;
  return isLocale(lang) ? lang : viewerLocale();
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  return { title: `${CURATOR_GUIDE_TITLE[await guideLocale(props)].title} · FullFrame` };
}

export default async function CuratorGuidePage(props: Props) {
  const locale = await guideLocale(props);
  return (
    <GuidePage guide="curators" locale={locale} {...CURATOR_GUIDE_TITLE[locale]}>
      <CuratorGuide locale={locale} />
    </GuidePage>
  );
}
