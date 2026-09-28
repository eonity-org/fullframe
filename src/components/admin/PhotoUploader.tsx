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

export type AddedPhoto = PhotoDetails & { hash: string; preview: string | null };

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
  onChange,
}: {
  values: PhotoDetails;
  disabled?: boolean;
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
              disabled={disabled}
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
  exhibitionId,
  canUpload,
  maxUploadBytes,
  note,
  added,
}: {
  exhibitionId: number;
  canUpload: boolean;
  /** TYDAL's limit per file, in bytes; null when it doesn't say. */
  maxUploadBytes: number | null;
  /** Why uploads are unavailable, already translated. */
  note: string | null;
  added: AddedPhoto[];
}) {
  const t = useT();
  const router = useRouter();
  const [queue, setQueue] = useState<Queued[]>([]);
  const [busy, setBusy] = useState(false);
  /** Files turned away for size when chosen — never uploaded, so no time is wasted. */
  const [tooLarge, setTooLarge] = useState<Array<{ name: string; size: number }>>([]);
  const [editing, setEditing] = useState<AddedPhoto | null>(null);
  const [draft, setDraft] = useState<PhotoDetails>({});
  const [removing, setRemoving] = useState<AddedPhoto | null>(null);
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
    const images = chosen.filter(fits);
    setQueue((q) => [
      ...q.filter((item) => item.state !== "done"),
      ...images.map((file) => ({
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
        details: { name: titleFromFilename(file.name) },
        state: "waiting" as const,
        progress: 0,
      })),
    ]);
    if (input.current) input.current.value = "";
  };

  const pending = queue.filter((q) => q.state === "waiting" || q.state === "failed");
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
      const result = await send(`/admin/${exhibitionId}/photographs`, body, (p) =>
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
        `/admin/${exhibitionId}/photographs/${encodeURIComponent(photo.hash)}`,
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
    <section className="panel photo-uploader" id="photographs">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t("While you set up")}</p>
          <h2>{t("Add photographs")}</h2>
        </div>
      </div>
      <p className="muted">
        {t(
          "Photographs you add here go straight into this exhibition’s vault in TYDAL, with the details you give them — TYDAL keeps them exactly as written.",
        )}
      </p>

      {canUpload ? (
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

          {queue.length > 0 && (
            <ul className="upload-queue">
              {queue.map((item) => {
                const locked = busy || item.state === "done" || item.state === "uploading";
                const setField = (key: PhotoFieldKey, value: string) =>
                  patch(item.key, { details: { ...item.details, [key]: value } });
                return (
                  <li key={item.key} className={`upload-item ${item.state}`}>
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
                    <div className="upload-fields">
                      <div className="form-grid">
                        <DetailFields
                          values={item.details}
                          disabled={locked}
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
                    {(item.state === "waiting" || item.state === "failed") && !busy && (
                      <button
                        type="button"
                        className="quiet-button"
                        onClick={() => setQueue((q) => q.filter((x) => x.key !== item.key))}
                      >
                        {t("Remove from list")}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {pending.length > 0 && (
            <div className="button-row">
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
        </>
      ) : (
        note && <p className="hint">{note}</p>
      )}

      {added.length > 0 && (
        <>
          <h3>{t("Added here")}</h3>
          <ul className="uploaded-list">
            {added.map((photo) => (
              <li key={photo.hash}>
                {photo.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.preview} alt="" />
                ) : (
                  <span className="uploaded-placeholder" aria-hidden="true" />
                )}
                <span>
                  {photo.name}
                  {photo.author && <small className="muted"> · {photo.author}</small>}
                  {!photo.preview && (
                    <small className="upload-state ok">
                      {t("Added — TYDAL is preparing the preview.")}
                    </small>
                  )}
                </span>
                <span className="button-row">
                  <button
                    type="button"
                    className="quiet-button"
                    onClick={() => {
                      const { hash: _hash, preview: _preview, ...details } = photo;
                      setDraft(details);
                      setDialogError(null);
                      setEditing(photo);
                    }}
                  >
                    {t("Edit")}
                  </button>
                  <button
                    type="button"
                    className="quiet-button"
                    onClick={() => {
                      setDialogError(null);
                      setRemoving(photo);
                    }}
                  >
                    {t("Remove")}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </>
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
    </section>
  );
}
