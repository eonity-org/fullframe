"use client";
import { useState, useTransition } from "react";
import { saveAppearance } from "@/lib/actions";
import {
  PALETTES,
  THEMES,
  TYPOGRAPHY,
  LAYOUTS,
  GALLERY_VIEWS,
  resolveAppearance,
  type GalleryView,
  type Appearance,
} from "@/lib/appearance";
import { useT } from "@/i18n/client";
export function AppearancePicker({
  id,
  base,
  initial,
}: {
  id: number;
  /** The exhibition's public path, `/{organization}/{exhibition}`. */
  base: string;
  initial: Appearance;
}) {
  const t = useT();
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [previewView, setPreviewView] = useState(initial.defaultView);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const dirty =
    value.theme !== saved.theme ||
    value.typography !== saved.typography ||
    value.palette !== saved.palette ||
    value.layout !== saved.layout ||
    value.defaultView !== saved.defaultView ||
    value.enabledViews.join(",") !== saved.enabledViews.join(",");
  const target = value.enabledViews.includes(previewView)
    ? previewView
    : value.defaultView;
  const previewUrl = `${base}/${target}?${new URLSearchParams({ ffTheme: value.theme, ffType: value.typography, ffPalette: value.palette, ffLayout: value.layout, ffViews: value.enabledViews.join(","), ffDefault: value.defaultView })}`;
  return (
    <section className="appearance-editor">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t("Make it yours")}</p>
          <h2>{t("Exhibition style")}</h2>
        </div>
        <span className="muted">
          {dirty ? t("Previewing changes") : t("Live style")}
        </span>
      </div>
      <p className="muted">
        {t(
          "Choose the atmosphere, then the accent. Your photographs always keep their proportions.",
        )}
      </p>
      <fieldset>
        <legend>{t("Theme")}</legend>
        <div className="theme-options">
          {Object.entries(THEMES).map(([key, theme]) => (
            <label
              key={key}
              className={`theme-option ${value.theme === key ? "chosen" : ""}`}
            >
              <input
                type="radio"
                name="theme"
                value={key}
                checked={value.theme === key}
                onChange={() =>
                  setValue({ ...value, theme: key as Appearance["theme"] })
                }
              />
              <span className={`theme-mini theme-mini-${key}`}>
                <i />
                <i />
                <i />
              </span>
              <strong>{t(theme.label)}</strong>
              <small>{t(theme.description)}</small>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>{t("Typography")}</legend>
        <div className="theme-options">
          {Object.entries(TYPOGRAPHY).map(([key, type]) => (
            <label
              key={key}
              className={`theme-option ${value.typography === key ? "chosen" : ""}`}
            >
              <input
                type="radio"
                name="typography"
                value={key}
                checked={value.typography === key}
                onChange={() =>
                  setValue({
                    ...value,
                    typography: key as Appearance["typography"],
                  })
                }
              />
              <span className={`type-mini type-mini-${key}`} aria-hidden="true">
                Aa
              </span>
              <strong>{t(type.label)}</strong>
              <small>{t(type.description)}</small>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>{t("Visitor views")}</legend>
        <p className="muted">
          {t(
            "Choose which views visitors can open. Keep at least one available.",
          )}
        </p>
        <div className="visitor-view-options">
          {Object.entries(GALLERY_VIEWS).map(([key, view]) => {
            const selected = value.enabledViews.includes(key as GalleryView);
            return (
              <label key={key} className={selected ? "chosen" : ""}>
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={selected && value.enabledViews.length === 1}
                  onChange={() => {
                    const enabledViews = selected
                      ? value.enabledViews.filter((v) => v !== key)
                      : [...value.enabledViews, key as GalleryView];
                    setValue(resolveAppearance({ ...value, enabledViews }));
                  }}
                />
                <span>
                  <strong>{t(view.label)}</strong>
                  <small>{t(view.description)}</small>
                </span>
              </label>
            );
          })}
        </div>
        <label className="default-view-field">
          {t("Default view")}
          <select
            value={value.defaultView}
            onChange={(event) => {
              const defaultView = event.target.value as GalleryView;
              setValue({ ...value, defaultView });
              setPreviewView(defaultView);
            }}
          >
            {value.enabledViews.map((view) => (
              <option key={view} value={view}>
                {t(GALLERY_VIEWS[view].label)}
              </option>
            ))}
          </select>
          <small>
            {t("Opens when visitors choose “{entry}”.", {
              entry: t("Enter the exhibition"),
            })}
          </small>
        </label>
      </fieldset>
      {value.enabledViews.includes("salon") && (
        <fieldset>
          <legend>{t("Gallery layout")}</legend>
          <div className="theme-options">
            {Object.entries(LAYOUTS).map(([key, layout]) => (
              <label
                key={key}
                className={`theme-option ${value.layout === key ? "chosen" : ""}`}
              >
                <input
                  type="radio"
                  name="layout"
                  value={key}
                  checked={value.layout === key}
                  onChange={() => {
                    setValue({
                      ...value,
                      layout: key as Appearance["layout"],
                    });
                    setPreviewView("salon");
                  }}
                />
                <span
                  className={`layout-mini layout-mini-${key}`}
                  aria-hidden="true"
                >
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <strong>{t(layout.label)}</strong>
                <small>{t(layout.description)}</small>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend>{t("Palette")}</legend>
        <div className="palette-options">
          {Object.entries(PALETTES).map(([key, p]) => (
            <label key={key} className={value.palette === key ? "chosen" : ""}>
              <input
                type="radio"
                name="palette"
                value={key}
                checked={value.palette === key}
                onChange={() =>
                  setValue({ ...value, palette: key as Appearance["palette"] })
                }
              />
              <span style={{ background: p.accent }} />
              {t(p.label)}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="preview-bar">
        <label>
          {t("Preview")}{" "}
          <select
            aria-label={t("Preview view")}
            value={target}
            onChange={(event) =>
              setPreviewView(event.target.value as GalleryView)
            }
          >
            {value.enabledViews.map((view) => (
              <option key={view} value={view}>
                {t(GALLERY_VIEWS[view].label)}
              </option>
            ))}
          </select>
        </label>
        <a href={previewUrl} target="_blank" rel="noreferrer">
          {t("Open preview ↗")}
        </a>
      </div>
      <iframe
        title={t("Exhibition style preview")}
        className="style-preview"
        src={previewUrl}
      />
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="save-row">
        <p className="muted">
          {t("Visitors see changes only after you apply them.")}
        </p>
        <button
          className="primary"
          disabled={!dirty || pending}
          onClick={() =>
            start(async () => {
              try {
                await saveAppearance(id, value);
                setSaved(value);
                setError("");
              } catch {
                setError(t("Could not save the style. Please try again."));
              }
            })
          }
        >
          {pending
            ? t("Applying…")
            : dirty
              ? t("Apply style")
              : t("Style applied")}
        </button>
      </div>
    </section>
  );
}
