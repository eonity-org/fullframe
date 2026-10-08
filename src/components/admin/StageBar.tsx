import { viewerT } from "@/i18n/server";
import { StageActions, type StudioPage } from "./StageActions";
import { PrivateLink } from "./PrivateLink";

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
  visibility,
  privateLink,
}: {
  id: number;
  phase: string;
  /** How a live exhibition is reached. */
  visibility: string;
  /** A live unlisted exhibition's private link path (/x/{hash}), to share from here. */
  privateLink?: string | null;
  page: StudioPage;
  /** Photographs in the saved selection (null: none saved yet). */
  selected: number | null;
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
          ? visibility === "unlisted"
            ? { name: t("Live"), about: t("Only people with the private link can see it.") }
            : { name: t("Live"), about: t("Everyone can see it.") }
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
      <StageActions id={id} phase={phase} page={page} selected={selected} />
      {privateLink && (
        <PrivateLink path={privateLink} base={(process.env.APP_URL ?? "").replace(/\/$/, "")} />
      )}
    </div>
  );
}
