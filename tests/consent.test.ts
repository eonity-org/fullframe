import assert from "node:assert/strict";
import { test } from "node:test";
import { aiAllowed, CONSENT_VERSION, needsNotice, privacyReady } from "../src/lib/consent";
import type { Author } from "../src/lib/authors";
import type { Exhibition } from "../src/lib/exhibitions";

const exhibition = (fields: Partial<Exhibition>) => ({ ...fields }) as Exhibition;
const author = (fields: Partial<Author>) => ({ ...fields }) as Author;
const accepted = { noticeAcceptedAt: new Date(), consentVersion: CONSENT_VERSION };

test("submissions open only once the notice names who is responsible and how to reach them", () => {
  assert.equal(privacyReady(exhibition({})), false);
  assert.equal(privacyReady(exhibition({ dataController: "Club", dataContact: " " })), false);
  assert.equal(privacyReady(exhibition({ dataController: "Club", dataContact: "a@b.org" })), true);
});

test("an author accepts the current notice before sending, and again when it changes", () => {
  assert.equal(needsNotice(author({})), true);
  assert.equal(needsNotice(author(accepted)), false);
  assert.equal(needsNotice(author({ ...accepted, consentVersion: "older" })), true);
});

test("a photograph goes to AI only with suggestions on and the author's agreement", () => {
  const on = exhibition({ suggestionsEnabled: true });
  const off = exhibition({ suggestionsEnabled: false });
  const agreed = author({ ...accepted, aiConsentAt: new Date() });
  assert.equal(aiAllowed(on, agreed), true);
  // Declining (or withdrawing) never blocks sending — it only keeps AI out.
  assert.equal(aiAllowed(on, author({ ...accepted, aiConsentAt: null })), false);
  assert.equal(aiAllowed(off, agreed), false);
  // An agreement given under an older notice doesn't count.
  assert.equal(aiAllowed(on, author({ ...accepted, consentVersion: "older", aiConsentAt: new Date() })), false);
});
