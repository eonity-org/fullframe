/**
 * Dev seed: one exhibition bound to the TYDAL-side demo vault
 * (FullFrameSeeder in the tydal repo: org `fullframe`, vault `first-frame`,
 * private, jury phase) with current appearance defaults and one overall score. Idempotent.
 *
 *   npm run db:seed
 */
import { eq } from 'drizzle-orm';
import { db, schema } from './index';
import { encryptSecret } from '../src/lib/crypto';
import { DEFAULT_APPEARANCE } from '../src/lib/appearance';

async function main() {
  const [exhibition] = await db
    .insert(schema.exhibitions)
    .values({
      slug: 'first-frame',
      title: 'First Frame',
      appearance: DEFAULT_APPEARANCE,
      vaultBaseUrl: process.env.TYDAL_BASE_URL || null,
      vaultUrl: process.env.DEV_VAULT_HASH && process.env.TYDAL_BASE_URL
        ? `${(process.env.TYDAL_LINK_BASE_URL || process.env.TYDAL_BASE_URL).replace(/\/$/, '')}/h/${process.env.DEV_VAULT_HASH}`
        : null,
      vaultHash: process.env.DEV_VAULT_HASH || null,
      // Per-exhibition vault credentials, from the keys the TYDAL FullFrameSeeder
      // minted (paste them into these env vars, or set them via the admin
      // binding form). Encrypted at rest; absent → null (edit the binding
      // later). encryptSecret needs FULLFRAME_ENCRYPTION_KEY only when a key is
      // actually present, so a keyless dev seed still runs.
      readVaultKey: encryptSecret(process.env.DEV_READ_VAULT_KEY),
      writeVaultKey: encryptSecret(process.env.DEV_WRITE_VAULT_KEY),
      phase: 'judging',
      // Plain prose — the welcome editor is a Title/Description form, and the
      // exhibition title is already the masthead.
      welcomeContent: [
        'Twenty-four photographs, six photographers, one wall.',
        'First Frame is the inaugural Full Frame exhibition — currently under',
        'jury evaluation ahead of the public opening.',
      ].join('\n'),
    })
    .onConflictDoNothing({ target: schema.exhibitions.slug })
    .returning();

  const ex =
    exhibition ??
    (await db.query.exhibitions.findFirst({
      where: eq(schema.exhibitions.slug, 'first-frame'),
    }))!;

  const existing = await db.query.criteria.findFirst({
    where: eq(schema.criteria.exhibitionId, ex.id),
  });

  if (!existing) {
    await db.insert(schema.criteria).values({
      exhibitionId: ex.id, name: 'Overall impression',
      scaleMax: 5, weight: 1, position: 0,
    });
  }

  console.log(`✓ Exhibition "${ex.title}" (${ex.slug}, phase: ${ex.phase}) with criteria seeded`);
}

void main();
