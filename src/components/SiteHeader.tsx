"use client";
import Link from "next/link";
import { useT } from "@/i18n/client";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { HeaderTrail, type HeaderLevel } from "./HeaderTrail";

/**
 * `switcher` only where the page speaks the viewer's language (the home page);
 * `home` lines the header up with the home page's width-capped column;
 * `organization` is the trail's middle level (on an exhibition's pages) and
 * `current` this page's name (an organization, an exhibition).
 */
export function SiteHeader({
  switcher = false,
  home = false,
  organization,
  current,
}: {
  switcher?: boolean;
  home?: boolean;
  organization?: HeaderLevel;
  current?: string;
}) {
  const t = useT();
  return (
    <header className={home ? "gallery-header home-header" : "gallery-header"}>
      <HeaderTrail organization={organization}>{current}</HeaderTrail>
      <div className="site-header-links">
        {switcher && <LocaleSwitcher />}
        <Link href="/admin">{t("Curator sign in ↗")}</Link>
      </div>
    </header>
  );
}
