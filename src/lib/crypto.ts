/**
 * At-rest encryption for the per-exhibition vault credentials. These are write-capable secrets living in Full
 * Frame's SQLite, so they are AES-256-GCM sealed with a key from the
 * environment and only ever decrypted server-side, at the moment of use.
 *
 * `server-only` is intentionally omitted (like migrate.ts): db/seed.ts runs
 * this under tsx, outside any bundler. The guard that matters is that callers
 * live in server modules — the ciphertext, not this helper, is what must never
 * reach a browser.
 *
 * Wire format: base64( iv[12] ‖ authTag[16] ‖ ciphertext ).
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const IV_LEN = 12;
const TAG_LEN = 16;

/**
 * The 32-byte master key, from `FULLFRAME_ENCRYPTION_KEY` (base64 or hex). A
 * dedicated var, not reused from any signing secret. Absent/short → hard error:
 * we never silently store a vault write key in the clear.
 */
function masterKey(): Buffer {
  const raw = process.env.FULLFRAME_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('FULLFRAME_ENCRYPTION_KEY is not set — cannot store vault credentials');
  }
  const key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('FULLFRAME_ENCRYPTION_KEY must decode to 32 bytes (256-bit)');
  }
  return key;
}

/** Seal a secret. Returns null for null/empty input, so optional fields stay optional. */
export function encryptSecret(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv('aes-256-gcm', masterKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

/** Open a sealed secret. Returns null for null/empty input; throws on tamper. */
export function decryptSecret(sealed: string | null | undefined): string | null {
  if (!sealed) return null;
  const buf = Buffer.from(sealed, 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv('aes-256-gcm', masterKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
