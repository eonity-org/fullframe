import { Suspense } from "react";
import { getExhibition } from "@/lib/exhibitions";
import { studioAccess } from "@/lib/admin";
import { resolveAppearance } from "@/lib/appearance";
import { exhibitionLocale } from "@/i18n/server";
import { I18nProvider } from "@/i18n/client";
import { ExhibitionStyle } from "@/components/ExhibitionStyle";
export default async function ExhibitionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ org: string; exhibition: string }>;
}) {
  const { org, exhibition: slug } = await params;
  const exhibition = await getExhibition(org, slug);
  // Everything inside an exhibition — gallery and jury — speaks its language.
  const locale = exhibitionLocale(exhibition ?? {});
  // No exhibition here: the page 404s or redirects an old address. Outside a
  // Suspense boundary, so that happens before streaming and gets its status.
  if (!exhibition)
    return <I18nProvider locale={locale}>{children}</I18nProvider>;
  return (
    <I18nProvider locale={locale}>
      <Suspense>
        <ExhibitionStyle
          appearance={resolveAppearance(exhibition.appearance)}
          preview={(await studioAccess(exhibition)) === "manage"}
          lang={locale}
        >
          {children}
        </ExhibitionStyle>
      </Suspense>
    </I18nProvider>
  );
}
