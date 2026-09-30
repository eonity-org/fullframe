"use client";
import { useState, useTransition } from "react";
import { createExhibition, previewConnection } from "@/lib/actions";
import { useLocale, useT } from "@/i18n/client";
import { LOCALES, LOCALE_NAMES, isLocale } from "@/i18n/core";
export function ConnectionForm() {
  const t = useT();
  const locale = useLocale();
  const [url, setUrl] = useState("");
  const [read, setRead] = useState("");
  const [write, setWrite] = useState("");
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof previewConnection>
  > | null>(null);
  const [pending, start] = useTransition();
  const [creating, setCreating] = useState(false);
  // The exhibition's language: the photographs' own when FullFrame speaks it
  // (set from the preview), else the curator's.
  const [language, setLanguage] = useState<string>(locale);
  const reset = () => setResult(null);
  const written = result?.ok ? result.language : null;
  return (
    <div className="connect-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t("Start with your photographs")}</p>
          <h2>{t("Connect an exhibition")}</h2>
        </div>
        <span className="connection-icon" aria-hidden="true">
          ↗
        </span>
      </div>
      <p className="muted">
        {t(
          "Paste the shared URL from your TYDAL vault. We’ll take it from there.",
        )}
      </p>
      <form
        action={createExhibition}
        onSubmit={() => setCreating(true)}
        className="stack-form"
      >
        <label>
          {t("Shared vault URL")}
          <input
            name="vaultUrl"
            type="url"
            required
            placeholder="https://tydal.example/h/…"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              reset();
            }}
          />
        </label>
        <details className="access-details">
          <summary>
            {t("Access keys")}{" "}
            <span className="muted">
              {t("For private access and publishing")}
            </span>
          </summary>
          <div className="form-grid">
            <label>
              {t("Read key")}
              <input
                name="readVaultKey"
                type="password"
                autoComplete="off"
                value={read}
                onChange={(e) => {
                  setRead(e.target.value);
                  reset();
                }}
                placeholder={t("Only needed for a private vault")}
              />
            </label>
            <label>
              {t("Write key")}
              <input
                name="writeVaultKey"
                type="password"
                autoComplete="off"
                value={write}
                onChange={(e) => {
                  setWrite(e.target.value);
                  reset();
                }}
                placeholder={t("Optional — add before publishing")}
              />
            </label>
          </div>
        </details>
        {result?.ok ? (
          <div className="connection-preview">
            <span className="status-dot" />
            <div>
              <strong>{result.name}</strong>
              <p>
                {t.n(result.count, "{count} photograph", "{count} photographs")}{" "}
                ·{" "}
                {result.state === "public"
                  ? t("Public vault")
                  : t("Private vault")}
              </p>
            </div>
          </div>
        ) : (
          result && (
            <p className="error" role="alert">
              {result.error}
            </p>
          )
        )}
        {result?.ok && (
          <label>
            {t("Exhibition title")}
            <input name="title" defaultValue={result.name} required />
          </label>
        )}
        {result?.ok && (
          <label>
            {t("Exhibition language")}
            <select
              name="locale"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LOCALES.map((l) => (
                <option key={l} value={l} lang={l}>
                  {LOCALE_NAMES[l]}
                </option>
              ))}
            </select>
            <small className="muted">
              {t(
                "Visitors, invited authors and jurors see FullFrame in this language. You can change it later.",
              )}
            </small>
            {written && written !== language && (
              <small className="language-note" role="status">
                {isLocale(written)
                  ? t(
                      "The photographs’ texts in this vault are in {language}: visitors will read them in a different language from FullFrame’s.",
                      { language: LOCALE_NAMES[written] },
                    )
                  : t(
                      "The photographs’ texts in this vault are in another language ({code}): visitors will read them in a different language from FullFrame’s.",
                      { code: written },
                    )}
              </small>
            )}
          </label>
        )}
        <div className="button-row">
          {result?.ok ? (
            <button className="primary" disabled={creating}>
              {creating ? t("Creating…") : t("Create exhibition →")}
            </button>
          ) : (
            <button
              type="button"
              className="primary"
              disabled={!url || pending}
              onClick={() =>
                start(async () => {
                  const preview = await previewConnection(url, read, write);
                  setResult(preview);
                  if (preview.ok && preview.language && isLocale(preview.language))
                    setLanguage(preview.language);
                })
              }
            >
              {pending ? t("Connecting…") : t("Connect vault →")}
            </button>
          )}
          <small className="muted">{t("Photographs stay in TYDAL.")}</small>
        </div>
      </form>
    </div>
  );
}
