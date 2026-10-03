"use client";
import Link from "next/link";
import { useT } from "@/i18n/client";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { FrameMark } from "./FrameMark";

/**
 * `switcher` only where the page speaks the viewer's language (the home page);
 * `home` lines the header up with the home page's width-capped column;
 * `directory` is where the logo leads (an exhibition's organization).
 */
export function SiteHeader({
  switcher = false,
  home = false,
  directory = "/",
}: {
  switcher?: boolean;
  home?: boolean;
  directory?: string;
}) {
  const t = useT();
  return (
    <header className={home ? "gallery-header home-header" : "gallery-header"}>
      <Link
        className="wordmark"
        href={directory}
        aria-label={t("FullFrame — exhibitions")}
      >
        <FrameMark />
        FullFrame
      </Link>
      <div className="site-header-links">
        {switcher && <LocaleSwitcher />}
        <Link href="/admin">{t("Curator sign in ↗")}</Link>
      </div>
    </header>
  );
}
