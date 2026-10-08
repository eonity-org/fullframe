/**
 * Invited authors' consent (GDPR). Two separate questions, never bundled:
 *
 * - **The data protection notice** — required. It says who is responsible for
 *   the data (the exhibition's organizer, `dataController`), what is collected
 *   and why, and where to exercise rights (`dataContact`). Entering the
 *   exhibition is itself the legal basis, so this is an acknowledgement:
 *   nothing can be sent without it.
 * - **AI processing** — optional, asked only when the exhibition has
 *   suggestions on. Declining never stops an author from sending: their
 *   photographs simply never reach TYDAL's AITY (the `ingest` goes without
 *   `suggest`). Consent is freely given only if it can be refused at no cost
 *   (Art. 7(4)).
 *
 * Each author's answer is recorded with the time and the version of the text
 * they saw (`authors.notice_accepted_at` / `ai_consent_at` /
 * `consent_version`), and each photograph records whether it went to AITY
 * (`submissions.suggested`). Change the notice texts on the author page and
 * this version must change with them, so every author is asked again.
 */
import type { Author } from "./authors";
import type { Exhibition } from "./exhibitions";

export const CONSENT_VERSION = "2026-10-07";

/** Submissions can open: the notice names who is responsible and how to reach them. */
export function privacyReady(exhibition: Exhibition): boolean {
  return !!exhibition.dataController?.trim() && !!exhibition.dataContact?.trim();
}

/** The author has yet to accept the current notice. */
export function needsNotice(author: Author): boolean {
  return !author.noticeAcceptedAt || author.consentVersion !== CONSENT_VERSION;
}

/** The author's photographs may go to AITY now. */
export function aiAllowed(exhibition: Exhibition, author: Author): boolean {
  return exhibition.suggestionsEnabled && !needsNotice(author) && !!author.aiConsentAt;
}
