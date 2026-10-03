"use client";
import { useEffect, useRef, useState } from "react";
import type { GalleryWork } from "@/lib/gallery";
import { photoRows } from "@/lib/photoRows";
import { GalleryNavigationLink, useGalleryAppearance } from "./ExhibitionStyle";
import { Photograph } from "./Photograph";
import { useT } from "@/i18n/client";

export function PhotoCollection({
  base,
  works,
  onOpen,
  mode,
}: {
  /** The exhibition's public path, `/{organization}/{exhibition}`. */
  base: string;
  works: GalleryWork[];
  mode: "album" | "salon";
  onOpen: (work: GalleryWork) => void;
}) {
  const appearance = useGalleryAppearance();
  const t = useT();
  const openWall = appearance.enabledViews.includes("wall");
  const Card = openWall ? GalleryNavigationLink : "button";
  const layout =
    mode === "album"
      ? "mosaic"
      : appearance.layout === "grid"
        ? "grid"
        : "salon";
  const root = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [ratios, setRatios] = useState<Record<string, number>>({});
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const grid = layout === "grid";
  const mosaic = layout === "mosaic";
  const gap = mosaic ? 4 : width < 640 ? 12 : 26;
  const sizes = photoRows(
    works.map((w) => ratios[w.id] || 1),
    width,
    width < 640 ? 170 : mosaic ? 280 : 300,
    gap,
  );
  return (
    <div
      ref={root}
      className={grid ? "photo-grid" : `photo-flow photo-flow-${layout}`}
      style={grid ? undefined : { columnGap: gap }}
    >
      {works.map((work, n) => (
        <Card
          className="photo-card"
          key={work.id}
          href={openWall ? `${base}/wall/${work.id}` : undefined}
          onClick={openWall ? undefined : () => onOpen(work)}
          aria-label={t("View {name}", { name: work.name })}
          style={
            !grid && sizes[n]
              ? { width: Math.floor(sizes[n].width * 64) / 64 }
              : undefined
          }
        >
          <div
            className="photo-well"
            style={!grid && sizes[n] ? { height: sizes[n].height } : undefined}
          >
            <Photograph
              work={work}
              priority={n < 6}
              onDimensions={(w, h) => {
                if (w > 0 && h > 0)
                  setRatios((current) =>
                    current[work.id] === w / h
                      ? current
                      : { ...current, [work.id]: w / h },
                  );
              }}
            />
          </div>
          <div className="photo-caption">
            <div>
              <h2>{work.name}</h2>
              {work.credit && <p>{work.credit}</p>}
            </div>
            <span className="photo-number">
              {String(n + 1).padStart(2, "0")}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}
