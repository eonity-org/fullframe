"use client";

/**
 * The stage bar's one forward move (StageBar.tsx): close judging, publish —
 * only on Appearance & publish, so the style is always seen before opening,
 * and from preparing too (the jury is optional) — or, once live, visit and
 * close the exhibition. Publishing and closing ask first.
 */
import Link from "next/link";
import { useState, useTransition } from "react";
import { openExhibition, setPhase } from "@/lib/actions";
import { ConfirmationDialog } from "./ConfirmationDialog";
import { useT } from "@/i18n/client";

export type StudioPage = "setup" | "selection" | "publish";

export function StageActions({
  id,
  phase,
  page,
  selected,
  base,
}: {
  id: number;
  phase: string;
  page: StudioPage;
  selected: number | null;
  base: string;
}) {
  const t = useT();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const run = (fn: () => Promise<void | { ok: true } | { error: string }>) =>
    start(async () => {
      try {
        setError("");
        const result = await fn();
        if (result && "error" in result) setError(result.error);
        else setConfirm(false);
      } catch (e) {
        if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
        setError((e as Error).message || t("The change could not be saved. Try again."));
      }
    });

  if (phase === "judging")
    return (
      <div className="stage-actions">
        <button
          className="primary"
          disabled={pending}
          onClick={() => run(() => setPhase(id, "selection"))}
        >
          {pending ? t("Updating…") : t("Close judging")}
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    );

  if (phase === "selection" && page !== "publish")
    return (
      <div className="stage-actions">
        <Link className="button" href={`/admin/${id}/publish`}>
          {t("Publish →")}
        </Link>
      </div>
    );

  // Preparing: publishing is still possible (no jury), but only where the
  // style is chosen; the other tabs keep the bar quiet.
  if (phase === "setup" && page !== "publish") return null;

  const live = phase === "open";
  return (
    <div className="stage-actions">
      {live && (
        <Link href={`${base}/salon`} target="_blank">
          {t("Visit exhibition ↗")}
        </Link>
      )}
      <button
        className={live ? undefined : "primary"}
        disabled={pending || (!live && !selected)}
        onClick={() => {
          setError("");
          setConfirm(true);
        }}
      >
        {live ? t("Close exhibition") : t("Publish exhibition ↗")}
      </button>
      {!live && !selected && (
        <small className="muted">{t("Save a selection in Selection first.")}</small>
      )}
      <ConfirmationDialog
        open={confirm}
        pending={pending}
        onCancel={() => setConfirm(false)}
        title={live ? t("Close this exhibition?") : t("Ready to open the doors?")}
      >
        <p>
          {live
            ? t("The public gallery will close and TYDAL will restore the full submission set.")
            : t.n(
                selected ?? 0,
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
              run(() => (live ? setPhase(id, "selection") : openExhibition(id)))
            }
          >
            {pending ? t("Updating…") : live ? t("Close exhibition") : t("Publish now")}
          </button>
        </div>
      </ConfirmationDialog>
    </div>
  );
}
