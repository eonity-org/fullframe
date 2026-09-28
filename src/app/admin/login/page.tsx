import Link from "next/link";
import { redirect } from "next/navigation";
import { adminEnabled, curatorLoginEnabled, studioSession } from "@/lib/admin";
import { login } from "@/lib/actions";
import { viewerT } from "@/i18n/server";
export const dynamic = "force-dynamic";

/**
 * Curators sign in with their TYDAL account; the installation admin with the
 * ADMIN_PASSWORD (`?admin=1`, or the only option when curator sign-in is off).
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string; admin?: string }>;
}) {
  if (await studioSession()) redirect("/admin");
  const { error, email, admin } = await searchParams;
  const t = await viewerT();
  const curators = curatorLoginEnabled();
  const adminMode = !curators || admin === "1";
  const errors: Record<string, string> = {
    admin: t("That password didn’t match. Try again."),
    invalid: t("That email and password don’t match a TYDAL account."),
    disabled: t("This TYDAL account is disabled. Ask your TYDAL administrator."),
    throttled: t("Too many attempts. Wait a minute and try again."),
    unavailable: t("TYDAL can’t be reached right now. Try again in a moment."),
    "no-organization": t(
      "Your TYDAL account isn’t in any organization yet. Ask your TYDAL administrator to add you.",
    ),
  };
  return (
    <main className="login-page">
      <div className="login-intro">
        <p className="eyebrow">{t("The curator’s studio")}</p>
        <h1>
          {t("Good photographs.")}
          <br />
          {t("Thoughtfully presented.")}
        </h1>
        <p>
          {t("Create an exhibition, invite a jury, share your perspective.")}
        </p>
      </div>
      <section className="login-card">
        <h2>{t("Welcome back.")}</h2>
        <p className="muted">
          {adminMode
            ? t("Installation admin — sees every exhibition.")
            : t("Sign in with your TYDAL account to manage your organization’s exhibitions.")}
        </p>
        {error && errors[error] && (
          <p className="error" role="alert">
            {errors[error]}
          </p>
        )}
        {adminMode ? (
          adminEnabled() ? (
            <form action={login} className="stack-form">
              <label>
                {t("Password")}
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              <button className="primary">{t("Enter the studio →")}</button>
              {curators && (
                <Link href="/admin/login" className="quiet-link">
                  {t("Sign in with your TYDAL account instead")}
                </Link>
              )}
            </form>
          ) : (
            <p>{t("Ask the installation owner to enable curator access.")}</p>
          )
        ) : (
          <form action={login} className="stack-form">
            <label>
              {t("Email")}
              <input
                type="email"
                name="email"
                autoComplete="username"
                defaultValue={email}
                required
              />
            </label>
            <label>
              {t("Password")}
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
              />
            </label>
            <button className="primary">{t("Enter the studio →")}</button>
            {adminEnabled() && (
              <Link href="/admin/login?admin=1" className="quiet-link">
                {t("Installation admin")}
              </Link>
            )}
          </form>
        )}
      </section>
    </main>
  );
}
