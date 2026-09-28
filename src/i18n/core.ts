/**
 * Translations keyed by their English text.
 *
 * The English sentence in the code *is* the key, so English needs no file and
 * a missing translation falls back to readable English. `es.json` maps each
 * English key to its Spanish text. `npm run i18n` lists keys used in the code
 * but missing from a dictionary (and dictionary entries nothing uses any
 * more); the test suite fails on either, so the files cannot drift silently.
 *
 * Keys must be string literals at the call site (`t("…")`, `t.rich("…")`,
 * `t.n(count, "…", "…")`, `t.x("context", "…")`) so the checker can find
 * them. Text defined away from where it is shown — labels in a constant, an
 * error raised in a library — is marked with `msg("…")` (or `msgv("…", vars)`
 * when it carries values) and translated later with `t(value)`.
 *
 * Placeholders are `{name}`. Plurals use `t.n`, which picks the singular only
 * for exactly 1 — correct for both English and Spanish.
 */
import { Fragment, createElement, type ReactNode } from "react";
import es from "./es.json";

export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
/** Each language named in itself, for language pickers. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
};

export const DICTIONARIES: Record<
  Exclude<Locale, "en">,
  Record<string, string>
> = { es };

export type Vars = Record<string, string | number>;

/** A translatable message carried away from where it is shown. */
export type Message = { key: string; vars?: Vars };

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

/** Marks English text for translation where it is defined; returns it as is. */
export function msg(key: string): string {
  return key;
}

/** Like `msg`, for a message that carries values. */
export function msgv(key: string, vars?: Vars): Message {
  return { key, vars };
}

/** The English rendering of a message — for logs and non-UI callers. */
export function english(message: Message): string {
  return interpolate(message.key, message.vars);
}

function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.hasOwn(vars, name) ? String(vars[name]) : match,
  );
}

export type Translator = {
  (key: string | Message, vars?: Vars): string;
  /** Placeholders filled with elements, e.g. `{title}` → `<strong>…</strong>`. */
  rich(key: string, vars: Record<string, ReactNode>): ReactNode;
  /** Singular for exactly 1, plural otherwise; `{count}` is filled in. */
  n(count: number, one: string, other: string, vars?: Vars): string;
  /** The same English text meaning different things; keyed `context|text`. */
  x(context: string, key: string, vars?: Vars): string;
  locale: Locale;
};

export function translator(locale: Locale): Translator {
  const dictionary = locale === "en" ? null : DICTIONARIES[locale];
  const lookup = (key: string, fallback = key) => dictionary?.[key] || fallback;
  const t = ((key: string | Message, vars?: Vars) =>
    typeof key === "string"
      ? interpolate(lookup(key), vars)
      : interpolate(lookup(key.key), { ...key.vars, ...vars })) as Translator;
  t.rich = (key, vars) =>
    createElement(
      Fragment,
      null,
      ...lookup(key)
        .split(/(\{\w+\})/)
        .map((part, i) => {
          const name = part.match(/^\{(\w+)\}$/)?.[1];
          return createElement(
            Fragment,
            { key: i },
            name && Object.hasOwn(vars, name) ? vars[name] : part,
          );
        }),
    );
  t.n = (count, one, other, vars) =>
    interpolate(lookup(count === 1 ? one : other), { count, ...vars });
  t.x = (context, key, vars) =>
    interpolate(lookup(`${context}|${key}`, key), vars);
  t.locale = locale;
  return t;
}

/** The best supported language for an `Accept-Language` header. */
export function negotiateLocale(header: string | null | undefined): Locale {
  const ranked = (header || "")
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.toLowerCase(), q: q ? Number(q.split("=")[1]) : 1 };
    })
    .filter((entry) => entry.tag && entry.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
