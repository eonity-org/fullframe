"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GalleryWork } from "@/lib/gallery";
import { Photograph } from "@/components/Photograph";
import { quitJury } from "@/lib/actions";
import { useT } from "@/i18n/client";
type Criterion = { id: number; name: string; scaleMax: number };
export function JuryRoom({
  title,
  base,
  name,
  works,
  criteria,
  initialScores,
  initialNotes,
  closed,
}: {
  title: string;
  /** The exhibition's public path, `/{organization}/{exhibition}`. */
  base: string;
  name: string;
  works: GalleryWork[];
  criteria: Criterion[];
  initialScores: Record<string, Record<number, number>>;
  initialNotes: Record<string, string>;
  closed: boolean;
}) {
  const t = useT();
  const [scores, setScores] = useState(initialScores);
  // The juror's own scores for a photograph, as given: "4 / 5" for a single
  // criterion, "Light 4/5 · Framing 3/5" for several.
  const scoreLine = (id: string) =>
    criteria
      .filter((c) => scores[id]?.[c.id])
      .map((c) =>
        criteria.length === 1
          ? `${scores[id][c.id]} / ${c.scaleMax}`
          : `${c.name} ${scores[id][c.id]}/${c.scaleMax}`,
      )
      .join(" · ");
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      works.findIndex((w) =>
        criteria.some((c) => !initialScores[w.id]?.[c.id]),
      ),
    ),
  );
  const [grid, setGrid] = useState(closed);
  const [notes, setNotes] = useState(initialNotes);
  const savedNotes = useRef({ ...initialNotes });
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const busy = useRef(false);
  const work = works[index];
  const complete = works.filter(
    (w) => criteria.length > 0 && criteria.every((c) => scores[w.id]?.[c.id]),
  ).length;
  const persist = useCallback(
    async (path: string, body: unknown) => {
      const response = await fetch(`/api/jury/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t("Could not save. Please try again."));
      }
    },
    [t],
  );
  const saveNote = useCallback(async () => {
    if (
      !work ||
      closed ||
      (notes[work.id] || "") === (savedNotes.current[work.id] || "")
    )
      return true;
    if (busy.current) return false;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      await persist("comments", {
        resourceHash: work.id,
        body: notes[work.id] || "",
      });
      savedNotes.current[work.id] = notes[work.id] || "";
      setStatus(t("Saved"));
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      busy.current = false;
      setPending(false);
    }
  }, [work, closed, notes, persist, t]);
  useEffect(() => {
    if (pending || error) return;
    const timer = setTimeout(() => void saveNote(), 700);
    return () => clearTimeout(timer);
  }, [saveNote, pending, error]);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (
        Object.entries(notes).some(
          ([id, n]) => n !== (savedNotes.current[id] || ""),
        )
      ) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [notes]);
  const move = async (n: number) => {
    if (await saveNote()) {
      setIndex(n);
      setStatus("");
      setGrid(false);
    }
  };
  const vote = async (criterionId: number, score: number) => {
    if (busy.current || !work) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      await persist("votes", { resourceHash: work.id, criterionId, score });
      setScores((s) => ({
        ...s,
        [work.id]: { ...s[work.id], [criterionId]: score },
      }));
      setStatus(t("Saved"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  return (
    <div className="jury-room">
      <header className="jury-header">
        <div>
          <span className="eyebrow">{t("FullFrame · Jury")}</span>
          <strong>{title}</strong>
        </div>
        <span>{name}</span>
        <button
          className="quiet-button"
          disabled={pending}
          onClick={async () => {
            if (await saveNote()) await quitJury(base);
          }}
        >
          {t("Leave jury ↗")}
        </button>
      </header>
      <div className="jury-progress">
        <div>
          <span>
            {closed
              ? t("Judging has closed. Thank you.")
              : t.n(
                  works.length,
                  "{complete} of {count} photograph scored",
                  "{complete} of {count} photographs scored",
                  { complete },
                )}
          </span>
          <button
            className="quiet-button"
            disabled={pending}
            onClick={async () => {
              if (await saveNote()) setGrid(!grid);
            }}
          >
            {grid ? t("Back to photograph") : t("View all photographs")}
          </button>
        </div>
        <progress
          value={complete}
          max={works.length || 1}
          aria-label={t("Scoring progress")}
        />
      </div>
      {error && (
        <p className="error" role="alert">
          {error}{" "}
          <button onClick={() => void saveNote()} disabled={pending}>
            {t("Retry note")}
          </button>
        </p>
      )}
      {grid ? (
        <main className="jury-grid">
          <h1>
            {closed ? t("Your photographs & scores") : t("Your progress")}
          </h1>
          <div className="selection-grid">
            {works.map((w, n) => (
              <button
                className="photo-card"
                key={w.id}
                onClick={() => void move(n)}
              >
                <div className="photo-well">
                  <Photograph work={w} />
                </div>
                <div className="photo-caption">
                  <h2>{w.name}</h2>
                  <span>
                    {[
                      criteria.every((c) => scores[w.id]?.[c.id])
                        ? t("Scored ✓")
                        : t("To score"),
                      scoreLine(w.id),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </main>
      ) : work ? (
        <main className="jury-work">
          <div className="jury-photo">
            <Photograph key={work.id} work={work} large priority />
            <div className="jury-photo-caption">
              <h1>{work.name}</h1>
              <span>
                {index + 1} / {works.length}
              </span>
            </div>
          </div>
          <aside className="jury-vote">
            <p className="eyebrow">
              {closed ? t("Your record") : t("Your perspective")}
            </p>
            <h2>
              {closed ? t("Thank you for looking.") : t("What do you see?")}
            </h2>
            <p className="muted">
              {closed
                ? t("Your scores are saved.")
                : t(
                    "Score the photograph, then move on. You can revisit any score while judging is open.",
                  )}
            </p>
            {criteria.map((c) => (
              <fieldset key={c.id} disabled={closed || pending}>
                <legend>{c.name}</legend>
                <div className="score-buttons">
                  {Array.from({ length: c.scaleMax }, (_, i) => i + 1).map(
                    (n) => (
                      <button
                        key={n}
                        aria-pressed={scores[work.id]?.[c.id] === n}
                        onClick={() => void vote(c.id, n)}
                      >
                        {n}
                      </button>
                    ),
                  )}
                </div>
                <div className="score-labels">
                  <span>{t("Less compelling")}</span>
                  <span>{t("Exceptional")}</span>
                </div>
              </fieldset>
            ))}
            <label>
              {t("Private note")} <span className="muted">{t("Optional")}</span>
              <textarea
                rows={4}
                disabled={closed}
                value={notes[work.id] || ""}
                placeholder={t("Something worth remembering…")}
                onChange={(e) => {
                  setNotes((prev) => ({ ...prev, [work.id]: e.target.value }));
                  setStatus(t("Unsaved note"));
                }}
              />
            </label>
            <p className="save-status" role="status">
              {pending
                ? t("Saving…")
                : status || t("Scores and notes save automatically")}
            </p>
            <div className="jury-navigation">
              <button
                disabled={pending || index === 0}
                onClick={() => void move(index - 1)}
              >
                {t("← Previous")}
              </button>
              <button
                className="primary"
                disabled={pending}
                onClick={async () => {
                  if (index < works.length - 1) await move(index + 1);
                  else if (await saveNote()) setGrid(true);
                }}
              >
                {index < works.length - 1
                  ? t("Next photograph →")
                  : t("Review scores →")}
              </button>
            </div>
          </aside>
        </main>
      ) : (
        <main className="empty-state">
          <h1>{t("No photographs are available.")}</h1>
          <p>{t("Please contact the curator.")}</p>
        </main>
      )}
    </div>
  );
}
