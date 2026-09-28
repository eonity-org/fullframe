"use client";

/**
 * Juror roster: each juror's personal URL is shown so
 * the admin can copy and resend it, with revoke and regenerate. The URL is a
 * low-stakes bearer link — regenerate mints a fresh one (old dies) if a link
 * leaks.
 */
import { useState } from "react";
import { regenerateJuror, revokeJuror } from "@/lib/actions";
import { useT } from "@/i18n/client";

export type JurorRow = {
  id: number;
  name: string;
  email: string | null;
  url: string | null;
  revoked: boolean;
  votes: number;
};

export function JurorList({
  exhibitionId,
  jurors,
  expectedVotes,
}: {
  exhibitionId: number;
  jurors: JurorRow[];
  expectedVotes: number | null;
}) {
  const t = useT();
  const [urls, setUrls] = useState<Record<number, string | null>>(
    Object.fromEntries(jurors.map((j) => [j.id, j.url])),
  );
  const [copied, setCopied] = useState<number | null>(null);

  const copy = async (id: number, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
    } catch {
      /* clipboard blocked — the URL is selectable in the field */
    }
  };

  const regenerate = async (id: number) => {
    const result = await regenerateJuror(exhibitionId, id);
    if ("url" in result) setUrls((u) => ({ ...u, [id]: result.url }));
  };

  if (jurors.length === 0)
    return (
      <p className="hint">{t("No jurors yet — create an invitation below.")}</p>
    );

  return (
    <ul className="juror-list">
      {jurors.map((juror) => {
        const url = urls[juror.id];
        return (
          <li key={juror.id} className={juror.revoked ? "revoked" : undefined}>
            <div className="juror-head">
              <strong>{juror.name}</strong>
              {juror.email && <small> · {juror.email}</small>}
              <span className="juror-progress">
                {juror.revoked
                  ? t("revoked")
                  : expectedVotes !== null
                    ? t.n(
                        expectedVotes,
                        "{votes} / {count} vote",
                        "{votes} / {count} votes",
                        {
                          votes: juror.votes,
                        },
                      )
                    : t.n(juror.votes, "{count} vote", "{count} votes")}
              </span>
            </div>
            {!juror.revoked && (
              <div className="juror-url-row">
                <input
                  readOnly
                  value={url ?? ""}
                  onFocus={(e) => e.currentTarget.select()}
                />
                {url && (
                  <button
                    type="button"
                    onClick={() => void copy(juror.id, url)}
                  >
                    {copied === juror.id ? t("copied") : t("copy")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void regenerate(juror.id)}
                  title={t("New link (the old one stops working)")}
                >
                  {t("regenerate")}
                </button>
                <form action={revokeJuror.bind(null, exhibitionId, juror.id)}>
                  <button className="danger">{t("revoke")}</button>
                </form>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
