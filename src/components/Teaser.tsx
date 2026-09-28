"use client";
import Link from "next/link";
import { useT } from "@/i18n/client";
export function Teaser({ title }: { title: string }) {
  const t = useT();
  return (
    <main className="teaser">
      <Link className="wordmark" href="/">
        FullFrame
        <span className="frame-mark" />
      </Link>
      <div>
        <p className="eyebrow">{t("Coming into view")}</p>
        <h1>{title}</h1>
        <p>{t("This exhibition is not open yet.")}</p>
        <p className="muted">
          {t(
            "If you’re on the jury, enter through your personal invitation link.",
          )}
        </p>
      </div>
      <Link href="/">{t("Explore open exhibitions →")}</Link>
    </main>
  );
}
