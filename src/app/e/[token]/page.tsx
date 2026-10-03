/**
 * An invited author's page: /e/{token}. While submissions are open the author
 * sends up to their limit of photographs, and corrects or removes them; the
 * author's name comes from the invitation. The page speaks the exhibition's
 * language. Anything but a live link is a 404.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { authorEntries, authorFromToken, submissionsOpen } from "@/lib/authors";
import { photoDetails, uploadAccess } from "@/lib/uploads";
import { PhotoUploader } from "@/components/admin/PhotoUploader";
import { I18nProvider } from "@/i18n/client";
import { exhibitionLocale, exhibitionT } from "@/i18n/server";
import { FrameMark } from "@/components/FrameMark";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { token } = await params;
  const done = (await searchParams).done !== undefined;
  const found = await authorFromToken(token);
  if (!found) notFound();
  const { author, exhibition } = found;
  const t = exhibitionT(exhibition);
  const open = submissionsOpen(exhibition);
  const { access, ingested, maxUploadBytes } = open
    ? await uploadAccess(exhibition)
    : { access: "not-setup" as const, ingested: [], maxUploadBytes: null };
  const sent = open ? await authorEntries(author.id, ingested) : [];
  const added = await photoDetails(exhibition, sent).catch(() => []);
  const remaining = Math.max(0, exhibition.submissionLimit - sent.length);

  return (
    <I18nProvider locale={exhibitionLocale(exhibition)}>
      <div className="chrome-admin">
        <header className="admin-header author-header">
          <span className="wordmark">
            <FrameMark />
            <span className="wordmark-name">FullFrame</span>
            <span className="admin-label">{t("Submission")}</span>
          </span>
          {!done && (
            <a className="button" href={`/e/${token}?done`}>
              {t("Finish")}
            </a>
          )}
        </header>
        <main className="studio author-page">
          <div className="page-heading">
            <div>
              <p className="eyebrow">{t("Send your photographs")}</p>
              <h1>{exhibition.title}</h1>
              <p className="intro">
                {t.n(
                  exhibition.submissionLimit,
                  "{name}, you are invited to send up to {count} photograph.",
                  "{name}, you are invited to send up to {count} photographs.",
                  { name: author.name },
                )}
              </p>
            </div>
          </div>
          <section className="panel">
            {done ? (
              <div className="author-done">
                <h2>{t("Thank you, {name}.", { name: author.name })}</h2>
                <p className="muted">
                  {open
                    ? t.n(
                        sent.length,
                        "The curator has your photograph. You can come back with the same link to add or correct photographs while submissions are open.",
                        "The curator has your {count} photographs. You can come back with the same link to add or correct photographs while submissions are open.",
                      )
                    : t("You can close this page.")}
                </p>
                {open && (
                  <a className="quiet-link" href={`/e/${token}`}>
                    {t("← Back to my photographs")}
                  </a>
                )}
              </div>
            ) : !open ? (
              <p className="hint">
                {t(
                  "Submissions are closed. Your link stays valid, so come back when the curator opens them.",
                )}
              </p>
            ) : access !== "ready" ? (
              <p className="hint">
                {t("Submissions are not available right now. Try again later.")}
              </p>
            ) : (
              <>
                <p className="muted">
                  {remaining > 0
                    ? t.n(
                        remaining,
                        "You can send {count} more photograph. Give each one a title; you can correct the details or remove a photograph while submissions are open.",
                        "You can send {count} more photographs. Give each one a title; you can correct the details or remove a photograph while submissions are open.",
                      )
                    : t(
                        "You have sent all your photographs. Remove one to send another.",
                      )}
                </p>
                <PhotoUploader
                  endpoint={`/e/${token}/photographs`}
                  canUpload
                  maxUploadBytes={maxUploadBytes}
                  note={null}
                  author={author.name}
                  remaining={remaining}
                  showPreviews={false}
                  addedTitle={t("Your photographs")}
                  added={added.map((photo) => ({ ...photo, preview: null }))}
                />
              </>
            )}
          </section>
        </main>
      </div>
    </I18nProvider>
  );
}
