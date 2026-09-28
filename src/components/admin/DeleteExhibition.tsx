"use client";
import { useState, useTransition } from "react";
import { deleteExhibition, setPhase } from "@/lib/actions";
import { ConfirmationDialog } from "./ConfirmationDialog";
import { useT } from "@/i18n/client";

/**
 * `close` → closing a public exhibition (the normal path before deleting);
 * `force` → deleting an open exhibition whose close failed, with the admin
 * acknowledging the vault may stay public; `delete` → deleting a closed one.
 */
type Step = "close" | "force" | "delete";

export function DeleteExhibition({
  exhibitionId,
  slug,
  title,
  phase,
  vaultHash,
  vaultBaseUrl,
}: {
  exhibitionId: number;
  slug: string;
  title: string;
  phase: string;
  vaultHash: string | null;
  vaultBaseUrl: string | null;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("delete");
  const [typed, setTyped] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const [closeFailure, setCloseFailure] = useState<{
    error: string;
    detail?: string;
  } | null>(null);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const isOpenPhase = phase === "open";
  const run = (action: () => Promise<void>) =>
    startTransition(async () => {
      setError("");
      try {
        await action();
      } catch (e) {
        if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT"))
          throw e;
        setError(t("The change could not be completed. Try again."));
      }
    });
  const slugField = (
    <label className="confirm-type">
      <span>
        {t.rich("Type {slug} to confirm deletion", {
          slug: <code>{slug}</code>,
        })}
      </span>
      <input
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={slug}
        autoComplete="off"
      />
    </label>
  );
  const errorLine = error && (
    <p role="alert" className="error">
      {error}
    </p>
  );
  const cancel = (
    <button type="button" disabled={pending} onClick={() => setOpen(false)}>
      {t("Cancel")}
    </button>
  );
  return (
    <>
      <p className="hint">
        {t.rich(
          "Deleting removes {title} and its jury record (jurors, scores, notes) from FullFrame. The photographs stay in TYDAL.",
          { title: <strong>{title}</strong> },
        )}
      </p>
      {notice && (
        <p role="status" className="status ok">
          {notice}
        </p>
      )}
      <button
        type="button"
        className="danger-button"
        onClick={() => {
          setTyped("");
          setAcknowledged(false);
          setError("");
          setCloseFailure(null);
          setStep(isOpenPhase ? "close" : "delete");
          setOpen(true);
        }}
      >
        {t("Delete this exhibition…")}
      </button>
      <ConfirmationDialog
        open={open}
        pending={pending}
        onCancel={() => setOpen(false)}
        title={
          step === "close"
            ? t("Close “{title}” before deleting?", { title })
            : step === "force"
              ? t("Delete “{title}” without closing?", { title })
              : t("Delete “{title}”?", { title })
        }
      >
        {step === "close" && (
          <>
            <p>
              {t(
                "This exhibition is public. Close it first: TYDAL will make the vault private and restore the full submission set. Your exhibition and jury records will be kept until you separately confirm deletion.",
              )}
            </p>
            {closeFailure && (
              <div role="alert" className="close-failure">
                <p className="error">{closeFailure.error}</p>
                <dl>
                  {closeFailure.detail && (
                    <>
                      <dt>{t("TYDAL response")}</dt>
                      <dd>{closeFailure.detail}</dd>
                    </>
                  )}
                  <dt>{t("Vault")}</dt>
                  <dd>
                    {t.rich("{vault} at {address}", {
                      vault: <code>{vaultHash ?? t("not connected")}</code>,
                      address: (
                        <code>
                          {vaultBaseUrl ?? t("no TYDAL address configured")}
                        </code>
                      ),
                    })}
                  </dd>
                </dl>
                <p className="hint">
                  {t(
                    "Check the connection settings, or retry if TYDAL may be temporarily down.",
                  )}
                </p>
              </div>
            )}
            {errorLine}
            <div className="button-row">
              {cancel}
              {closeFailure && (
                <button
                  type="button"
                  className="danger-button"
                  disabled={pending}
                  onClick={() => {
                    setError("");
                    setStep("force");
                  }}
                >
                  {t("Delete without closing…")}
                </button>
              )}
              <button
                type="button"
                className="primary"
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    const result = await setPhase(exhibitionId, "selection");
                    if ("error" in result) {
                      setCloseFailure(result);
                      return;
                    }
                    setNotice(
                      t(
                        "Exhibition closed. Its photographs and jury records are kept. You can now delete it separately.",
                      ),
                    );
                    setOpen(false);
                  })
                }
              >
                {pending
                  ? t("Closing…")
                  : closeFailure
                    ? t("Retry closing")
                    : t("Close exhibition")}
              </button>
            </div>
          </>
        )}
        {step === "force" && (
          <>
            <p>
              {t.rich(
                "FullFrame could not close this vault. If it still exists in TYDAL it stays {public}, and once this exhibition is deleted FullFrame has no way back to it: you will have to close vault {vault} yourself in TYDAL. FullFrame tries to close it once more before deleting.",
                {
                  public: <strong>{t("public")}</strong>,
                  vault: <code>{vaultHash ?? "—"}</code>,
                },
              )}
            </p>
            <label className="confirm-check">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              <span>
                {t(
                  "I understand the vault may remain public and I will close it in TYDAL myself.",
                )}
              </span>
            </label>
            {slugField}
            {errorLine}
            <div className="button-row">
              <button
                type="button"
                disabled={pending}
                onClick={() => setStep("close")}
              >
                {t("Back")}
              </button>
              <button
                type="button"
                className="danger-button"
                disabled={pending || !acknowledged || typed.trim() !== slug}
                onClick={() =>
                  run(() =>
                    deleteExhibition(exhibitionId, typed.trim(), {
                      force: true,
                      acknowledged,
                    }),
                  )
                }
              >
                {pending ? t("Deleting…") : t("Delete without closing")}
              </button>
            </div>
          </>
        )}
        {step === "delete" && (
          <>
            <p>
              {t(
                "The exhibition, its jurors, their scores and notes are removed and cannot be recovered. The photographs in TYDAL are not touched.",
              )}
            </p>
            {slugField}
            {errorLine}
            <div className="button-row">
              {cancel}
              <button
                type="button"
                className="danger-button"
                disabled={pending || typed.trim() !== slug}
                onClick={() =>
                  run(() => deleteExhibition(exhibitionId, typed.trim()))
                }
              >
                {pending ? t("Deleting…") : t("Delete exhibition")}
              </button>
            </div>
          </>
        )}
      </ConfirmationDialog>
    </>
  );
}
