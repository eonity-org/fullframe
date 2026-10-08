/**
 * An exhibition's private link: /x/{vaultHash}. For an open `unlisted`
 * exhibition it leaves the link pass (src/lib/linkPass.ts) and lands on the
 * exhibition; for a public one it just lands there, so a link already shared
 * keeps working if the exhibition is reopened as public. Anything else is an
 * indistinguishable 404.
 */
import { eq } from "drizzle-orm";
import { db, schema } from "@db/index";
import { grantLinkPass } from "@/lib/linkPass";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";
import { log } from "@/lib/log";
import { withOrganizationSlug } from "@/lib/exhibitions";
import { exhibitionPath } from "@/lib/paths";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ hash: string }> },
) {
  // Throttle guessing by IP, as for the jury's link.
  const ip = clientIp(request);
  const limit = rateLimit(`private-link:${ip}`, 30, 60_000);
  if (!limit.ok) {
    log.warn("private.link.throttled", { ip });
    return tooManyRequests(limit);
  }

  const { hash } = await params;
  const exhibition = hash
    ? await db.query.exhibitions.findFirst({
        where: eq(schema.exhibitions.vaultHash, hash),
      })
    : undefined;
  if (!exhibition || exhibition.phase !== "open") {
    log.warn("private.link.miss", { ip });
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (exhibition.visibility === "unlisted") await grantLinkPass(exhibition);
  // A relative Location keeps the browser's public origin (request.url may
  // carry Docker's internal hostname), as the jury's link does.
  return new Response(null, {
    status: 303,
    headers: { Location: exhibitionPath(await withOrganizationSlug(exhibition)) },
  });
}
