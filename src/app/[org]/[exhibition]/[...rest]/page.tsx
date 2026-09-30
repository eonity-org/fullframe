import { notFound, permanentRedirect } from "next/navigation";
import { legacyAddress } from "@/lib/exhibitions";
/**
 * Nothing lives this deep but the wall's photographs, so an address that got
 * here is an old `/{exhibition}/wall/{photo}`: redirect it, or 404.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ org: string; exhibition: string; rest: string[] }>;
}) {
  const { org, exhibition, rest } = await params;
  const moved = await legacyAddress([org, exhibition, ...rest]);
  if (moved) permanentRedirect(moved);
  notFound();
}
