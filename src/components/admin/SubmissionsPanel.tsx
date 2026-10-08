"use client";

/**
 * The submission period (overview box 1): how many photographs each author may
 * send, whether they must describe them, whether AITY suggests titles and
 * descriptions, the data protection details every author accepts, open / skip
 * / close / reopen, and the invited authors — one line each,
 * with their counter, copy link and revoke. An author's name is fixed at
 * invitation.
 */
import { useActionState, useState, useTransition } from "react";
import {
  mintAuthor,
  regenerateAuthor,
  revokeAuthor,
  savePrivacy,
  setDescriptionRequired,
  setSuggestionsEnabled,
  setSubmissionLimit,
  setSubmissions,
  type MintAuthorResult,
  type PrivacyResult,
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
  /** Agreed to AI processing of their photographs. */
  aiConsent: boolean;
};

export type PrivacyDetails = {
  controller: string | null;
  contact: string | null;
  notes: string | null;
};

const LIMITS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 30, 50];

export function SubmissionsPanel({
  exhibitionId,
  state,
  limit,
  descriptionRequired,
  suggestionsEnabled,
  privacy,
  canOpen,
  blockedNote,
  authors,
}: {
  exhibitionId: number;
  state: SubmissionState;
  limit: number;
  /** Authors must describe each photograph, not only title it. */
  descriptionRequired: boolean;
  /** AITY proposes titles and descriptions (an author's photographs only with consent). */
  suggestionsEnabled: boolean;
  /** Who is responsible for the authors' data — required to open submissions. */
  privacy: PrivacyDetails;
  /** Submissions can be opened now (setup, with a working write key). */
  canOpen: boolean;
  /** Why it can't, already translated (no write key, TYDAL unreachable…). */
  blockedNote: string | null;
  authors: AuthorRow[];
}) {
  const t = useT();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [minted, mint, minting] = useActionState<MintAuthorResult, FormData>(
    (previous, formData) => mintAuthor(exhibitionId, previous, formData),
    null,
  );

  // Like the jury: nothing to open until someone holds an invitation.
  const invited = authors.some((a) => !a.revoked);
  // Opening needs an author, so closed with nobody ever invited was skipped:
  // there is nothing to reopen, only to open.
  const skipped = state === "closed" && authors.length === 0;
  // Nor until authors can be told who is responsible for their data.
  const privacyReady = !!privacy.controller && !!privacy.contact;
  const [editingPrivacy, setEditingPrivacy] = useState(!privacyReady);
  const [privacySaved, savePrivacyDetails, savingPrivacy] = useActionState<
    PrivacyResult,
    FormData
  >(async (previous, formData) => {
    const result = await savePrivacy(exhibitionId, previous, formData);
    if (result && "ok" in result) setEditingPrivacy(false);
    return result;
  }, null);
  // What authors agreed to depends on these: fixed while they can send.
  const locked = state === "open";
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
        <div className="submission-settings">
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
          <label className="inline-field">
            {t("Description")}
            <select
              value={descriptionRequired ? "required" : "optional"}
              disabled={pending}
              onChange={(e) =>
                act(() => setDescriptionRequired(exhibitionId, e.target.value === "required"))
              }
            >
              <option value="optional">{t("Optional")}</option>
              <option value="required">{t("Required")}</option>
            </select>
          </label>
          <label className="inline-field">
            {t("AI suggestions")}
            <select
              value={suggestionsEnabled ? "on" : "off"}
              disabled={pending || locked}
              onChange={(e) =>
                act(() => setSuggestionsEnabled(exhibitionId, e.target.value === "on"))
              }
            >
              <option value="off">{t("Off")}</option>
              <option value="on">{t("On")}</option>
            </select>
          </label>
        </div>
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
                disabled={pending || !canOpen || !invited || !privacyReady}
                onClick={() => act(() => setSubmissions(exhibitionId, "open"))}
              >
                {state === "closed" && !skipped ? t("Reopen submissions") : t("Open submissions")}
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
          : skipped
            ? t("Skipped: the exhibition goes ahead without submissions. To open them after all, invite an author first.")
            : state === "closed"
            ? t("Closed: authors can no longer send photographs. Their links keep working if you reopen.")
            : t("Invite authors, then open submissions so they can send photographs — or skip this step.")}
      </p>
      {/* A disabled Open button always says why. */}
      {/* (Skipped already says to invite an author.) */}
      {state !== "open" &&
        (!canOpen || (!invited && !skipped) || (invited && !privacyReady)) && (
          <p className="hint">
            {blockedNote ??
              (!invited
                ? t("Invite an author first.")
                : t("Fill in the data protection details first."))}
          </p>
        )}
      <p className="hint">
        {suggestionsEnabled
          ? t(
              "AITY suggests a title and a description for each photograph you add, and for an author’s only if they agree to it. You use a suggestion, or not, when you edit the photograph.",
            )
          : descriptionRequired
            ? t("AI suggestions are off: authors describe their own photographs, and no photograph is sent to an AI service.")
            : t("AI suggestions are off: no photograph is sent to an AI service.")}
        {locked && " " + t("Close submissions to change these settings.")}
      </p>

      <section className="privacy-details">
        <h3>{t("Data protection")}</h3>
        {editingPrivacy && !locked ? (
          <form action={savePrivacyDetails} className="stack-form">
            <p className="muted">
              {t(
                "Every author reads and accepts this notice before sending. The organizer of the exhibition is responsible for the data.",
              )}
            </p>
            <div className="form-grid">
              <label>
                {t("Responsible for the data")}
                <input
                  name="dataController"
                  required
                  defaultValue={privacy.controller ?? ""}
                  placeholder={t("e.g. Photography Society of Seville")}
                />
              </label>
              <label>
                {t("Contact for data requests")}
                <input
                  name="dataContact"
                  required
                  defaultValue={privacy.contact ?? ""}
                  placeholder={t("e.g. privacy@example.org")}
                />
              </label>
              <label className="wide">
                <span>
                  {t("More information for authors")}
                  <small className="muted"> · {t("Optional")}</small>
                </span>
                <textarea
                  name="privacyNotes"
                  rows={3}
                  defaultValue={privacy.notes ?? ""}
                  placeholder={t(
                    "e.g. which AI service analyses the photographs and where it runs, how long photographs are kept",
                  )}
                />
              </label>
            </div>
            <div className="button-row">
              {privacyReady && (
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() => setEditingPrivacy(false)}
                >
                  {t("Cancel")}
                </button>
              )}
              <button className="button" disabled={savingPrivacy}>
                {savingPrivacy ? t("Saving…") : t("Save")}
              </button>
            </div>
            {privacySaved && "error" in privacySaved && (
              <p className="error">{privacySaved.error}</p>
            )}
          </form>
        ) : (
          <p className="privacy-summary">
            <span>
              {privacy.controller} · {privacy.contact}
            </span>
            {!locked && (
              <button
                type="button"
                className="quiet-button"
                onClick={() => setEditingPrivacy(true)}
              >
                {t("Edit")}
              </button>
            )}
          </p>
        )}
      </section>
      {error && <p className="error">{error}</p>}

      {authors.length > 0 && (
        <ul className="invitation-list">
          {authors.map((a) => (
            <InvitationRow
              key={a.id}
              name={a.name}
              url={a.url}
              revoked={a.revoked}
              progress={
                t.n(limit, "{sent} / {count} photograph", "{sent} / {count} photographs", {
                  sent: a.sent,
                }) +
                (suggestionsEnabled
                  ? " · " + (a.aiConsent ? t("AI: agreed") : t("AI: not agreed"))
                  : "")
              }
              regenerate={async () => {
                const result = await regenerateAuthor(exhibitionId, a.id);
                return "url" in result ? result.url : null;
              }}
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
