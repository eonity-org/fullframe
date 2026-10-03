"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/client";
export function AdminNav({ id }: { id: number }) {
  const path = usePathname();
  const t = useT();
  return (
    <nav className="admin-tabs" aria-label={t("Manage exhibition")}>
      {[
        ["", t("Setup")],
        ["/results", t("Selection")],
        ["/publish", t("Appearance & publish")],
      ].map(([suffix, label]) => (
        <Link
          key={suffix}
          href={`/admin/${id}${suffix}`}
          aria-current={path === `/admin/${id}${suffix}` ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
