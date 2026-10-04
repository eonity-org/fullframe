import type { Exhibition } from "@/lib/exhibitions";
import { viewerT } from "@/i18n/server";

/**
 * The exhibition at a glance — photographs, visibility, jury. On Setup while
 * preparing, and on Appearance & publish, the studio's first page once the
 * exhibition is in selection or live.
 */
export async function OverviewStats({
  exhibition: e,
  photographs,
  jurors,
}: {
  exhibition: Pick<Exhibition, "phase" | "submissions" | "selectedHashes">;
  /** Null when the vault couldn't be reached. */
  photographs: number | null;
  /** Jurors with a working link. */
  jurors: number;
}) {
  const t = await viewerT();
  return (
    <div className="overview-stats">
      <div>
        <span className="eyebrow">{t("Photographs")}</span>
        <strong>{photographs ?? "—"}</strong>
        <small>
          {e.phase === "setup" && e.submissions === "open"
            ? t("Submissions open")
            : (e.phase === "selection" || e.phase === "open") && e.selectedHashes?.length
              ? t.n(e.selectedHashes.length, "{count} photograph selected", "{count} photographs selected")
              : photographs !== null
              ? t("Connected to TYDAL")
              : t("Vault unavailable")}
        </small>
      </div>
      <div>
        <span className="eyebrow">{t("Exhibition")}</span>
        <strong>{e.phase === "open" ? t("Published") : t("Private")}</strong>
        <small>
          {e.phase === "open" ? t("Ready to share") : t("Only you and invited jurors")}
        </small>
      </div>
      <div>
        <span className="eyebrow">{t("Jury")}</span>
        <strong>{jurors}</strong>
        <small>
          {e.phase === "judging"
            ? t("Judging is open")
            : e.phase === "setup"
              ? t("Optional · invite people below")
              : jurors
                ? t("Judging is closed")
                : t("No jury")}
        </small>
      </div>
    </div>
  );
}
