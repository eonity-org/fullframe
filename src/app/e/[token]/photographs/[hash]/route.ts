/**
 * An invited author corrects (PATCH) or removes (DELETE) one of their own
 * photographs while submissions are open. The author's name stays the one on
 * the invitation.
 */
import { authorGate } from "@/lib/authorGate";
import { authorEntries, forgetSubmission, recordSent } from "@/lib/authors";
import { updatePhotograph, withdrawPhotograph } from "@/lib/uploads";
import { detailsFrom, missingFields } from "@/lib/photoFields";
import { log } from "@/lib/log";

type Context = { params: Promise<{ token: string; hash: string }> };

async function ownPhotograph(request: Request, { params }: Context) {
  const { token, hash } = await params;
  const gate = await authorGate(request, token);
  if ("error" in gate) return gate;
  if (!(await authorEntries(gate.author.id, gate.ingested)).includes(hash))
    return { error: Response.json({ error: "Not found" }, { status: 404 }) };
  return { ...gate, hash };
}

export async function PATCH(request: Request, context: Context) {
  const gate = await ownPhotograph(request, context);
  if ("error" in gate) return gate.error;
  const { t, author, exhibition, hash } = gate;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const details = { ...detailsFrom(body), author: author.name };
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
  const result = await updatePhotograph(exhibition, hash, details);
  if (!result.ok) {
    log.warn("author.update.refused", { exhibitionId: exhibition.id, status: result.status });
    return Response.json({ error: t(result.error) }, { status: result.status });
  }
  await recordSent(hash, details);
  return Response.json({ ok: true });
}

export async function DELETE(request: Request, context: Context) {
  const gate = await ownPhotograph(request, context);
  if ("error" in gate) return gate.error;
  const { t, exhibition, hash } = gate;
  const result = await withdrawPhotograph(exhibition, hash);
  if (!result.ok) {
    log.warn("author.withdraw.refused", { exhibitionId: exhibition.id, status: result.status });
    return Response.json({ error: t(result.error) }, { status: result.status });
  }
  await forgetSubmission(hash);
  return Response.json({ ok: true });
}
