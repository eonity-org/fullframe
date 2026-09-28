"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { GalleryWork } from "@/lib/gallery";
import { Photograph } from "./Photograph";
import { useT } from "@/i18n/client";
export function PhotoViewer({
  works,
  index,
  onIndex,
  onClose,
}: {
  works: GalleryWork[];
  index: number;
  onIndex: (n: number) => void;
  onClose?: () => void;
}) {
  const t = useT();
  const detailsId = useId();
  const [playing, setPlaying] = useState(false);
  const [info, setInfo] = useState(false);
  const work = works[index];
  // The description sits in the caption, clamped to a few lines; "more"
  // expands it in place. Each photograph starts clamped.
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  useEffect(() => setExpanded(false), [work?.id]);
  useEffect(() => {
    const el = descriptionRef.current;
    if (!el) return setClamped(false);
    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [work?.id, expanded]);
  const hasDetails = !!work && work.details.length > 0;
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select")) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        onIndex(
          (index + (e.key === "ArrowRight" ? 1 : -1) + works.length) %
            works.length,
        );
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [index, works.length, onIndex]);
  useEffect(() => {
    if (!playing || works.length < 2) return;
    const timer = setTimeout(() => onIndex((index + 1) % works.length), 6000);
    return () => clearTimeout(timer);
  }, [playing, index, works.length, onIndex]);
  if (!work)
    return <div className="empty-state">{t("No photographs to display.")}</div>;
  return (
    <div className={`photo-viewer ${onClose ? "photo-viewer-immersive" : ""}`}>
      <div className="viewer-toolbar">
        <div className="viewer-toolbar-start">
          <span className="viewer-count">
            {String(index + 1).padStart(2, "0")} /{" "}
            {String(works.length).padStart(2, "0")}
          </span>
          {/* The toggle lives by the counter; the details open below the caption.
              Only when there are details — the description is always shown. */}
          {hasDetails && (
            <button
              className="quiet-button viewer-details-toggle"
              aria-expanded={info}
              aria-controls={detailsId}
              onClick={() => setInfo(!info)}
            >
              {info ? `− ${t("Details")}` : `+ ${t("Details")}`}
            </button>
          )}
        </div>
        <div className="button-row">
          <button
            className="quiet-button viewer-slideshow"
            onClick={() => setPlaying(!playing)}
            disabled={works.length < 2}
            aria-pressed={playing}
          >
            {playing ? t("Pause") : t("Slideshow")}
          </button>
          {onClose && (
            <button
              className="icon-button viewer-close"
              autoFocus
              onClick={onClose}
              aria-label={t("Close photograph")}
            >
              ×
            </button>
          )}
        </div>
      </div>
      <div className="viewer-stage">
        <button
          className="viewer-arrow previous"
          onClick={() => onIndex((index - 1 + works.length) % works.length)}
          disabled={works.length < 2}
          aria-label={t("Previous photograph")}
        >
          ‹
        </button>
        <figure>
          <Photograph key={work.id} work={work} large priority />
        </figure>
        <button
          className="viewer-arrow next"
          onClick={() => onIndex((index + 1) % works.length)}
          disabled={works.length < 2}
          aria-label={t("Next photograph")}
        >
          ›
        </button>
      </div>
      <footer className="viewer-caption">
        <h2 aria-live="polite">{work.name}</h2>
        <div className="viewer-caption-meta">
          {work.credit && <p>{work.credit}</p>}
        </div>
        {work.description && (
          <div className="viewer-description">
            <p
              ref={descriptionRef}
              className={expanded ? "expanded" : undefined}
            >
              {work.description}
            </p>
            {(clamped || expanded) && (
              <button
                className="quiet-button"
                aria-expanded={expanded}
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? t("Show less") : t("Show more")}
              </button>
            )}
          </div>
        )}
      </footer>
      {info && hasDetails && (
        <div
          id={detailsId}
          className="viewer-details"
          tabIndex={0}
          role="region"
          aria-label={t("Photograph details")}
        >
          {work.details.map((d) => (
            <p key={d.label}>
              <strong>{d.label.replaceAll("_", " ")}</strong> {d.value}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
