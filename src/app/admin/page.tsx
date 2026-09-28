import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@db/index";
import { accessFor, managedOrganizations, studioSession } from "@/lib/admin";
import { logout } from "@/lib/actions";
import { ConnectionForm } from "@/components/admin/ConnectionForm";
import { viewerT } from "@/i18n/server";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; deleted?: string; detail?: string }>;
}) {
  const session = await studioSession();
  if (!session) redirect("/admin/login");
  // Only the exhibitions this person can reach: every one for the
  // installation admin, their organizations' for a curator.
  const all = (await db.query.exhibitions.findMany()).filter((e) =>
    accessFor(session, e.organizationId),
  );
  const severalOrganizations =
    session.kind === "admin" || session.organizations.length > 1;
  const { error, deleted, detail } = await searchParams;
  const t = await viewerT();
  return (
    <main className="studio">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("Your curatorial space")}</p>
          <h1>{t("Exhibitions")}</h1>
          <p className="intro">
            {t("Bring photographs together. Give them a place to be seen.")}
          </p>
        </div>
        <form action={logout} className="studio-account">
          <span className="muted">
            {session.kind === "admin"
              ? session.name
                ? t("{name} · installation admin", { name: session.name })
                : t("Installation admin")
              : session.name}
          </span>
          <button className="quiet-button">{t("Sign out")}</button>
        </form>
      </div>
      {error && (
        <p className="error" role="alert">
          {detail ||
            t(
              "We couldn’t create the exhibition. Check the vault connection and try again.",
            )}
        </p>
      )}
      {deleted && (
        <p className="status ok">
          {t("“{title}” has been deleted.", { title: deleted })}
        </p>
      )}
      <div className="studio-exhibitions">
        {all.map((e) => (
          <Link
            className="studio-exhibition"
            key={e.id}
            href={`/admin/${e.id}`}
          >
            <div className="section-heading">
              <span className={`phase-pill ${e.phase}`}>
                {e.phase === "setup"
                  ? t("Draft")
                  : e.phase === "open"
                    ? t("Published")
                    : e.phase === "judging"
                      ? t("Jury open")
                      : t("Ready to select")}
              </span>
              <span>↗</span>
            </div>
            <div className="studio-exhibition-title">
              <h2>{e.title}</h2>
              {severalOrganizations && e.organizationName && (
                <span className="muted">{e.organizationName}</span>
              )}
            </div>
            <p>{e.subtitle || t("Your next exhibition, taking shape.")}</p>
            <span className="muted">{t("Manage exhibition →")}</span>
          </Link>
        ))}
      </div>
      {all.length === 0 && (
        <p className="muted studio-empty">
          {t(
            "No exhibitions yet. Your TYDAL administrator creates each exhibition’s vault and gives you its address and keys to connect here.",
          )}
        </p>
      )}
      {(session.kind === "admin" || managedOrganizations(session).length > 0) && (
        <ConnectionForm />
      )}
    </main>
  );
}
