"use client";

/** A button that moves the exhibition to another stage (e.g. skip the jury). */
import { useState, useTransition } from "react";
import { setPhase } from "@/lib/actions";
import type { ExhibitionPhase } from "@db/schema";
import { useT } from "@/i18n/client";

export function PhaseButton({
  id,
  target,
  label,
  primary,
}: {
  id: number;
  target: ExhibitionPhase;
  /** Already translated. */
  label: string;
  primary?: boolean;
}) {
  const t = useT();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <>
      <button
        type="button"
        className={primary ? "primary" : undefined}
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError("");
            try {
              const result = await setPhase(id, target);
              if ("error" in result) setError(result.error);
            } catch {
              setError(t("Could not change the stage. Try again."));
            }
          })
        }
      >
        {pending ? t("Updating…") : label}
      </button>
      {error && <p className="error">{error}</p>}
    </>
  );
}
