"use client";
import { useState, useTransition } from "react";
import { setPhase } from "@/lib/actions";
import { useT } from "@/i18n/client";
export function JuryToggle({
  id,
  phase,
  hasJurors,
}: {
  id: number;
  phase: string;
  hasJurors: boolean;
}) {
  const t = useT();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <>
      <button
        disabled={pending || !hasJurors || phase === "open"}
        onClick={() =>
          start(async () => {
            try {
              setError("");
              const result = await setPhase(
                id,
                phase === "judging" ? "selection" : "judging",
              );
              if ("error" in result) setError(result.error);
            } catch {
              setError(t("Could not change judging. Try again."));
            }
          })
        }
      >
        {pending
          ? t("Updating…")
          : phase === "judging"
            ? t("Close judging")
            : t("Start judging")}
      </button>
      {error && <p className="error">{error}</p>}
    </>
  );
}
