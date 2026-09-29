"use client";

/** Juror roster: one line per juror — progress, copy link, new link, revoke. */
import { regenerateJuror, revokeJuror } from "@/lib/actions";
import { useT } from "@/i18n/client";
import { InvitationRow } from "./InvitationRow";

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
  if (jurors.length === 0)
    return (
      <p className="hint">{t("No jurors yet — create an invitation below.")}</p>
    );
  return (
    <ul className="invitation-list">
      {jurors.map((juror) => (
        <InvitationRow
          key={juror.id}
          name={juror.name}
          detail={juror.email}
          url={juror.url}
          revoked={juror.revoked}
          progress={
            expectedVotes !== null
              ? t.n(expectedVotes, "{votes} / {count} vote", "{votes} / {count} votes", {
                  votes: juror.votes,
                })
              : t.n(juror.votes, "{count} vote", "{count} votes")
          }
          regenerate={async () => {
            const result = await regenerateJuror(exhibitionId, juror.id);
            return "url" in result ? result.url : null;
          }}
          revoke={() => revokeJuror(exhibitionId, juror.id)}
        />
      ))}
    </ul>
  );
}
