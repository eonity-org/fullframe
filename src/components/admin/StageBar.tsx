import { viewerT } from "@/i18n/server";
import { StageActions, type StudioPage } from "./StageActions";

/**
 * Where the exhibition stands, the same on every studio tab: the stage, one
 * sentence, and the one move that takes the whole exhibition forward — close
 * judging, publish (on Appearance & publish only), close the live exhibition.
 * Moving back (reopen judging, back to preparing) stays with the section it
 * belongs to on Setup.
 */
export async function StageBar({
  id,
  phase,
  page,
  selected,
  base,
}: {
  id: number;
  phase: string;
  page: StudioPage;
  /** Photographs in the saved selection (null: none saved yet). */
  selected: number | null;
  /** The exhibition's public path, for "Visit". */
  base: string;
}) {
  const t = await viewerT();
  const { name, about } =
    phase === "judging"
      ? {
          name: t("Jury scoring"),
          about: t("Jurors are scoring. The selection waits until judging closes."),
        }
      : phase === "selection"
        ? {
            name: t("Selecting"),
            about: t("Judging is closed. Choose the photographs, pick a style and publish."),
          }
        : phase === "open"
          ? { name: t("Live"), about: t("Everyone can see it.") }
          : {
              name: t("Preparing"),
              about: t("Private: only you and the people you invite can see it."),
            };
  return (
    <div className={`stage-bar ${phase}`}>
      <p>
        <span className="eyebrow">{t("Stage")}</span>
        <strong>{name}</strong>
        <span className="muted">{about}</span>
      </p>
      <StageActions id={id} phase={phase} page={page} selected={selected} base={base} />
    </div>
  );
}
