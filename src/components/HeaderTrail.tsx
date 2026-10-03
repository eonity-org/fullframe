"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { useT } from "@/i18n/client";
import { FrameMark } from "./FrameMark";

/** A level of the trail: where it leads and its name (none: no level). */
export type HeaderLevel = { href: string; label?: string | null };

/**
 * The header's left side, from the top down: the mark with FullFrame (all
 * exhibitions), then the organization (its exhibitions), then the current
 * page's name. Each level leads to its own page; `children` is the current
 * name — a link back to the exhibition's entrance from inside its views,
 * plain text elsewhere. The mark always stands with FullFrame: on a phone,
 * with levels after it, the mark alone stands for it.
 */
export function HeaderTrail({
  organization,
  children,
}: {
  organization?: HeaderLevel;
  children?: ReactNode;
}) {
  const t = useT();
  return (
    <div className="header-trail">
      <Link
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
