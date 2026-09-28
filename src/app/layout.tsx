import type { Metadata } from "next";
import { I18nProvider } from "@/i18n/client";
import { viewerLocale, viewerT } from "@/i18n/server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await viewerT();
  return {
    title: "FullFrame",
    description: t("Photo exhibition & voting platform"),
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await viewerLocale();
  return (
    <html lang={locale}>
      <body>
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
