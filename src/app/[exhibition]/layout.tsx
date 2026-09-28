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
  params: Promise<{ exhibition: string }>;
}) {
  const exhibition = await getExhibition((await params).exhibition);
  // Everything inside an exhibition — gallery and jury — speaks its language.
  const locale = exhibitionLocale(exhibition ?? {});
  return (
    <I18nProvider locale={locale}>
      <Suspense>
        <ExhibitionStyle
          appearance={resolveAppearance(exhibition?.appearance)}
          preview={exhibition ? (await studioAccess(exhibition)) === "manage" : false}
          lang={locale}
        >
          {children}
        </ExhibitionStyle>
      </Suspense>
    </I18nProvider>
  );
}
