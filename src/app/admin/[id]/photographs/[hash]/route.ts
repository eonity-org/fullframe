/**
 * Correct (PATCH) or remove (DELETE) a photograph the curator added here —
 * the vault's `update` / `withdraw` ops — and read what the edit form offers
 * beside its title and description (GET): what TYDAL's AITY proposes, and for
 * an author's photograph what the author sent. Only during setup; TYDAL itself
 * refuses any photograph that didn't arrive through this vault's `ingest`.
 * A photograph an invited author sent keeps that author's name.
 */
import { eq } from "drizzle-orm";
import { db, schema } from "@db/index";
import { studioAccess, studioSession } from "@/lib/admin";
import { photoSuggestion, updatePhotograph, withdrawPhotograph } from "@/lib/uploads";
import { detailsFrom, missingFields } from "@/lib/photoFields";
import { forgetSubmission, keepAuthor, sentByAuthor, submittedBy } from "@/lib/authors";
import { log } from "@/lib/log";
import { viewerT } from "@/i18n/server";

type Context = { params: Promise<{ id: string; hash: string }> };

async function setupExhibition(id: number) {
  const t = await viewerT();
  if (!(await studioSession()))
    return {
      t,
      error: Response.json({ error: t("Sign in again to continue.") }, { status: 401 }),
    };
  const exhibition = await db.query.exhibitions.findFirst({
    where: eq(schema.exhibitions.id, id),
  });
  const access = exhibition ? await studioAccess(exhibition) : null;
  if (!exhibition || !access)
    return {
      t,
      error: Response.json({ error: t("Exhibition not found.") }, { status: 404 }),
    };
  if (access !== "manage")
    return {
      t,
      error: Response.json(
        { error: t("Your TYDAL role lets you look at this exhibition, not change it.") },
        { status: 403 },
      ),
    };
  if (exhibition.phase !== "setup")
    return {
      t,
      error: Response.json(
        {
          error: t(
            "Photographs can only be changed while the exhibition is being set up.",
          ),
        },
        { status: 409 },
      ),
    };
  return { t, exhibition };
}

export async function GET(_request: Request, { params }: Context) {
  const { id: idRaw, hash } = await params;
  const gate = await setupExhibition(Number(idRaw));
  if ("error" in gate) return gate.error;
  const { exhibition } = gate;
  const sent = await sentByAuthor(hash);
  // An author who withdrew consent: what AITY proposed is no longer used.
  const author = (await submittedBy([hash])).get(hash);
  if (!exhibition.suggestionsEnabled || (author && !author.aiConsentAt))
    return Response.json({ suggestion: null, sent });
  const suggestion = await photoSuggestion(exhibition, hash);
  return Response.json({ suggestion, sent });
}

export async function PATCH(request: Request, { params }: Context) {
  const { id: idRaw, hash } = await params;
  const id = Number(idRaw);
  const gate = await setupExhibition(id);
  if ("error" in gate) return gate.error;
  const { t, exhibition } = gate;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const details = await keepAuthor(hash, detailsFrom(body));
  if (missingFields(details).length)
    return Response.json(
      { error: t("Give the photograph at least a title and an author.") },
      { status: 400 },
    );

  const result = await updatePhotograph(exhibition, hash, details);
  if (!result.ok) {
    log.warn("update.refused", { exhibitionId: id, status: result.status });
    return Response.json({ error: t(result.error) }, { status: result.status });
  }
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id: idRaw, hash } = await params;
  const id = Number(idRaw);
  const gate = await setupExhibition(id);
  if ("error" in gate) return gate.error;
  const { t, exhibition } = gate;
  const result = await withdrawPhotograph(exhibition, hash);
  if (!result.ok) {
    log.warn("withdraw.refused", { exhibitionId: id, status: result.status });
    return Response.json({ error: t(result.error) }, { status: result.status });
  }
  await forgetSubmission(hash);
  return Response.json({ ok: true });
}
