"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_NAMES } from "@/i18n/core";
import { useLocale, useT } from "@/i18n/client";
import { setViewerLocale } from "@/i18n/actions";

/** The viewer's own language, for the home page and the studio. */
export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="locale-switcher" role="group" aria-label={t("Language")}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          className="quiet-button"
          aria-pressed={l === locale}
          disabled={pending}
          onClick={() =>
            start(async () => {
              await setViewerLocale(l);
              router.refresh();
            })
          }
        >
          {LOCALE_NAMES[l]}
        </button>
      ))}
    </div>
  );
}
