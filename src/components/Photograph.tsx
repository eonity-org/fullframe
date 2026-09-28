"use client";
import { useEffect, useRef, useState } from "react";
import type { GalleryWork } from "@/lib/gallery";
import { useT } from "@/i18n/client";
export function Photograph({
  work,
  large = false,
  priority = false,
  onDimensions,
}: {
  work: GalleryWork;
  large?: boolean;
  priority?: boolean;
  onDimensions?: (width: number, height: number) => void;
}) {
  const urls = [
    ...new Set(
      (large
        ? [work.display, work.preview, work.url]
        : [work.thumbnail, work.preview, work.url]
      ).filter((s): s is string => !!s),
    ),
  ];
  const t = useT();
  const [attempt, setAttempt] = useState(0);
  const image = useRef<HTMLImageElement>(null);
  const dimensionsCallback = useRef(onDimensions);
  dimensionsCallback.current = onDimensions;
  const source = urls[attempt];
  useEffect(() => {
    // Priority images can finish before hydration attaches the load handler.
    const element = image.current;
    if (element?.complete && element.naturalWidth > 0)
      dimensionsCallback.current?.(element.naturalWidth, element.naturalHeight);
  }, [source]);
  return source ? (
    <img
      ref={image}
      src={source}
      alt={work.credit ? `${work.name} — ${work.credit}` : work.name}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onLoad={(e) =>
        onDimensions?.(
          e.currentTarget.naturalWidth,
          e.currentTarget.naturalHeight,
        )
      }
      onError={() => setAttempt((a) => a + 1)}
    />
  ) : (
    <span className="image-unavailable">
      {t("Preview unavailable")}
      <span>{work.name}</span>
    </span>
  );
}
