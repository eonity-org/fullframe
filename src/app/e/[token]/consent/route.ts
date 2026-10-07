/**
 * An invited author answers the two consent questions (src/lib/consent.ts):
 * the data protection notice (`notice: true`, required before sending
 * anything) and AI processing (`ai`, optional — asked only when the
 * exhibition has suggestions on). The author can change the AI answer while
 * submissions are open; each answer is recorded with its time and the
 * notice's version.
 */
import { eq } from "drizzle-orm";
import { db, schema } from "@db/index";
import { authorGate } from "@/lib/authorGate";
import { CONSENT_VERSION, needsNotice } from "@/lib/consent";
import { log } from "@/lib/log";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const gate = await authorGate(request, (await params).token);
  if ("error" in gate) return gate.error;
  const { t, author, exhibition } = gate;

  let body: { notice?: unknown; ai?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const accepting = needsNotice(author);
  if (accepting && body.notice !== true)
    return Response.json(
      { error: t("Accept the data protection notice before sending photographs.") },
      { status: 400 },
    );

  const now = new Date();
  const ai = exhibition.suggestionsEnabled && body.ai === true;
  await db
    .update(schema.authors)
    .set({
      ...(accepting ? { noticeAcceptedAt: now, consentVersion: CONSENT_VERSION } : {}),
      // Keep the original time while consent stands; null once withdrawn.
      aiConsentAt: ai ? (author.aiConsentAt ?? now) : null,
    })
    .where(eq(schema.authors.id, author.id));
  log.info("author.consent", {
    exhibitionId: exhibition.id,
    authorId: author.id,
    notice: accepting ? "accepted" : "kept",
    ai,
  });
  return Response.json({ ok: true });
}
