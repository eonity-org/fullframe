import Link from "next/link";
import { viewerLocale, viewerT } from "@/i18n/server";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { FrameMark } from "@/components/FrameMark";
import { guidePath } from "@/lib/paths";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await viewerT();
  const locale = await viewerLocale();
  return (
    <div className="chrome-admin">
      <header className="admin-header">
        <Link className="wordmark" href="/admin">
          <FrameMark />
          <span className="wordmark-name">FullFrame</span>
          <span className="admin-label">{t("Studio")}</span>
        </Link>
        <div className="admin-header-links">
          <LocaleSwitcher />
          <Link href={guidePath("curators", locale)}>{t("Help")}</Link>
          <Link href="/">{t("Public gallery ↗")}</Link>
        </div>
      </header>
      {children}
    </div>
  );
}
