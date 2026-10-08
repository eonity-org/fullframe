/**
 * Curator upload — one photograph per request, so the studio can show
 * per-file progress. A route handler rather than a server action: actions cap
 * request bodies at 1 MB and photographs run to tens of MB. The write key stays
 * on the server; the browser never talks to TYDAL.
 */
import { eq } from "drizzle-orm";
import { db, schema } from "@db/index";
import { studioAccess, studioSession } from "@/lib/admin";
import { ingestPhotograph } from "@/lib/uploads";
import { detailsFrom, missingFields } from "@/lib/photoFields";
import { log } from "@/lib/log";
import { viewerT } from "@/i18n/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const t = await viewerT();
  if (!(await studioSession()))
    return Response.json({ error: t("Sign in again to continue.") }, { status: 401 });

  const id = Number((await params).id);
  const exhibition = await db.query.exhibitions.findFirst({
    where: eq(schema.exhibitions.id, id),
  });
  const access = exhibition ? await studioAccess(exhibition) : null;
  if (!exhibition || !access)
    return Response.json({ error: t("Exhibition not found.") }, { status: 404 });
  if (access !== "manage")
    return Response.json(
      { error: t("Your TYDAL role lets you look at this exhibition, not change it.") },
      { status: 403 },
    );
  if (exhibition.phase !== "setup")
    return Response.json(
      {
        error: t(
          "Photographs can be added while the exhibition is being set up, before the jury opens.",
        ),
      },
      { status: 409 },
    );

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: t("The upload was interrupted. Try again.") }, { status: 400 });
  }
  const image = form.get("image");
  const details = detailsFrom(form);
  if (!(image instanceof File) || !image.type.startsWith("image/"))
    return Response.json({ error: t("Choose an image file.") }, { status: 400 });
  if (missingFields(details).length)
    return Response.json(
      { error: t("Give the photograph at least a title and an author.") },
      { status: 400 },
    );

  // The curator's own photograph: their exhibition setting decides.
  const result = await ingestPhotograph(exhibition, image, details, {
    suggest: exhibition.suggestionsEnabled,
  });
  if (!result.ok) {
    log.warn("upload.refused", { exhibitionId: id, status: result.status });
    return Response.json({ error: t(result.error) }, { status: result.status });
  }
  return Response.json({ hash: result.hash });
}
