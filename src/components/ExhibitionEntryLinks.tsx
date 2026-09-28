"use client";
import type { ReactNode } from "react";
import { GalleryLink, useGalleryAppearance } from "./ExhibitionStyle";
import { useT } from "@/i18n/client";

export function ExhibitionEntryLink({
  slug,
  children,
  className,
  "aria-label": ariaLabel,
}: {
  slug: string;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  const { defaultView } = useGalleryAppearance();
  return (
    <GalleryLink
      className={className}
      href={`/${slug}/${defaultView}`}
      aria-label={ariaLabel}
    >
      {children}
    </GalleryLink>
  );
}

export function ExhibitionEntryLinks({ slug }: { slug: string }) {
  const t = useT();
  return (
    <div className="button-row">
      <ExhibitionEntryLink className="button primary" slug={slug}>
        {t("Enter the exhibition")} <span>↗</span>
      </ExhibitionEntryLink>
    </div>
  );
}
