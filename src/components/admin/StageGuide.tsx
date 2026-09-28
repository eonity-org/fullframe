import Link from "next/link";
import type { Translator } from "@/i18n/core";
import { viewerT } from "@/i18n/server";

/**
 * Where the exhibition stands and how to move it. Read-only on purpose: the
 * stage changes stay with the controls that own them (Jury section, Selection
 * & publish) — this only names the stage and points at them.
 */
type Move = {
  direction: "forward" | "back";
  label: string;
  how: string;
  href: string;
};

function stage(
  t: Translator,
  id: number,
  phase: string,
): { name: string; about: string; moves: Move[] } {
  const jury = `/admin/${id}#jury`;
  const results = `/admin/${id}/results`;
  switch (phase) {
    case "judging":
      return {
        name: t("Jury scoring"),
        about: t(
          "Jurors are scoring with their personal links. The selection is locked.",
        ),
        moves: [
          {
            direction: "forward",
            label: t("Close judging"),
            how: t(
              "in the Jury section or on Selection & publish, to choose the photographs",
            ),
            href: jury,
          },
        ],
      };
    case "selection":
      return {
        name: t("Selecting"),
        about: t(
          "Judging is closed. Jurors can see their scores but no longer change them.",
        ),
        moves: [
          {
            direction: "forward",
            label: t("Publish"),
            how: t(
              "choose the photographs and publish them on Selection & publish",
            ),
            href: results,
          },
          {
            direction: "back",
            label: t("Reopen judging"),
            how: t("with Start judging in the Jury section"),
            href: jury,
          },
        ],
      };
    case "open":
      return {
        name: t("Live"),
        about: t("The exhibition is public."),
        moves: [
          {
            direction: "back",
            label: t("Close exhibition"),
            how: t(
              "on Selection & publish — the vault turns private and you return to selecting",
            ),
            href: results,
          },
        ],
      };
    default:
      return {
        name: t("Preparing"),
        about: t("Only you can see this exhibition."),
        moves: [
          {
            direction: "forward",
            label: t("Start judging"),
            how: t(
              "invite at least one juror, then use Start judging in the Jury section",
            ),
            href: jury,
          },
          {
            direction: "forward",
            label: t("Publish"),
            how: t("skip the jury and publish from Selection & publish"),
            href: results,
          },
        ],
      };
  }
}

export async function StageGuide({ id, phase }: { id: number; phase: string }) {
  const t = await viewerT();
  const { name, about, moves } = stage(t, id, phase);
  return (
    <div className="stage-guide">
      <p>
        <span className="eyebrow">{t("Stage")}</span>
        <strong>{name}</strong>
        <span className="muted">{about}</span>
      </p>
      <ul>
        {moves.map((m) => (
          <li key={m.label}>
            <span aria-hidden="true">
              {m.direction === "forward" ? "→" : "←"}
            </span>
            <Link href={m.href}>{m.label}</Link>
            <span className="muted">{m.how}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
