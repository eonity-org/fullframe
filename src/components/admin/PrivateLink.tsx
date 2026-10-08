"use client";

/**
 * A live unlisted exhibition's private link (/x/{vaultHash}), on the stage
 * bar of every studio tab, to copy and share: whoever opens it can see the
 * exhibition. Absolute with APP_URL;
 * otherwise this browser's own origin, which is the studio's.
 */
import { useEffect, useState } from "react";
import { useT } from "@/i18n/client";

export function PrivateLink({ path, base }: { path: string; base: string }) {
  const t = useT();
  const [link, setLink] = useState(base ? base + path : path);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!base) setLink(window.location.origin + path);
  }, [base, path]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked (e.g. not a secure origin) */
      window.prompt(t("Copy this link:"), link);
    }
  };

  return (
    <div className="private-link">
      <code>{link}</code>
      <button type="button" className="quiet-button" onClick={copy}>
        {copied ? t("Link copied") : t("Copy link")}
      </button>
      <small className="muted">
        {t("Anyone who has it can pass it on. To make the exhibition public, close it and publish it again.")}
      </small>
    </div>
  );
}
