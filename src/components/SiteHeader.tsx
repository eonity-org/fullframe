"use client";
import Link from "next/link";
import { useT } from "@/i18n/client";
import { LocaleSwitcher } from "./LocaleSwitcher";

/**
 * `switcher` only where the page speaks the viewer's language (the home page);
 * `home` lines the header up with the home page's width-capped column.
 */
export function SiteHeader({
  switcher = false,
  home = false,
}: {
  switcher?: boolean;
  home?: boolean;
}) {
  const t = useT();
  return (
    <header className={home ? "gallery-header home-header" : "gallery-header"}>
      <Link
        className="wordmark"
        href="/"
        aria-label={t("FullFrame — exhibitions")}
      >
        <span className="frame-mark" aria-hidden="true" />
        FullFrame
      </Link>
      <div className="site-header-links">
        {switcher && <LocaleSwitcher />}
        <Link href="/admin">{t("Curator sign in ↗")}</Link>
      </div>
    </header>
  );
}
