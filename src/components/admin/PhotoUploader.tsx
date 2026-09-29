"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmationDialog } from "./ConfirmationDialog";
import {
  PHOTO_FIELDS,
  isRequired,
  missingFields,
  type PhotoDetails,
  type PhotoFieldKey,
} from "@/lib/photoFields";
import { useT } from "@/i18n/client";

type Queued = {
  key: string;
  file: File;
  preview: string;
  details: PhotoDetails;
  state: "waiting" | "uploading" | "done" | "failed";
  progress: number;
  error?: string;
};

export type AddedPhoto = PhotoDetails & {
  hash: string;
  preview: string | null;
  /** A larger rendition, for looking at the photograph in the viewer. */
  large?: string | null;
  /** Sent by an invited author: the author's name can't be changed. */
  authorLocked?: boolean;
};

/** Bytes as megabytes with one decimal, e.g. 12.4. */
const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);

/** A readable starting title; the curator is expected to correct it. */
function titleFromFilename(name: string): string {
  const stem = name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return stem ? stem[0].toUpperCase() + stem.slice(1) : "";
}

/** One photograph per request, so each file reports its own progress. */
function send(
  url: string,
  body: FormData,
  onProgress: (fraction: number) => void,
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      let error: string | undefined;
      try {
        error = JSON.parse(xhr.responseText)?.error;
      } catch {}
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, error });
    };
    xhr.onerror = () => resolve({ ok: false });
    xhr.send(body);
  });
}

/** The inputs for a photograph's details, in PHOTO_FIELDS order — title and author required. */
function DetailFields({
  values,
  disabled,
  lockAuthor,
  onChange,
}: {
  values: PhotoDetails;
  disabled?: boolean;
  /** The author comes from an invitation and is shown, not edited. */
  lockAuthor?: boolean;
  onChange: (key: PhotoFieldKey, value: string) => void;
}) {
  const t = useT();
  return (
    <>
      {PHOTO_FIELDS.map((field) => (
        <label key={field.key} className={"multiline" in field ? "wide" : undefined}>
          <span>
            {t(field.label)}
            {!isRequired(field) && <small className="muted"> · {t("Optional")}</small>}
          </span>
          {"multiline" in field ? (
            <textarea
              rows={3}
              required={isRequired(field)}
              value={values[field.key] ?? ""}
              disabled={disabled}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          ) : (
            <input
              value={values[field.key] ?? ""}
              required={isRequired(field)}
              disabled={disabled || (lockAuthor && field.key === "author")}
              placeholder={"placeholder" in field ? t(field.placeholder) : undefined}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          )}
        </label>
      ))}
    </>
  );
}

export function PhotoUploader({
  endpoint,
  canUpload,
  maxUploadBytes,
  note,
  added,
  addedTitle,
  author,
  remaining = null,
  showPreviews = true,
}: {
  /** Where photographs are sent; one is corrected or removed at `{endpoint}/{hash}`. */
  endpoint: string;
  canUpload: boolean;
  /** TYDAL's limit per file, in bytes; null when it doesn't say. */
  maxUploadBytes: number | null;
  /** Why uploads are unavailable, already translated. */
  note: string | null;
  added: AddedPhoto[];
  /** Heading over the photographs already sent, already translated. */
  addedTitle: string;
  /** An invited author's page: every photograph carries this name. */
  author?: string;
  /** How many more photographs may be sent; null for no limit. */
  remaining?: number | null;
  /** The sent photographs' previews can be shown (the studio, not an author). */
  showPreviews?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [queue, setQueue] = useState<Queued[]>([]);
  const [busy, setBusy] = useState(false);
  /** Files turned away for size when chosen — never uploaded, so no time is wasted. */
  const [tooLarge, setTooLarge] = useState<Array<{ name: string; size: number }>>([]);
  const [overLimit, setOverLimit] = useState(false);
  const [editing, setEditing] = useState<AddedPhoto | null>(null);
  const [draft, setDraft] = useState<PhotoDetails>({});
  const [removing, setRemoving] = useState<AddedPhoto | null>(null);
  /** The photograph in the exhibition shown large, by hash. */
  const [inspecting, setInspecting] = useState<string | null>(null);
  /** The queued photograph shown large, by queue key. */
  const [viewing, setViewing] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [dialogPending, setDialogPending] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // Release the local previews when files leave the queue.
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const current = new Set(queue.map((q) => q.preview));
    for (const url of previews.current)
      if (!current.has(url)) URL.revokeObjectURL(url);
    previews.current = current;
  }, [queue]);

  const patch = (key: string, change: Partial<Queued>) =>
    setQueue((q) => q.map((item) => (item.key === key ? { ...item, ...change } : item)));

  const add = (files: FileList | null) => {
    const chosen = Array.from(files || []).filter((f) => f.type.startsWith("image/"));
    const fits = (f: File) => maxUploadBytes === null || f.size <= maxUploadBytes;
    setTooLarge(chosen.filter((f) => !fits(f)).map((f) => ({ name: f.name, size: f.size })));
    // Beyond an author's limit, the extra files are left out rather than queued.
    const room =
      remaining === null
        ? Infinity
        : remaining - queue.filter((q) => q.state !== "done").length;
    const images = chosen.filter(fits).slice(0, Math.max(0, room));
    setOverLimit(chosen.filter(fits).length > images.length);
    setQueue((q) => [
      ...q.filter((item) => item.state !== "done"),
      ...images.map((file) => ({
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
        details: author
          ? { name: titleFromFilename(file.name), author }
          : { name: titleFromFilename(file.name) },
        state: "waiting" as const,
        progress: 0,
      })),
    ]);
    if (input.current) input.current.value = "";
  };

  const pending = queue.filter((q) => q.state === "waiting" || q.state === "failed");

  // Leaving (Finish, closing the tab) with photographs still unsent loses them:
  // let the browser ask first.
  useEffect(() => {
    if (!pending.length) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending.length]);
  const incomplete = pending.some((q) => missingFields(q.details).length > 0);

  const upload = async () => {
    setBusy(true);
    let added = 0;
    for (const item of pending) {
      patch(item.key, { state: "uploading", progress: 0, error: undefined });
      const body = new FormData();
      body.set("image", item.file);
      for (const [key, value] of Object.entries(item.details))
        if (value?.trim()) body.set(key, value.trim());
      const result = await send(endpoint, body, (p) =>
        patch(item.key, { progress: p }),
      );
      if (result.ok) {
        added++;
        patch(item.key, { state: "done", progress: 1 });
      } else
        patch(item.key, {
          state: "failed",
          error: result.error || t("The upload was interrupted. Try again."),
        });
    }
    setBusy(false);
    if (added) {
      // Added photographs now live in "Added here", read back from TYDAL;
      // keeping their upload rows would show stale details after an edit.
      setQueue((q) => q.filter((item) => item.state !== "done"));
      router.refresh();
    }
  };

  const openEdit = (photo: AddedPhoto) => {
    const {
      hash: _hash,
      preview: _preview,
      large: _large,
      authorLocked: _locked,
      ...details
    } = photo;
    setInspecting(null);
    setDraft(details);
    setDialogError(null);
    setEditing(photo);
  };
  const openRemove = (photo: AddedPhoto) => {
    setInspecting(null);
    setDialogError(null);
    setRemoving(photo);
  };

  // The viewer for photographs already in the exhibition walks the list.
  const inspectIndex = added.findIndex((p) => p.hash === inspecting);
  const inspected = inspectIndex >= 0 ? added[inspectIndex] : null;
  const inspectStep = (by: number) => {
    const next = added[inspectIndex + by];
    if (next) setInspecting(next.hash);
  };

  const closeDialog = () => {
    setEditing(null);
    setRemoving(null);
    setDialogError(null);
  };

  /** PATCH (save details) or DELETE (remove) one added photograph. */
  const change = async (photo: AddedPhoto, method: "PATCH" | "DELETE") => {
    setDialogPending(true);
    setDialogError(null);
    try {
      const res = await fetch(
        `${endpoint}/${encodeURIComponent(photo.hash)}`,
        method === "PATCH"
          ? {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(draft),
            }
          : { method },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setDialogError(body.error || t("Could not save the change. Try again."));
        return;
      }
      closeDialog();
      router.refresh();
    } catch {
      setDialogError(t("Could not save the change. Try again."));
    } finally {
      setDialogPending(false);
    }
  };

  // The large view walks the whole queue, so a big batch can be described
  // photograph by photograph without closing it.
  const viewIndex = queue.findIndex((q) => q.key === viewing);
  const viewed = viewIndex >= 0 ? queue[viewIndex] : null;
  const step = (by: number) => {
    const next = queue[viewIndex + by];
    if (next) setViewing(next.key);
  };

  return (
    <div className="photo-uploader">
      {canUpload && remaining !== 0 ? (
        <>
          <label
            className="upload-drop"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (!busy) add(e.dataTransfer.files);
            }}
          >
            <input
              ref={input}
              type="file"
              accept="image/*"
              multiple
              disabled={busy}
              onChange={(e) => add(e.target.files)}
            />
            <strong>{t("Choose photographs")}</strong>
            <span className="muted">{t("or drop them here")}</span>
            {maxUploadBytes !== null && (
              <span className="muted">
                {t("Up to {size} MB per photograph", { size: mb(maxUploadBytes) })}
              </span>
            )}
          </label>

          {tooLarge.length > 0 && maxUploadBytes !== null && (
            <div className="error" role="alert">
              <p>
                {t.n(
                  tooLarge.length,
                  "This photograph is larger than {size} MB and was not added:",
                  "These {count} photographs are larger than {size} MB and were not added:",
                  { size: mb(maxUploadBytes) },
                )}
              </p>
              <ul>
                {tooLarge.map((f) => (
                  <li key={f.name}>
                    {f.name} — {mb(f.size)} MB
                  </li>
                ))}
              </ul>
            </div>
          )}

          {overLimit && remaining !== null && (
            <p className="error" role="alert">
              {t.n(
                remaining,
                "You can send {count} more photograph; the others were left out.",
                "You can send {count} more photographs; the others were left out.",
              )}
            </p>
          )}

          {queue.length > 0 && (
            // The photographs being prepared, framed apart from those already
            // in the exhibition, with their Add button at the foot of the frame.
            <div className="upload-staging">
              <div className="upload-staging-head">
                <h3>
                  {t.n(queue.length, "{count} photograph to add", "{count} photographs to add")}
                </h3>
                <span className="hint">
                  {t("Describe each one, then add them. Click a picture to see it larger.")}
                </span>
              </div>
            <ul className="upload-queue">
              {queue.map((item) => {
                const locked = busy || item.state === "done" || item.state === "uploading";
                const setField = (key: PhotoFieldKey, value: string) =>
                  patch(item.key, { details: { ...item.details, [key]: value } });
                return (
                  <li key={item.key} className={`upload-item ${item.state}`}>
                    <div className="upload-media">
                    <button
                      type="button"
                      className="upload-thumb"
                      onClick={() => setViewing(item.key)}
                      aria-label={t("View “{title}” larger", {
                        title: item.details.name || item.file.name,
                      })}
                    >
                      {/* A local object URL — next/image can't optimise it. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.preview} alt="" />
                    </button>
                    {(item.state === "waiting" || item.state === "failed") && !busy && (
                      <button
                        type="button"
                        className="quiet-button"
                        onClick={() => setQueue((q) => q.filter((x) => x.key !== item.key))}
                      >
                        {t("Remove from list")}
                      </button>
                    )}
                    </div>
                    <div className="upload-fields">
                      <div className="form-grid">
                        <DetailFields
                          values={item.details}
                          disabled={locked}
                          lockAuthor={!!author}
                          onChange={setField}
                        />
                      </div>
                      {item.state === "uploading" && (
                        <progress value={item.progress} max={1}>
                          {Math.round(item.progress * 100)}%
                        </progress>
                      )}
                      {item.state === "failed" && (
                        <small className="upload-state failed" role="alert">
                          {item.error}
                        </small>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          {pending.length > 0 && (
            <div className="button-row upload-actions">
              <button
                type="button"
                className="button primary"
                disabled={busy || incomplete}
                onClick={upload}
              >
                {busy
                  ? t("Adding…")
                  : t.n(pending.length, "Add {count} photograph", "Add {count} photographs")}
              </button>
              {incomplete && (
                <span className="hint">
                  {t("Give each photograph at least a title and an author to add it.")}
                </span>
              )}
            </div>
          )}
            </div>
          )}
        </>
      ) : (
        note && <p className="hint">{note}</p>
      )}

      {added.length > 0 && (
        <div className="uploaded-section">
          <h3>
            {addedTitle} <span className="muted">· {added.length}</span>
          </h3>
          <ul className={showPreviews ? "uploaded-list" : "uploaded-list text-only"}>
            {added.map((photo) => (
              <li key={photo.hash}>
                {showPreviews &&
                  (photo.preview ? (
                    <button
                      type="button"
                      className="upload-thumb"
                      onClick={() => setInspecting(photo.hash)}
                      aria-label={t("View “{title}” larger", { title: photo.name ?? "" })}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.preview} alt="" />
                    </button>
                  ) : (
                    <span className="uploaded-placeholder" aria-hidden="true" />
                  ))}
                <span>
                  {photo.name}
                  {photo.author && !author && (
                    <small className="muted"> · {photo.author}</small>
                  )}
                  {showPreviews && !photo.preview && (
                    <small className="upload-state ok">
                      {t("Added — TYDAL is preparing the preview.")}
                    </small>
                  )}
                </span>
                <span className="button-row">
                  <button
                    type="button"
                    className="quiet-button"
                    onClick={() => openEdit(photo)}
                  >
                    {t("Edit")}
                  </button>
                  <button
                    type="button"
                    className="quiet-button"
                    onClick={() => openRemove(photo)}
                  >
                    {t("Remove")}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmationDialog
        open={!!viewed}
        pending={false}
        onCancel={() => setViewing(null)}
        className="upload-viewer"
        title={viewed?.details.name || viewed?.file.name || ""}
      >
        {viewed && (
          <div className="upload-viewer-body">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={viewed.preview} alt="" />
            <div className="form-grid">
              <DetailFields
                values={viewed.details}
                lockAuthor={!!author}
                disabled={busy || viewed.state === "done" || viewed.state === "uploading"}
                onChange={(key, value) =>
                  patch(viewed.key, { details: { ...viewed.details, [key]: value } })
                }
              />
            </div>
          </div>
        )}
        <div className="button-row upload-viewer-nav">
          <button
            type="button"
            className="quiet-button"
            disabled={viewIndex <= 0}
            onClick={() => step(-1)}
            aria-label={t("Previous photograph")}
          >
            ←
          </button>
          <span className="muted">
            {viewIndex + 1} / {queue.length}
          </span>
          <button
            type="button"
            className="quiet-button"
            disabled={viewIndex >= queue.length - 1}
            onClick={() => step(1)}
            aria-label={t("Next photograph")}
          >
            →
          </button>
          <button
            type="button"
            className="button primary"
            onClick={() => setViewing(null)}
          >
            {t("Done")}
          </button>
        </div>
      </ConfirmationDialog>

      <ConfirmationDialog
        open={!!inspected}
        pending={false}
        onCancel={() => setInspecting(null)}
        className="upload-viewer"
        title={inspected?.name ?? ""}
      >
        {inspected && (
          <div className="upload-viewer-body">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={inspected.large || inspected.preview || ""} alt="" />
            <dl className="photo-facts">
              {PHOTO_FIELDS.filter((f) => inspected[f.key]).map((f) => (
                <div key={f.key}>
                  <dt>{t(f.label)}</dt>
                  <dd>{inspected[f.key]}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        <div className="button-row upload-viewer-nav">
          {inspected && (
            <>
              <button type="button" className="quiet-button" onClick={() => openEdit(inspected)}>
                {t("Edit")}
              </button>
              <button type="button" className="quiet-button" onClick={() => openRemove(inspected)}>
                {t("Remove")}
              </button>
            </>
          )}
          <span className="upload-viewer-spacer" />
          <button
            type="button"
            className="quiet-button"
            disabled={inspectIndex <= 0}
            onClick={() => inspectStep(-1)}
            aria-label={t("Previous photograph")}
          >
            ←
          </button>
          <span className="muted">
            {inspectIndex + 1} / {added.length}
          </span>
          <button
            type="button"
            className="quiet-button"
            disabled={inspectIndex >= added.length - 1}
            onClick={() => inspectStep(1)}
            aria-label={t("Next photograph")}
          >
            →
          </button>
          <button type="button" className="button primary" onClick={() => setInspecting(null)}>
            {t("Close")}
          </button>
        </div>
      </ConfirmationDialog>

      <ConfirmationDialog
        open={!!editing}
        pending={dialogPending}
        onCancel={closeDialog}
        title={t("Edit “{title}”", { title: editing?.name ?? "" })}
      >
        <form
          className="stack-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (editing) change(editing, "PATCH");
          }}
        >
          <div className="form-grid">
            <DetailFields
              values={draft}
              lockAuthor={!!author || !!editing?.authorLocked}
              disabled={dialogPending}
              onChange={(key, value) => setDraft((d) => ({ ...d, [key]: value }))}
            />
          </div>
          {dialogError && (
            <p className="error" role="alert">
              {dialogError}
            </p>
          )}
          <div className="button-row">
            <button
              type="button"
              className="quiet-button"
              disabled={dialogPending}
              onClick={closeDialog}
            >
              {t("Cancel")}
            </button>
            <button
              className="button primary"
              disabled={dialogPending || missingFields(draft).length > 0}
            >
              {dialogPending ? t("Saving…") : t("Save details")}
            </button>
          </div>
        </form>
      </ConfirmationDialog>

      <ConfirmationDialog
        open={!!removing}
        pending={dialogPending}
        onCancel={closeDialog}
        title={t("Remove “{title}”?", { title: removing?.name ?? "" })}
      >
        <p>
          {t(
            "It leaves this exhibition and goes to TYDAL’s trash, where an administrator can still recover it.",
          )}
        </p>
        {dialogError && (
          <p className="error" role="alert">
            {dialogError}
          </p>
        )}
        <div className="button-row">
          <button
            type="button"
            className="quiet-button"
            disabled={dialogPending}
            onClick={closeDialog}
          >
            {t("Cancel")}
          </button>
          <button
            type="button"
            className="button primary"
            disabled={dialogPending}
            onClick={() => removing && change(removing, "DELETE")}
          >
            {dialogPending ? t("Removing…") : t("Remove photograph")}
          </button>
        </div>
      </ConfirmationDialog>
    </div>
  );
}
