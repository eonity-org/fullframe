"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { saveCuratedSelection } from "@/lib/actions";
import type { GalleryWork } from "@/lib/gallery";
import { Photograph } from "@/components/Photograph";
import { useT } from "@/i18n/client";
export function SelectionEditor({
  id,
  phase,
  works,
  initial,
  averages,
}: {
  id: number;
  phase: string;
  works: GalleryWork[];
  initial: string[] | null;
  averages: Record<string, number>;
}) {
  const t = useT();
  const [selected, setSelected] = useState(
    new Set(initial ?? works.map((w) => w.id)),
  );
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const dirty =
    !saved ||
    saved.length !== selected.size ||
    saved.some((h) => !selected.has(h));
  const frozen = phase === "open" || phase === "judging";
  const run = (fn: () => Promise<void | { ok: true } | { error: string }>) =>
    start(async () => {
      try {
        setError("");
        const result = await fn();
        if (result && "error" in result) setError(result.error);
      } catch (e) {
        if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT"))
          throw e;
        setError(
          (e as Error).message ||
            t("The change could not be saved. Try again."),
        );
      }
    });
  const ordered = [...works].sort(
    (a, b) => (averages[b.id] ?? -1) - (averages[a.id] ?? -1),
  );
  return (
    <>
      {/* The photographs in a white panel of their own, like the details above. */}
      <section className="panel selection-panel">
      <div className="selection-heading">
        <p className="eyebrow">{t("The photographs")}</p>
        <h2>{t("Choose what to exhibit")}</h2>
        <p className="muted">
          {t("Only the photographs you select go into the public exhibition.")}
        </p>
      </div>
      <div className="collection-toolbar">
        <span>
          {t.rich("{selected} of {total} selected", {
            selected: <strong>{selected.size}</strong>,
            total: works.length,
          })}
        </span>
        <div className="button-row">
          <button
            disabled={frozen}
            onClick={() => setSelected(new Set(works.map((w) => w.id)))}
          >
            {t("Select all")}
          </button>
          <button disabled={frozen} onClick={() => setSelected(new Set())}>
            {t("Clear selection")}
          </button>
        </div>
      </div>
      <div className="selection-grid">
        {ordered.map((work) => (
          <label
            className={`selection-card ${selected.has(work.id) ? "selected" : ""}`}
            key={work.id}
          >
            <input
              type="checkbox"
              checked={selected.has(work.id)}
              disabled={frozen}
              onChange={() =>
                setSelected((prev) => {
                  const next = new Set(prev);
                  next.has(work.id) ? next.delete(work.id) : next.add(work.id);
                  return next;
                })
              }
            />
            <div className="selection-image">
              <Photograph work={work} />
              <span className="selection-check" aria-hidden="true">
                {selected.has(work.id) ? "✓" : "+"}
              </span>
            </div>
            <div className="photo-caption">
              <h3>{work.name}</h3>
              {averages[work.id] !== undefined && (
                <span className="score-badge">
                  {averages[work.id].toLocaleString(t.locale, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}{" "}
                  / 5
                </span>
              )}
            </div>
          </label>
        ))}
      </div>
      {!works.length && (
        <p className="empty-state">
          {t("There are no photographs to select.")}
        </p>
      )}
      </section>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!frozen && (
        <div className="selection-actions">
          <div>
            <strong>
              {t.n(selected.size, "{count} photograph", "{count} photographs")}
            </strong>
            <p className="muted" role="status">
              {dirty
                ? t("Your selection has unsaved changes.")
                : t("Selection saved. Ready when you are.")}
            </p>
          </div>
          <div className="button-row">
            <button
              disabled={!dirty || pending}
              onClick={() =>
                run(async () => {
                  const hashes = [...selected];
                  await saveCuratedSelection(id, hashes);
                  setSaved(hashes);
                })
              }
            >
              {pending ? t("Saving…") : t("Save selection")}
            </button>
            {/* Publishing is on the next tab, so the style is always seen first. */}
            {dirty || !selected.size ? (
              <button className="primary" disabled>
                {t("Next: appearance & publish →")}
              </button>
            ) : (
              <Link className="button primary" href={`/admin/${id}/publish`}>
                {t("Next: appearance & publish →")}
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
