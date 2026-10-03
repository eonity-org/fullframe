/**
 * The juror's front door: /j/{token}. A valid, unrevoked
 * token becomes a jury session cookie and lands on the exhibition welcome
 * page in jury chrome; anything else is an indistinguishable 404.
 */
import { eq } from 'drizzle-orm';
import { db, schema } from '@db/index';
import { createJurySession, jurorFromToken } from '@/lib/jury';
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rateLimit';
import { log } from '@/lib/log';
import { withOrganizationSlug } from '@/lib/exhibitions';
import { exhibitionPath } from '@/lib/paths';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  // Throttle token guessing by IP — 30 tries/min. The lookup is already
  // constant-time (no timing leak); this caps volume.
  const ip = clientIp(request);
  const limit = rateLimit(`jury-door:${ip}`, 30, 60_000);
  if (!limit.ok) {
    log.warn('jury.door.throttled', { ip });
    return tooManyRequests(limit);
  }

  const { token } = await params;
  const juror = await jurorFromToken(token);
  if (!juror) {
    log.warn('jury.door.miss', { ip });
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const exhibition = await db.query.exhibitions.findFirst({
    where: eq(schema.exhibitions.id, juror.exhibitionId),
  });
  if (!exhibition) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  await createJurySession(juror.id);
  // Always the juror's home (review 3): the personal link used to open on the
  // public welcome page, which says nothing about judging — a juror arrived
  // with no idea what was expected of them. The home page explains the task,
  // shows their progress, and hands them the next photograph. Once the jury
  // closes, the same page is their read-only record.
  // Keep the browser's public origin: request.url may contain Docker's
  // internal hostname when running the standalone server.
  return new Response(null, {
    status: 303,
    headers: { Location: exhibitionPath(await withOrganizationSlug(exhibition), 'jury') },
  });
}
