import Link from "next/link";
import { viewerT } from "@/i18n/server";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await viewerT();
  return (
    <div className="chrome-admin">
      <header className="admin-header">
        <Link className="wordmark" href="/admin">
          <span className="frame-mark" />
          <span className="wordmark-name">FullFrame</span>
          <span className="admin-label">{t("Studio")}</span>
        </Link>
        <div className="admin-header-links">
          <LocaleSwitcher />
          <Link href="/">{t("Public gallery ↗")}</Link>
        </div>
      </header>
      {children}
    </div>
  );
}
