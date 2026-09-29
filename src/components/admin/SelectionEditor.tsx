"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { openExhibition, saveCuratedSelection, setPhase } from "@/lib/actions";
import type { GalleryWork } from "@/lib/gallery";
import { ConfirmationDialog } from "./ConfirmationDialog";
import { Photograph } from "@/components/Photograph";
import { useT } from "@/i18n/client";
export function SelectionEditor({
  id,
  slug,
  phase,
  works,
  initial,
  averages,
}: {
  id: number;
  slug: string;
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
  const [confirm, setConfirm] = useState(false);
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
      {phase === "judging" && (
        <div className="status">
          {t("The jury is still scoring.")}{" "}
          <button
            onClick={() => run(() => setPhase(id, "selection"))}
            disabled={pending}
          >
            {t("Close judging to select photographs")}
          </button>
        </div>
      )}
      {phase === "open" && (
        <div className="status ok">
          <strong>{t("Your exhibition is live.")}</strong>
          <Link href={`/${slug}/salon`} target="_blank">
            {t("Visit exhibition ↗")}
          </Link>
          <button
            disabled={pending}
            onClick={() => {
              setError("");
              setConfirm(true);
            }}
          >
            {t("Close exhibition")}
          </button>
        </div>
      )}
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
      {error && !confirm && (
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
            <button
              className="primary"
              disabled={dirty || !selected.size || pending}
              onClick={() => {
                setError("");
                setConfirm(true);
              }}
            >
              {t("Publish exhibition ↗")}
            </button>
          </div>
        </div>
      )}
      <ConfirmationDialog
        open={confirm}
        pending={pending}
        onCancel={() => setConfirm(false)}
        title={
          phase === "open"
            ? t("Close this exhibition?")
            : t("Ready to open the doors?")
        }
      >
        <p>
          {phase === "open"
            ? t(
                "The public gallery will close and TYDAL will restore the full submission set.",
              )
            : t.n(
                selected.size,
                "{count} photograph will become public. Jury scoring will be closed.",
                "{count} photographs will become public. Jury scoring will be closed.",
              )}
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="button-row">
          <button disabled={pending} onClick={() => setConfirm(false)}>
            {t("Cancel")}
          </button>
          <button
            className="primary"
            disabled={pending}
            onClick={() =>
              run(async () => {
                if (phase === "open") {
                  const result = await setPhase(id, "selection");
                  if ("error" in result) return result;
                  setConfirm(false);
                } else await openExhibition(id);
              })
            }
          >
            {pending
              ? t("Updating…")
              : phase === "open"
                ? t("Close exhibition")
                : t("Publish now")}
          </button>
        </div>
      </ConfirmationDialog>
    </>
  );
}
