"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GalleryView } from "@/lib/appearance";
import type { GalleryWork } from "@/lib/gallery";
import { GalleryHeader } from "./GalleryHeader";
import type { HeaderLevel } from "./HeaderTrail";
import { PhotoCollection } from "./PhotoCollection";
import { PhotoViewer } from "./PhotoViewer";
import { GalleryNavigationLink, useGalleryAppearance } from "./ExhibitionStyle";
import { useT } from "@/i18n/client";
import { SiteFooter } from "./SiteFooter";
export function ExhibitionGallery({
  base,
  title,
  organization,
  subtitle,
  works,
  mode = "salon",
  initialIndex = 0,
}: {
  /** The exhibition's public path, `/{organization}/{exhibition}`. */
  base: string;
  title: string;
  /** Its organization, the header trail's middle level. */
  organization: HeaderLevel;
  subtitle?: string | null;
  works: GalleryWork[];
  mode?: GalleryView;
  initialIndex?: number;
}) {
  const { defaultView } = useGalleryAppearance();
  const t = useT();
  const [index, setIndex] = useState(initialIndex);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const tags = useMemo(
    () => [...new Set(works.flatMap((w) => w.badges))].sort(),
    [works],
  );
  const filtered = useMemo(
    () =>
      works.filter(
        (w) =>
          (!tag || w.badges.includes(tag)) &&
          (!query ||
            [w.name, w.credit, w.description, ...w.badges]
              .join(" ")
              .toLowerCase()
              .includes(query.toLowerCase())),
      ),
    [works, query, tag],
  );
  const change = useCallback(
    (n: number) => {
      setIndex(n);
      if (mode === "wall" && works[n])
        window.history.replaceState(
          null,
          "",
          `${base}/wall/${works[n].id}${window.location.search}`,
        );
    },
    [mode, base, works],
  );
  useEffect(() => {
    if (!open) {
      dialog.current?.close();
      return;
    }
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);
  return (
    <div className={mode === "wall" ? "wall-page" : undefined}>
      <GalleryHeader base={base} title={title} organization={organization} active={mode} />
      {mode === "wall" ? (
        index < 0 ? (
          <main className="empty-state">
            <h1>{t("Photograph unavailable")}</h1>
            <p>
              {t("This photograph is no longer available at this address.")}
            </p>
            <GalleryNavigationLink
              className="button"
              href={`${base}/${defaultView}`}
            >
              {t("Return to the exhibition")}
            </GalleryNavigationLink>
          </main>
        ) : (
          <PhotoViewer works={works} index={index} onIndex={change} />
        )
      ) : (
        <main className={`salon ${mode === "album" ? "album" : ""}`}>
          <div className="salon-heading">
            <div>
              <p className="eyebrow">
                {t.n(
                  works.length,
                  "The collection · {count} photograph",
                  "The collection · {count} photographs",
                )}
              </p>
              <h1>{mode === "album" ? title : t("A closer look.")}</h1>
              {subtitle && <p className="intro">{subtitle}</p>}
            </div>
            {mode !== "album" && (
              <p className="salon-invitation">
                {t("Take your time.")}
                <br />
                {t("Every frame has a story.")}
              </p>
            )}
          </div>
          <div className="collection-toolbar">
            <label className="search-field">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder={t("Find a photograph…")}
                aria-label={t("Search photographs")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className="button-row">
              <span className="muted">
                {t.n(
                  filtered.length,
                  "{count} photograph",
                  "{count} photographs",
                )}
              </span>
              {tags.length > 0 && (
                <button
                  className="quiet-button"
                  onClick={() => setShowFilters(!showFilters)}
                  aria-expanded={showFilters}
                >
                  {t("Filters")} {tag ? "· 1" : "+"}
                </button>
              )}
            </div>
          </div>
          {showFilters && (
            <div className="filter-strip">
              <button onClick={() => setTag("")} aria-pressed={!tag}>
                {t("All photographs")}
              </button>
              {tags.map((badge) => (
                <button
                  key={badge}
                  aria-pressed={tag === badge}
                  onClick={() => setTag(tag === badge ? "" : badge)}
                >
                  {badge}
                </button>
              ))}
            </div>
          )}
          <PhotoCollection
            base={base}
            mode={mode}
            works={filtered}
            onOpen={(work) => {
              setIndex(works.findIndex((w) => w.id === work.id));
              setOpen(true);
            }}
          />
          {!filtered.length && (
            <div className="empty-state">
              <h2>
                {works.length
                  ? t("No photographs match.")
                  : t("The collection is empty.")}
              </h2>
              {works.length > 0 && (
                <button
                  onClick={() => {
                    setQuery("");
                    setTag("");
                  }}
                >
                  {t("Clear search and filters")}
                </button>
              )}
            </div>
          )}
          <SiteFooter title={title} />
        </main>
      )}
      <dialog
        aria-label={t("Photograph viewer")}
        className="lightbox-dialog"
        ref={dialog}
        onCancel={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        {open && (
          <PhotoViewer
            works={works}
            index={index}
            onIndex={change}
            onClose={() => setOpen(false)}
          />
        )}
      </dialog>
    </div>
  );
}
