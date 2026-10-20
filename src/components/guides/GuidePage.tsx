import Link from "next/link";
import type { ReactNode } from "react";
import { I18nProvider } from "@/i18n/client";
import { LOCALES, LOCALE_NAMES, translator, type Locale } from "@/i18n/core";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { guidePath, type Guide } from "@/lib/paths";

/**
 * The frame of a plain-language guide: the site's header and footer in the
 * guide's language, a choice of language at the top, then the guide itself.
 * The guide's language comes from its address (`?lang=`), so a link from a
 * Spanish exhibition opens the Spanish guide whatever the browser prefers.
 */
export function GuidePage({
  guide,
  locale,
  eyebrow,
  title,
  children,
}: {
  guide: Guide;
  locale: Locale;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  const t = translator(locale);
  return (
    <I18nProvider locale={locale}>
      <SiteHeader />
      <main className="guide-page" lang={locale}>
        <nav className="guide-languages" aria-label={t("Language")}>
          {LOCALES.map((l) => (
            <Link
              key={l}
              href={guidePath(guide, l)}
              lang={l}
              aria-current={l === locale ? "page" : undefined}
            >
              {LOCALE_NAMES[l]}
            </Link>
          ))}
        </nav>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <div className="guide-body">{children}</div>
        <SiteFooter />
      </main>
    </I18nProvider>
  );
}

/** A screenshot from the guide's own folder (`public/guide/{locale}`). */
export function GuideFigure({
  locale,
  name,
  alt,
}: {
  locale: Locale;
  name: string;
  alt: string;
}) {
  return (
    <figure className="guide-figure">
      <img src={`/guide/${locale}/${name}.jpg`} alt={alt} loading="lazy" />
    </figure>
  );
}

/**
 * The guide's walkthrough video, recorded on a real exhibition. `preload`
 * stays "none" so the page costs nothing until the reader presses play.
 */
export function GuideVideo({
  name,
  label,
}: {
  name: string;
  label: string;
}) {
  return (
    <figure className="guide-video">
      <video
        controls
        preload="none"
        playsInline
        poster={`/guide/video/${name}.jpg`}
        aria-label={label}
      >
        <source src={`/guide/video/${name}.mp4`} type="video/mp4" />
      </video>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

/** Where the full guides live, for readers who want every detail. */
export const GITHUB_GUIDE =
  "https://github.com/eonity-org/fullframe/blob/main/docs/user-guide";
