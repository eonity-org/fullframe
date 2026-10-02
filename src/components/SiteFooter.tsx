"use client";
import Link from "next/link";
import { useT } from "@/i18n/client";

export const TYDAL_URL = "https://github.com/eonity-org/tydal";
export const EONITY_URL = "https://eonity.org";

/**
 * The one footer for every public page. Left: the exhibition being viewed
 * (nothing on the home page). Right, the same everywhere: FullFrame with its
 * one brand line, the TYDAL it runs on, and Eonity. The brand line sits by the
 * FullFrame credit so it never reads as the exhibition's own tagline; the home
 * page leaves it out because its headline already says it.
 */
export function SiteFooter({
  title,
  lemma = true,
}: {
  title?: string;
  lemma?: boolean;
}) {
  const t = useT();
  return (
    <footer className="gallery-footer">
      {title && <strong className="footer-identity">{title}</strong>}
      <div className="footer-credits">
        <span>
          <Link href="/">FullFrame</Link>
          {lemma && (
            <span className="footer-lemma">
              {" — "}
              {t("Make room for a different view.")}
            </span>
          )}
        </span>
        <span aria-hidden="true">·</span>
        <span className="footer-powered">
          {t.rich("Powered by {tydal}", {
            tydal: (
              <a
                href={TYDAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                title={t("TYDAL on GitHub")}
              >
                {/* The simplified logo for small sizes: monochrome blue, or
                    white on the Dark Gallery theme (globals.css). */}
                <img className="tydal-mark" src="/tydal-logo.png" alt="TYDAL" width={36} height={16} />
                <img
                  className="tydal-mark tydal-mark-white"
                  src="/tydal-logo-white.png"
                  alt=""
                  aria-hidden="true"
                  width={36}
                  height={16}
                />
              </a>
            ),
          })}
        </span>
        <span aria-hidden="true">·</span>
        <span>
          {t.rich("open source by {eonity}", {
            eonity: (
              <a href={EONITY_URL} target="_blank" rel="noopener noreferrer">
                Eonity
              </a>
            ),
          })}
        </span>
      </div>
    </footer>
  );
}
