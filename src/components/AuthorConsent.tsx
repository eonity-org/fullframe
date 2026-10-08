"use client";

/**
 * What an invited author reads and answers before sending photographs
 * (src/lib/consent.ts): the data protection notice, which they must accept,
 * and — when the exhibition has AI suggestions on — a separate, optional
 * agreement to AI processing that they can change later. Changing these texts
 * means changing CONSENT_VERSION, so every author is asked again.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";

export type NoticeDetails = {
  exhibition: string;
  controller: string;
  contact: string;
  notes: string | null;
  /** The exhibition has AI suggestions on, so the AI paragraph applies. */
  ai: boolean;
};

export function PrivacyNotice({ exhibition, controller, contact, notes, ai }: NoticeDetails) {
  const t = useT();
  return (
    <div className="privacy-notice">
      <p>
        {t(
          "{controller} organizes {exhibition} and is responsible for the personal data you send here: your name, your photographs and their details. They are used only to run the exhibition: to select your work, show it and credit it to you.",
          { controller, exhibition },
        )}
      </p>
      <p>
        {t(
          "Your photographs are stored on the platform {controller} uses for its exhibitions, and are shown publicly only if the exhibition shows them.",
          { controller },
        )}
      </p>
      {ai && (
        <p>
          {t(
            "Optional, and only if you agree below: each photograph you send is also analysed by an AI service on {controller}’s behalf, to suggest a title and a description that the curator may use. The image is sent to that service, which is asked to describe what it sees, not to identify anyone. If you don’t agree, your photographs are never sent to it, and you can still send them. You can change your answer while submissions are open; suggestions already made for your photographs are then no longer used.",
            { controller },
          )}
        </p>
      )}
      {notes && <p className="privacy-notes">{notes}</p>}
      <p>
        {t(
          "To see, correct or delete your data, or to object to its use, write to {contact}. You can also complain to your data protection authority.",
          { contact },
        )}
      </p>
    </div>
  );
}

/** The first visit: accept the notice (required) and answer the AI question (optional). */
export function ConsentForm({ token, ai }: { token: string; ai: boolean }) {
  const t = useT();
  const router = useRouter();
  const [notice, setNotice] = useState(false);
  const [aiAgreed, setAiAgreed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/e/${token}/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notice: true, ai: ai && aiAgreed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || t("Could not save your answer. Try again."));
        return;
      }
      router.refresh();
    } catch {
      setError(t("Could not save your answer. Try again."));
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      className="consent-form"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label className="check">
        <input
          type="checkbox"
          checked={notice}
          required
          onChange={(e) => setNotice(e.target.checked)}
        />
        <span>
          {t(
            "I have read the data protection notice. The photographs I send are mine, and the people who appear in them agree to their being shown.",
          )}
        </span>
      </label>
      {ai && (
        <label className="check">
          <input
            type="checkbox"
            checked={aiAgreed}
            onChange={(e) => setAiAgreed(e.target.checked)}
          />
          <span>
            {t("Optional: I agree that AI analyses my photographs to suggest to the curator a title and a description, which they may use.")}
          </span>
        </label>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="button-row">
        <button className="button primary" disabled={!notice || pending}>
          {pending ? t("Saving…") : t("Continue")}
        </button>
      </div>
    </form>
  );
}

/** Later visits: the author's AI answer, which they can change while submissions are open. */
export function AiConsentToggle({ token, agreed }: { token: string; agreed: boolean }) {
  const t = useT();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const change = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/e/${token}/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai: !agreed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || t("Could not save your answer. Try again."));
        return;
      }
      router.refresh();
    } catch {
      setError(t("Could not save your answer. Try again."));
    } finally {
      setPending(false);
    }
  };

  return (
    <p className="ai-consent">
      <span>
        {agreed
          ? t("You agreed that AI analyses your photographs to suggest to the curator a title and a description. You still give your own.")
          : t("Your photographs are not sent to AI.")}
      </span>
      <button type="button" className="quiet-button" disabled={pending} onClick={change}>
        {agreed ? t("Withdraw my agreement") : t("Allow AI suggestions")}
      </button>
      {error && (
        <span className="error" role="alert">
          {error}
        </span>
      )}
    </p>
  );
}
