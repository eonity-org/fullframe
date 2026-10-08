"use client";

/**
 * The stage bar's one forward move (StageBar.tsx): close judging, publish —
 * only on Appearance & publish, so the style is always seen before opening,
 * and from preparing too (the jury is optional) — or, once live, close the
 * exhibition (visiting it is the page heading's button). Publishing and closing ask first; publishing also
 * asks how: public, or only through a private link.
 */
import Link from "next/link";
import { useState, useTransition } from "react";
import { openExhibition, setPhase } from "@/lib/actions";
import { ConfirmationDialog } from "./ConfirmationDialog";
import { useT } from "@/i18n/client";
import type { Visibility } from "@db/schema";

export type StudioPage = "setup" | "selection" | "publish";

export function StageActions({
  id,
  phase,
  page,
  selected,
}: {
  id: number;
  phase: string;
  page: StudioPage;
  selected: number | null;
}) {
  const t = useT();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>("public");
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
        {live ? (
          <p>{t("The gallery will close and TYDAL will restore the full submission set.")}</p>
        ) : (
          <>
            <fieldset className="visibility-choice">
              <legend>{t("Who can see it")}</legend>
              <label className="check">
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === "public"}
                  onChange={() => setVisibility("public")}
                />
                <span>
                  <strong>{t("Public")}</strong>
                  <small className="muted">
                    {t("Anyone can find it: at its address, on your organization’s page and on the FullFrame home page.")}
                  </small>
                </span>
              </label>
              <label className="check">
                <input
                  type="radio"
                  name="visibility"
                  checked={visibility === "unlisted"}
                  onChange={() => setVisibility("unlisted")}
                />
                <span>
                  <strong>{t("Private link")}</strong>
                  <small className="muted">
                    {t("Only people you give the link to can see it. It isn’t listed anywhere, and the photographs stay private in TYDAL.")}
                  </small>
                </span>
              </label>
            </fieldset>
            <p>
              {visibility === "public"
                ? t.n(
                    selected ?? 0,
                    "{count} photograph will become public. Jury scoring will be closed.",
                    "{count} photographs will become public. Jury scoring will be closed.",
                  )
                : t.n(
                    selected ?? 0,
                    "{count} photograph will be on view to whoever has the link. Jury scoring will be closed.",
                    "{count} photographs will be on view to whoever has the link. Jury scoring will be closed.",
                  )}
            </p>
          </>
        )}
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
              run(() => (live ? setPhase(id, "selection") : openExhibition(id, visibility)))
            }
          >
            {pending ? t("Updating…") : live ? t("Close exhibition") : t("Publish now")}
          </button>
        </div>
      </ConfirmationDialog>
    </div>
  );
}
