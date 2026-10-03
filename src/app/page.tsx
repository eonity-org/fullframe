import { eq } from "drizzle-orm";
import { db, schema } from "@db/index";
import { ExhibitionDirectory } from "@/components/ExhibitionDirectory";
import { withOrganizationSlug } from "@/lib/exhibitions";
export const dynamic = "force-dynamic";
/** Every exhibition on view, whichever organization it belongs to. */
export default async function Home() {
  const exhibitions = await Promise.all(
    (
      await db.query.exhibitions.findMany({
        where: eq(schema.exhibitions.phase, "open"),
      })
    ).map(withOrganizationSlug),
  );
  return <ExhibitionDirectory exhibitions={exhibitions} />;
}
