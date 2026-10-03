"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { useT } from "@/i18n/client";
import { motionFor, playMarkMotion } from "@/lib/markMotion";
import { FrameMark } from "./FrameMark";

/**
 * The last public path a header was shown on, across client navigations.
 * Unset on a fresh page load, when the referrer stands in for it.
 */
let lastPath: string | null | undefined;

function previousPath(): string | null {
  if (lastPath !== undefined) return lastPath;
  try {
    const referrer = new URL(document.referrer);
    return referrer.origin === location.origin ? referrer.pathname : null;
  } catch {
    return null;
  }
}

/** A level of the trail: where it leads and its name (none: no level). */
export type HeaderLevel = { href: string; label?: string | null };

/**
 * The header's left side, from the top down: the mark with FullFrame (all
 * exhibitions), then the organization (its exhibitions), then the current
 * page's name. Each level leads to its own page; `children` is the current
 * name — a link back to the exhibition's entrance from inside its views,
 * plain text elsewhere. The mark always stands with FullFrame: on a phone,
 * with levels after it, the mark alone stands for it. Arriving, the mark
 * plays its motion (src/lib/markMotion.ts).
 */
export function HeaderTrail({
  organization,
  children,
}: {
  organization?: HeaderLevel;
  children?: ReactNode;
}) {
  const t = useT();
  const home = useRef<HTMLAnchorElement>(null);
  const path = usePathname();
  useEffect(() => {
    // Decided once per path: a repeated effect (React's dev double run)
    // finds the path already recorded and plays nothing.
    const motion = motionFor(previousPath(), path);
    lastPath = path;
    const svg = home.current?.querySelector("svg");
    if (motion && svg) playMarkMotion(svg, motion);
  }, [path]);
  return (
    <div className="header-trail">
      <Link
        ref={home}
        className="header-home wordmark"
        href="/"
        aria-label={t("FullFrame — exhibitions")}
      >
        <FrameMark />
        <span className="header-home-name">FullFrame</span>
      </Link>
      {organization?.label && (
        <Link className="header-level" href={organization.href}>
          {organization.label}
        </Link>
      )}
      {children && <span className="header-current">{children}</span>}
    </div>
  );
}
