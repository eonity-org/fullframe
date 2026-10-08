import { notFound, permanentRedirect } from "next/navigation";
import { ExhibitionDirectory } from "@/components/ExhibitionDirectory";
import { legacyAddress, organizationExhibitions } from "@/lib/exhibitions";
export const dynamic = "force-dynamic";
/**
 * One organization's exhibitions on view. A segment that names no
 * organization may be an old `/{exhibition}` address: it redirects.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org } = await params;
  const exhibitions = await organizationExhibitions(org);
  if (!exhibitions.length) {
    const moved = await legacyAddress([org]);
    if (moved) permanentRedirect(moved);
    notFound();
  }
  const name =
    exhibitions.find((e) => e.organizationName)?.organizationName ?? org;
  return (
    <ExhibitionDirectory
      exhibitions={exhibitions.filter((e) => e.phase === "open" && e.visibility === "public")}
      organization={name}
    />
  );
}
