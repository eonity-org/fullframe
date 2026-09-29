"use client";

/**
 * The submission period (overview box 1): how many photographs each author may
 * send, open / skip / close / reopen, and the invited authors — one line each,
 * with their counter, copy link and revoke. An author's name is fixed at
 * invitation.
 */
import { useActionState, useState, useTransition } from "react";
import {
  mintAuthor,
  revokeAuthor,
  setSubmissionLimit,
  setSubmissions,
  type MintAuthorResult,
} from "@/lib/actions";
import type { SubmissionState } from "@db/schema";
import { useT } from "@/i18n/client";
import { InvitationRow } from "./InvitationRow";

export type AuthorRow = {
  id: number;
  name: string;
  url: string | null;
  sent: number;
  revoked: boolean;
};

const LIMITS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 30, 50];

export function SubmissionsPanel({
  exhibitionId,
  state,
  limit,
  canOpen,
  authors,
}: {
  exhibitionId: number;
  state: SubmissionState;
  limit: number;
  /** Submissions can be opened now (setup, with a working write key). */
  canOpen: boolean;
  authors: AuthorRow[];
}) {
  const t = useT();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [minted, mint, minting] = useActionState<MintAuthorResult, FormData>(
    (previous, formData) => mintAuthor(exhibitionId, previous, formData),
    null,
  );

  const act = (run: () => Promise<{ ok: true } | { error: string }>) =>
    start(async () => {
      setError("");
      try {
        const result = await run();
        if ("error" in result) setError(result.error);
      } catch {
        setError(t("Could not change submissions. Try again."));
      }
    });

  return (
    <div className="submissions">
      <div className="submission-controls">
        <label className="inline-field">
          {t("Photographs per author")}
          <select
            value={limit}
            disabled={pending}
            onChange={(e) =>
              act(() => setSubmissionLimit(exhibitionId, Number(e.target.value)))
            }
          >
            {[...new Set([...LIMITS, limit])]
              .sort((a, b) => a - b)
              .map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
          </select>
        </label>
        <div className="button-row">
          {state === "open" ? (
            <button
              type="button"
              className="primary"
              disabled={pending}
              onClick={() => act(() => setSubmissions(exhibitionId, "closed"))}
            >
              {t("Close submissions")}
            </button>
          ) : (
            <>
              <button
                type="button"
                // Reopening is a second thought, not the step's main action.
                className={state === "closed" ? undefined : "primary"}
                disabled={pending || !canOpen}
                onClick={() => act(() => setSubmissions(exhibitionId, "open"))}
              >
                {state === "closed" ? t("Reopen submissions") : t("Open submissions")}
              </button>
              {state === "pending" && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => act(() => setSubmissions(exhibitionId, "closed"))}
                >
                  {t("Skip submissions")}
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <p className="muted">
        {state === "open"
          ? t("Open: invited authors can send photographs with their links.")
          : state === "closed"
            ? t("Closed: authors can no longer send photographs. Their links keep working if you reopen.")
            : t("Invite authors, then open submissions so they can send photographs — or skip this step.")}
      </p>
      {error && <p className="error">{error}</p>}

      {authors.length > 0 && (
        <ul className="invitation-list">
          {authors.map((a) => (
            <InvitationRow
              key={a.id}
              name={a.name}
              url={a.url}
              revoked={a.revoked}
              progress={t.n(limit, "{sent} / {count} photograph", "{sent} / {count} photographs", {
                sent: a.sent,
              })}
              revoke={() => revokeAuthor(exhibitionId, a.id)}
            />
          ))}
        </ul>
      )}

      <form action={mint} className="invite-form">
        <label>
          {t("Author")}
          <input name="name" required />
        </label>
        <button type="submit" disabled={minting}>
          {minting ? t("Creating…") : t("Invite author")}
        </button>
        <small className="muted">
          {t("Every photograph sent with the link carries this name. It can’t be changed later.")}
        </small>
        {minted && "error" in minted && <p className="error">{minted.error}</p>}
      </form>
    </div>
  );
}
