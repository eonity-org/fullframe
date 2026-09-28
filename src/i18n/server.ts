/**
 * Which language a request is served in.
 *
 * Two rules. Anything belonging to one exhibition — its public pages, its jury
 * and the jury API — speaks the exhibition's language (`exhibitions.locale`,
 * chosen by the curator), because the exhibition's own text is written in it.
 * Everything else — the home page and the curator's studio — speaks the
 * viewer's language: their saved choice, else the browser's preference.
 */
import "server-only";
import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  isLocale,
  negotiateLocale,
  translator,
  type Locale,
  type Translator,
} from "./core";

export const LOCALE_COOKIE = "ff_locale";

export async function viewerLocale(): Promise<Locale> {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  return negotiateLocale((await headers()).get("accept-language"));
}

export function exhibitionLocale(exhibition: {
  locale?: string | null;
}): Locale {
  return isLocale(exhibition.locale) ? exhibition.locale : DEFAULT_LOCALE;
}

/** Translator for the viewer's language (home page, studio, admin actions). */
export async function viewerT(): Promise<Translator> {
  return translator(await viewerLocale());
}

/** Translator for an exhibition's own language (public pages, jury). */
export function exhibitionT(exhibition: {
  locale?: string | null;
}): Translator {
  return translator(exhibitionLocale(exhibition));
}
