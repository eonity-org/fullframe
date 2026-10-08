import "server-only";
import { createVaultConsumer, type VaultConsumer } from "@tydal/client";
import type { exhibitions } from "@db/schema";
import { decryptSecret } from "./crypto";
type Exhibition = typeof exhibitions.$inferSelect;
export function tydalBaseUrl(): string {
  return (process.env.TYDAL_BASE_URL || "").replace(/\/$/, "");
}
export function tydalLinkBaseUrl(): string {
  return (process.env.TYDAL_LINK_BASE_URL || tydalBaseUrl()).replace(/\/$/, "");
}
export function vaultBaseFor(exhibition: {
  vaultBaseUrl?: string | null;
}): string {
  const base = exhibition.vaultBaseUrl || tydalBaseUrl();
  if (!base) throw new Error("Connect this exhibition to a vault first.");
  return base;
}
export function vaultKeyFor(
  exhibition: Pick<Exhibition, "phase" | "visibility" | "readVaultKey">,
): string | undefined {
  // Public visitors get only the access TYDAL grants without a key. An
  // unlisted exhibition's vault stays private: FullFrame reads it with the key.
  if (exhibition.phase === "open" && exhibition.visibility !== "unlisted") return undefined;
  return decryptSecret(exhibition.readVaultKey) || undefined;
}
export function vaultFor(
  exhibition: Pick<
    Exhibition,
    "phase" | "visibility" | "readVaultKey"
  > & { vaultHash?: string | null; vaultBaseUrl?: string | null },
): VaultConsumer {
  if (!exhibition.vaultHash)
    throw new Error("Reconnect this exhibition using its shared vault URL.");
  return createVaultConsumer({
    baseUrl: vaultBaseFor(exhibition),
    vault: { hash: exhibition.vaultHash },
    key: vaultKeyFor(exhibition),
  });
}
export function writeConsumerFor(
  exhibition: Pick<Exhibition, "vaultHash" | "writeVaultKey"> & {
    vaultBaseUrl?: string | null;
  },
): VaultConsumer {
  if (!exhibition.vaultHash) throw new Error("Reconnect the vault first.");
  const key = decryptSecret(exhibition.writeVaultKey);
  if (!key)
    throw new Error("Add a write key in Connection settings to publish.");
  return createVaultConsumer({
    baseUrl: vaultBaseFor(exhibition),
    vault: { hash: exhibition.vaultHash },
    key,
  });
}
