"use client";
import type { ReactNode } from "react";
import { GalleryLink, useGalleryAppearance } from "./ExhibitionStyle";
import { useT } from "@/i18n/client";

export function ExhibitionEntryLink({
  base,
  children,
  className,
  "aria-label": ariaLabel,
}: {
  /** The exhibition's public path, `/{organization}/{exhibition}`. */
  base: string;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  const { defaultView } = useGalleryAppearance();
  return (
    <GalleryLink
      className={className}
      href={`${base}/${defaultView}`}
      aria-label={ariaLabel}
    >
      {children}
    </GalleryLink>
  );
}

export function ExhibitionEntryLinks({ base }: { base: string }) {
  const t = useT();
  return (
    <div className="button-row">
      <ExhibitionEntryLink className="button primary" base={base}>
        {t("Enter the exhibition")} <span>↗</span>
      </ExhibitionEntryLink>
    </div>
  );
}
