import "server-only";
import { vaultFor, writeConsumerFor } from "./tydal";
import type { Exhibition } from "./exhibitions";
import { msg, msgv, type Message } from "@/i18n/core";

// Messages are English translation keys; the calling action translates them.
export interface OpeningPlan {
  errors: string[];
  vaultHash: string | null;
  resolved: Array<{
    reference: string;
    hash: string | null;
    name: string | null;
  }>;
}
export async function planOpening(
  exhibition: Exhibition,
  selectedHashes: string[],
): Promise<OpeningPlan> {
  const plan: OpeningPlan = {
    errors: [],
    vaultHash: exhibition.vaultHash,
    resolved: [],
  };
  try {
    const read = vaultFor(exhibition);
    const cards = new Map<string, { name: string }>();
    for (let page = 1; ; page++) {
      if (page > 100)
        throw new Error(
          msg("Too many photographs to publish in one exhibition."),
        );
      const response = await read.resources({ page, perPage: 100 });
      for (const c of response.resources) cards.set(c.id, c);
      if (!response.pagination.has_more) break;
    }
    for (const hash of new Set(selectedHashes)) {
      const card = cards.get(hash);
      plan.resolved.push({
        reference: hash,
        hash: card ? hash : null,
        name: card?.name || null,
      });
      if (!card)
        plan.errors.push(
          msg(
            "A selected photograph is no longer available. Reload the selection.",
          ),
        );
    }
  } catch {
    plan.errors.push(
      msg("Could not read the vault. Check the connection before publishing."),
    );
  }
  return plan;
}
export async function executeOpening(
  exhibition: Exhibition,
  selectedHashes: string[],
): Promise<{ ok: boolean; errors: string[]; activated?: number }> {
  const plan = await planOpening(exhibition, selectedHashes);
  if (plan.errors.length) return { ok: false, errors: plan.errors };
  const hashes = plan.resolved.flatMap((r) => (r.hash ? [r.hash] : []));
  if (!hashes.length)
    return { ok: false, errors: [msg("Select at least one photograph.")] };
  if (!exhibition.writeVaultKey)
    return {
      ok: false,
      errors: [
        msg(
          "Add a write key in Connection settings to publish this exhibition.",
        ),
      ],
    };
  let activated = false;
  try {
    const write = writeConsumerFor(exhibition);
    await write.write("activate", { resources: hashes });
    activated = true;
    await write.write("open");
    return { ok: true, errors: [], activated: hashes.length };
  } catch {
    return {
      ok: false,
      errors: [
        activated
          ? msg(
              "The selection was saved in TYDAL, but publication failed. Retry publishing to finish.",
            )
          : msg(
              "TYDAL could not activate the selection. Check the write key and try again.",
            ),
      ],
    };
  }
}
/**
 * Close the vault. On failure `detail` says what TYDAL actually answered —
 * the admin needs it to tell a vault that is gone from a misconfigured URL
 * or a TYDAL that is briefly down; FullFrame cannot tell them apart.
 */
export async function reverseOpening(
  exhibition: Exhibition,
): Promise<{ ok: boolean; errors: string[]; detail?: Message }> {
  try {
    await writeConsumerFor(exhibition).write("close");
    return { ok: true, errors: [] };
  } catch (e) {
    const status = (e as { status?: unknown }).status;
    const message = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      errors: [
        msg(
          "Could not close the vault. Check the write key before trying again.",
        ),
      ],
      detail:
        typeof status === "number" && status > 0
          ? msgv("TYDAL answered {status}: {message}", { status, message })
          : msgv("TYDAL could not be reached: {message}", { message }),
    };
  }
}
