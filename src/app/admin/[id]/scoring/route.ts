/**
 * The immutable scoring record download. Admin
 * session required. Served from FullFrame's DB — set at the opening, frozen
 * with the exhibition.
 */
import { eq } from 'drizzle-orm';
import { db, schema } from '@db/index';
import { studioAccess, studioSession } from '@/lib/admin';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await studioSession())) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: idRaw } = await params;
  const exhibition = await db.query.exhibitions.findFirst({
    where: eq(schema.exhibitions.id, Number(idRaw)),
  });
  // Viewers may read it too; outside the exhibition's organization it doesn't exist.
  if (!exhibition || !(await studioAccess(exhibition)))
    return Response.json({ error: 'Not found' }, { status: 404 });
  if (!exhibition.scoringRecord) {
    return Response.json({ error: 'No scoring record yet (open the exhibition first).' }, { status: 404 });
  }

  return new Response(JSON.stringify(exhibition.scoringRecord, null, 2), {
    headers: {
      'content-type': 'application/json',
      'content-disposition': `attachment; filename="${exhibition.slug}-scoring.json"`,
    },
  });
}
