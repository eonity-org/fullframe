import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@db/index";
import { requireStudioAccess } from "@/lib/studioPage";
import { resolveAppearance } from "@/lib/appearance";
import { AppearancePicker } from "@/components/admin/AppearancePicker";
import { AdminNav } from "@/components/admin/AdminNav";
import { StageGuide } from "@/components/admin/StageGuide";
import { viewerT } from "@/i18n/server";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  const e = await db.query.exhibitions.findFirst({
    where: eq(schema.exhibitions.id, id),
  });
  if (!e) notFound();
  const access = await requireStudioAccess(e);
  const t = await viewerT();
  return (
    <main className="studio">
      {access === "view" && (
        <p className="status" role="status">
          {t("Read-only: your TYDAL role lets you look at this exhibition, not change it.")}
        </p>
      )}
      {/* A viewer's studio: every control disabled; the server refuses changes too. */}
      <fieldset className="studio-fieldset" disabled={access !== "manage"}>
      <Link className="back-link" href="/admin">
        {t("← All exhibitions")}
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("Exhibition appearance")}</p>
          <h1>{e.title}</h1>
        </div>
      </div>
      <AdminNav id={id} />
      <StageGuide id={id} phase={e.phase} />
      <AppearancePicker
        id={id}
        slug={e.slug}
        initial={resolveAppearance(e.appearance)}
      />
      </fieldset>
    </main>
  );
}
