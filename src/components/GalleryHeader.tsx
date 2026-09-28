"use client";
import {
  GalleryNavigationLink as Link,
  useGalleryAppearance,
} from "./ExhibitionStyle";
import { GALLERY_VIEWS } from "@/lib/appearance";
import { useT } from "@/i18n/client";
export function GalleryHeader({
  slug,
  title,
  active,
}: {
  slug: string;
  title: string;
  active?: string;
}) {
  const { enabledViews } = useGalleryAppearance();
  const t = useT();
  return (
    <header className="gallery-header">
      <Link className="gallery-brand" href={`/${slug}`}>
        <span className="frame-mark" aria-hidden="true" />
        {title}
      </Link>
      <nav aria-label={t("Exhibition")}>
        {enabledViews.map((view) => (
          <Link
            key={view}
            href={`/${slug}/${view}`}
            aria-current={active === view ? "page" : undefined}
          >
            {t(GALLERY_VIEWS[view].label)}
          </Link>
        ))}
        <Link
          href={`/${slug}`}
          aria-current={active === "about" ? "page" : undefined}
        >
          {t("About")}
        </Link>
      </nav>
    </header>
  );
}
