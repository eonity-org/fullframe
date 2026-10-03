"use client";
import Link from "next/link";
import { useT } from "@/i18n/client";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { HeaderTrail, type HeaderLevel } from "./HeaderTrail";

/**
 * `switcher` only where the page speaks the viewer's language (the home page);
 * `organization` is the trail's middle level (on an exhibition's pages) and
 * `current` this page's name (an organization, an exhibition).
 */
export function SiteHeader({
  switcher = false,
  organization,
  current,
}: {
  switcher?: boolean;
  organization?: HeaderLevel;
  current?: string;
}) {
  const t = useT();
  return (
    <header className="gallery-header">
      <HeaderTrail organization={organization}>{current}</HeaderTrail>
      <div className="site-header-links">
        {switcher && <LocaleSwitcher />}
        <Link href="/admin">{t("Curator sign in ↗")}</Link>
      </div>
    </header>
  );
}
