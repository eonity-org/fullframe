"use client";

/**
 * One invitation on one line: who, how far they've got, and their personal
 * link to copy — never shown, only copied — with revoke (and regenerate where
 * the kind of link offers it). The links are low-stakes bearer links; revoking
 * or regenerating is the answer to a leaked one.
 */
import { useState, type ReactNode } from "react";
import { useT } from "@/i18n/client";

export function InvitationRow({
  name,
  detail,
  progress,
  url,
  revoked,
  regenerate,
  revoke,
}: {
  name: string;
  detail?: string | null;
  /** Already translated, e.g. "2 / 5 photographs". */
  progress: ReactNode;
  url: string | null;
  revoked: boolean;
  regenerate?: () => Promise<string | null>;
  revoke: () => Promise<void>;
}) {
  const t = useT();
  const [link, setLink] = useState(url);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked (e.g. not a secure origin) */
      window.prompt(t("Copy this link:"), link);
    }
  };

  const run = async (action: () => Promise<void>) => {
    setPending(true);
    try {
      await action();
    } finally {
      setPending(false);
    }
  };

  return (
    <li className={revoked ? "invitation revoked" : "invitation"}>
      <span className="invitation-name">
        <strong>{name}</strong>
        {detail && <small className="muted"> · {detail}</small>}
      </span>
      <span className="invitation-progress">{revoked ? t("revoked") : progress}</span>
      {!revoked && (
        <span className="invitation-actions">
          {link && (
            <button type="button" className="quiet-button" onClick={() => void copy()}>
              {copied ? t("Link copied") : t("Copy link")}
            </button>
          )}
          {regenerate && (
            <button
              type="button"
              className="quiet-button"
              disabled={pending}
              title={t("New link (the old one stops working)")}
              onClick={() =>
                void run(async () => {
                  const fresh = await regenerate();
                  if (fresh) setLink(fresh);
                })
              }
            >
              {t("New link")}
            </button>
          )}
          <button
            type="button"
            className="quiet-button danger"
            disabled={pending}
            onClick={() => void run(revoke)}
          >
            {t("Revoke")}
          </button>
        </span>
      )}
    </li>
  );
}
