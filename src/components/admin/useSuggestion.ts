"use client";
import { useEffect, useState } from "react";

/**
 * What TYDAL's AITY proposes for one photograph, read from the studio's
 * `GET {endpoint}/{hash}`. AITY takes a while (it runs after the upload, in
 * TYDAL's queue), so while it's `pending` this asks again every few seconds,
 * and gives up as `slow` after a few minutes. `done` carries the proposals,
 * either of which may be null; `none` means TYDAL had nothing to say.
 */
export type Suggestion =
  | { status: "idle" | "pending" | "slow" | "none" }
  | { status: "done"; name: string | null; description: string | null };

const EVERY_MS = 5_000;
const GIVE_UP_MS = 3 * 60_000;

export function useSuggestion(url: string | null): Suggestion {
  const [suggestion, setSuggestion] = useState<Suggestion>({ status: "idle" });

  useEffect(() => {
    if (!url) {
      setSuggestion({ status: "idle" });
      return;
    }
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const started = Date.now();
    setSuggestion({ status: "pending" });

    const ask = async () => {
      let next: Suggestion = { status: "none" };
      try {
        const res = await fetch(url, { cache: "no-store" });
        const body = res.ok ? await res.json() : null;
        const found = body?.suggestion;
        if (found?.status === "pending") next = { status: "pending" };
        else if (found?.status === "done")
          next = { status: "done", name: found.name ?? null, description: found.description ?? null };
      } catch {
        // Unreachable for now: say nothing rather than an error — it's a hint.
      }
      if (stopped) return;
      if (next.status === "pending" && Date.now() - started > GIVE_UP_MS)
        next = { status: "slow" };
      setSuggestion(next);
      if (next.status === "pending") timer = setTimeout(ask, EVERY_MS);
    };
    ask();

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [url]);

  return suggestion;
}
