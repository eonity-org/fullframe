"use client";
/**
 * The language for client components. The root layout provides the viewer's
 * language; an exhibition's layout nests its own, so everything inside an
 * exhibition (gallery, jury) follows the exhibition.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_LOCALE, translator, type Locale } from "./core";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT() {
  const locale = useContext(LocaleContext);
  return useMemo(() => translator(locale), [locale]);
}
