import { and, eq } from "drizzle-orm";
import { db, schema } from "@db/index";
import { ExhibitionDirectory } from "@/components/ExhibitionDirectory";
import { withOrganizationSlug } from "@/lib/exhibitions";
export const dynamic = "force-dynamic";
/**
 * Every public exhibition on view, whichever organization it belongs to —
 * except those the installation admin left off the home page.
 */
export default async function Home() {
  const exhibitions = await Promise.all(
    (
      await db.query.exhibitions.findMany({
        where: and(
          eq(schema.exhibitions.phase, "open"),
          eq(schema.exhibitions.visibility, "public"),
          eq(schema.exhibitions.onHome, true),
        ),
      })
    ).map(withOrganizationSlug),
  );
  return <ExhibitionDirectory exhibitions={exhibitions} />;
}
