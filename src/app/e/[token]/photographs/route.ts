/**
 * An invited author sends one photograph — the curator's upload route, seen
 * from the author's side: the author's name comes from the invitation, and the
 * invitation's limit is checked before anything reaches TYDAL.
 */
import { db, schema } from "@db/index";
import { authorGate } from "@/lib/authorGate";
import { authorEntries } from "@/lib/authors";
import { aiAllowed, needsNotice } from "@/lib/consent";
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

  if (needsNotice(author))
    return Response.json(
      { error: t("Accept the data protection notice before sending photographs.") },
      { status: 403 },
    );

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
  const missing = missingFields(details, exhibition);
  if (missing.length)
    return Response.json(
      {
        error: missing.includes("name")
          ? t("Give the photograph a title.")
          : t("Give the photograph a description."),
      },
      { status: 400 },
    );

  // To AITY only with the author's consent (src/lib/consent.ts).
  const suggest = aiAllowed(exhibition, author);
  const result = await ingestPhotograph(exhibition, image, details, { suggest });
  if (!result.ok) {
    log.warn("author.upload.refused", { exhibitionId: exhibition.id, status: result.status });
    return Response.json({ error: t(result.error) }, { status: result.status });
  }
  await db
    .insert(schema.submissions)
    .values({ authorId: author.id, resourceHash: result.hash, suggested: suggest });
  return Response.json({ hash: result.hash });
}
