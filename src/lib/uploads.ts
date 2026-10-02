import "server-only";
import { TydalApiError } from "@tydal/client";
import { vaultFor, writeConsumerFor } from "./tydal";
import { decryptSecret } from "./crypto";
import type { Exhibition } from "./exhibitions";
import { PHOTO_FIELDS, type PhotoDetails } from "./photoFields";
import { msg, msgv, type Message } from "@/i18n/core";

/**
 * Curator uploads — the vault's inbound ops `ingest` / `update` / `withdraw`
 * (TYDAL VAULT_WRITE_METHODS.md §3). The curator adds and corrects photographs
 * without a TYDAL account: the exhibition's write key carries the abilities,
 * TYDAL decides where the files land, and stores the details exactly as given.
 * Allowed only during setup, before jurors or visitors have seen the
 * collection. TYDAL is the only record of which photographs were added here
 * (the write probe's `ingested`), so FullFrame keeps no copy.
 */

export type UploadAccess =
  | "ready"
  | "not-setup"
  | "no-key"
  | "no-permission"
  | "unavailable";

/** Whether the studio can offer uploads now, and which photographs it may edit. */
export async function uploadAccess(exhibition: Exhibition): Promise<{
  access: UploadAccess;
  ingested: string[];
  /** The largest file TYDAL accepts, in bytes; null when it doesn't say. */
  maxUploadBytes: number | null;
}> {
  const none = { ingested: [], maxUploadBytes: null };
  if (exhibition.phase !== "setup") return { access: "not-setup", ...none };
  if (!exhibition.vaultHash || !decryptSecret(exhibition.writeVaultKey))
    return { access: "no-key", ...none };
  try {
    const caps = await writeConsumerFor(exhibition).writeCapabilities();
    const methods = caps.methods ?? [];
    const ready = ["ingest", "update", "withdraw"].every((m) => methods.includes(m));
    return {
      access: ready ? "ready" : "no-permission",
      ingested: ready ? (caps.ingested ?? []) : [],
      maxUploadBytes: ready ? (caps.max_upload_bytes ?? null) : null,
    };
  } catch {
    return { access: "unavailable", ...none };
  }
}

/** The details of photographs added here, read back from the vault. */
export async function photoDetails(
  exhibition: Exhibition,
  hashes: string[],
): Promise<Array<PhotoDetails & { hash: string }>> {
  const vault = vaultFor(exhibition);
  const read = await Promise.all(
    hashes.map(async (hash) => {
      try {
        const meta = await vault.resource(hash).meta();
        const details: PhotoDetails & { hash: string } = { hash };
        for (const { key } of PHOTO_FIELDS) {
          const value =
            key === "name"
              ? meta.name
              : key === "description"
                ? meta.description
                : meta.metadata?.[key];
          if (typeof value === "string" || typeof value === "number")
            details[key] = String(value);
        }
        return details;
      } catch {
        return null;
      }
    }),
  );
  return read.filter((d) => d !== null);
}

type Refusal = { ok: false; status: number; error: Message };

export async function ingestPhotograph(
  exhibition: Exhibition,
  image: File,
  details: PhotoDetails,
): Promise<{ ok: true; hash: string } | Refusal> {
  try {
    const response = await writeConsumerFor(exhibition).write("ingest", {
      image,
      metadata: details,
    });
    const hash = (response.result as { hash?: unknown } | undefined)?.hash;
    if (typeof hash !== "string")
      return {
        ok: false,
        status: 502,
        error: msgv("TYDAL did not confirm the photograph."),
      };
    return { ok: true, hash };
  } catch (error) {
    return { ok: false, ...refusal(error) };
  }
}

/**
 * Correct a photograph's details. Every field is sent: a blank optional one
 * goes as `null`, which TYDAL treats as "remove" — so clearing technique,
 * dimensions or description in the edit form deletes it. Title and author
 * can't be blanked (the routes require them; TYDAL also refuses a blank title).
 */
export async function updatePhotograph(
  exhibition: Exhibition,
  hash: string,
  details: PhotoDetails,
): Promise<{ ok: true } | Refusal> {
  const metadata = Object.fromEntries(
    PHOTO_FIELDS.map(({ key }) => [key, details[key] ?? null]),
  );
  try {
    await writeConsumerFor(exhibition).write("update", { resource: hash, metadata });
    return { ok: true };
  } catch (error) {
    return { ok: false, ...refusal(error) };
  }
}

export async function withdrawPhotograph(
  exhibition: Exhibition,
  hash: string,
): Promise<{ ok: true } | Refusal> {
  try {
    await writeConsumerFor(exhibition).write("withdraw", { resource: hash });
    return { ok: true };
  } catch (error) {
    return { ok: false, ...refusal(error) };
  }
}

/** A refused write, as a message the studio can show in its own language. */
function refusal(error: unknown): { status: number; error: Message } {
  if (error instanceof TydalApiError) {
    // A web server in front of TYDAL cut the upload off before TYDAL saw it.
    if (error.status === 413)
      return {
        status: 413,
        error: msgv("The file is larger than TYDAL accepts."),
      };
    if (error.status === 403 || error.status === 404)
      return {
        status: 403,
        error: msgv(
          "Your write key does not allow this. Add w:ingest, w:update and w:withdraw to it in TYDAL.",
        ),
      };
    const detail = (error.body as { error?: unknown } | undefined)?.error;
    if (typeof detail === "string")
      // TYDAL's reason is English; the studio frames it in the curator's language.
      return { status: 400, error: msgv("TYDAL refused it: {detail}", { detail }) };
  }
  return {
    status: 502,
    error: msgv("Could not reach TYDAL. Try again in a moment."),
  };
}

/** Why the studio can't offer uploads, for each case but `ready`. */
export const UPLOAD_ACCESS_NOTES: Record<Exclude<UploadAccess, "ready">, string> = {
  "not-setup": msg(
    "Photographs can be added while the exhibition is being set up, before the jury opens.",
  ),
  "no-key": msg(
    "Add a write key in Connection settings to add photographs from FullFrame.",
  ),
  "no-permission": msg(
    "Your write key does not allow this. Add w:ingest, w:update and w:withdraw to it in TYDAL.",
  ),
  unavailable: msg("Could not reach TYDAL. Try again in a moment."),
};
