/**
 * An invited author sends one photograph — the curator's upload route, seen
 * from the author's side: the author's name comes from the invitation, and the
 * invitation's limit is checked before anything reaches TYDAL.
 */
import { db, schema } from "@db/index";
import { authorGate } from "@/lib/authorGate";
import { authorEntries } from "@/lib/authors";
import { ingestPhotograph } from "@/lib/uploads";
import { detailsFrom, missingFields } from "@/lib/photoFields";
import { log } from "@/lib/log";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const gate = await authorGate(request, (await params).token);
  if ("error" in gate) return gate.error;
  const { t, author, exhibition, ingested } = gate;

  const sent = await authorEntries(author.id, ingested);
  if (sent.length >= exhibition.submissionLimit)
    return Response.json(
      {
        error: t.n(
          exhibition.submissionLimit,
          "You have already sent your {count} photograph.",
          "You have already sent your {count} photographs.",
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
  const details = { ...detailsFrom(form), author: author.name };
  if (!(image instanceof File) || !image.type.startsWith("image/"))
    return Response.json({ error: t("Choose an image file.") }, { status: 400 });
  if (missingFields(details).length)
    return Response.json({ error: t("Give the photograph a title.") }, { status: 400 });

  const result = await ingestPhotograph(exhibition, image, details);
  if (!result.ok) {
    log.warn("author.upload.refused", { exhibitionId: exhibition.id, status: result.status });
    return Response.json({ error: t(result.error) }, { status: result.status });
  }
  await db
    .insert(schema.submissions)
    .values({ authorId: author.id, resourceHash: result.hash });
  return Response.json({ hash: result.hash });
}
