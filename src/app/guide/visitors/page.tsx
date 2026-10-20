import type { Metadata } from "next";
import { isLocale } from "@/i18n/core";
import { viewerLocale } from "@/i18n/server";
import { GuidePage } from "@/components/guides/GuidePage";
import { VisitorGuide, VISITOR_GUIDE_TITLE } from "@/components/guides/VisitorGuide";

type Props = { searchParams: Promise<{ lang?: string }> };

/** `?lang=` from the link that brought the reader here, else the viewer's language. */
async function guideLocale({ searchParams }: Props) {
  const { lang } = await searchParams;
  return isLocale(lang) ? lang : viewerLocale();
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  return { title: `${VISITOR_GUIDE_TITLE[await guideLocale(props)].title} · FullFrame` };
}

export default async function VisitorGuidePage(props: Props) {
  const locale = await guideLocale(props);
  return (
    <GuidePage guide="visitors" locale={locale} {...VISITOR_GUIDE_TITLE[locale]}>
      <VisitorGuide locale={locale} />
    </GuidePage>
  );
}
