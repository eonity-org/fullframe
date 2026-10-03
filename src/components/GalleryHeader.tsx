"use client";
import {
  GalleryNavigationLink as Link,
  useGalleryAppearance,
} from "./ExhibitionStyle";
import { GALLERY_VIEWS } from "@/lib/appearance";
import { useT } from "@/i18n/client";
import { HeaderTrail, type HeaderLevel } from "./HeaderTrail";
export function GalleryHeader({
  base,
  title,
  organization,
  active,
}: {
  /** The exhibition's public path, `/{organization}/{exhibition}`. */
  base: string;
  title: string;
  /** Its organization, the trail's middle level. */
  organization: HeaderLevel;
  active?: string;
}) {
  const { enabledViews } = useGalleryAppearance();
  const t = useT();
  return (
    <header className="gallery-header">
      <HeaderTrail organization={organization}>
        <Link href={`${base}`}>{title}</Link>
      </HeaderTrail>
      <nav aria-label={t("Exhibition")}>
        {enabledViews.map((view) => (
          <Link
            key={view}
            href={`${base}/${view}`}
            aria-current={active === view ? "page" : undefined}
          >
            {t(GALLERY_VIEWS[view].label)}
          </Link>
        ))}
        <Link
          href={`${base}`}
          aria-current={active === "about" ? "page" : undefined}
        >
          {t("About")}
        </Link>
      </nav>
    </header>
  );
}
