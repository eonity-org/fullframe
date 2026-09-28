/**
 * Dev seed: two jurors with deterministic votes for the demo exhibition.
 * Idempotent: the demo jurors are recognised by email on reruns. Tokens are
 * random, like the studio's, and each juror's link is printed. Reads the wall
 * through the vault boundary, using the read key stored on the exhibition
 * (needs FULLFRAME_ENCRYPTION_KEY to decrypt it).
 *
 *   npm run db:seed-jury
 */
import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, schema } from "./index";
import { createVaultConsumer } from "@tydal/client";
import { decryptSecret } from "../src/lib/crypto";

const DEMO_JURORS = [
  { name: "Marc Dupont", email: "marc@jury.test" },
  { name: "Keiko Ishii", email: "keiko@jury.test" },
];

/** Deterministic pseudo-score in 1..scaleMax from (juror, hash, criterion). */
function scoreFor(
  jurorName: string,
  hash: string,
  criterionId: number,
  scaleMax: number,
): number {
  const digest = createHash("sha256")
    .update(`${jurorName}:${hash}:${criterionId}`)
    .digest();
  return 1 + (digest[0] % scaleMax);
}

async function main() {
  const exhibition = await db.query.exhibitions.findFirst({
    where: eq(schema.exhibitions.slug, "first-frame"),
  });
  if (!exhibition) throw new Error("Seed the exhibition first (db:seed).");

  const criteria = await db.query.criteria.findMany({
    where: eq(schema.criteria.exhibitionId, exhibition.id),
  });

  const base = exhibition.vaultBaseUrl || process.env.TYDAL_BASE_URL;
  if (!base || !exhibition.vaultHash) throw new Error("Connect the demo vault first.");
  const vault = createVaultConsumer({
    baseUrl: base,
    vault: { hash: exhibition.vaultHash },
    key: decryptSecret(exhibition.readVaultKey) || undefined,
  });
  const hashes: string[] = [];
  for (let page = 1; ; page++) {
    const response = await vault.resources({ page, perPage: 100 });
    hashes.push(...response.resources.map((card) => card.id));
    if (!response.pagination.has_more) break;
  }

  const jurors = [
    ...(await db.query.jurors.findMany({
      where: eq(schema.jurors.exhibitionId, exhibition.id),
    })),
  ];

  for (const demo of DEMO_JURORS) {
    let juror = jurors.find((j) => j.email === demo.email);
    if (!juror) {
      // Same token shape as the studio's (src/lib/actions.ts).
      const token = randomBytes(24).toString("base64url");
      [juror] = await db
        .insert(schema.jurors)
        .values({
          exhibitionId: exhibition.id,
          name: demo.name,
          email: demo.email,
          tokenHash: createHash("sha256").update(token).digest("hex"),
          token,
        })
        .returning();
      jurors.push(juror);
    }
    console.log(`✓ Juror ${demo.name} — /j/${juror.token}`);
  }

  let cast = 0;
  for (const juror of jurors.filter((j) => !j.revokedAt)) {
    for (const hash of hashes) {
      for (const criterion of criteria) {
        const existing = await db.query.votes.findFirst({
          where: and(
            eq(schema.votes.jurorId, juror.id),
            eq(schema.votes.resourceHash, hash),
            eq(schema.votes.criterionId, criterion.id),
          ),
        });
        if (existing) continue; // never overwrite a real vote
        await db.insert(schema.votes).values({
          jurorId: juror.id,
          criterionId: criterion.id,
          resourceHash: hash,
          score: scoreFor(juror.name, hash, criterion.id, criterion.scaleMax),
        });
        cast++;
      }
    }
  }

  console.log(
    `✓ ${cast} votes cast across ${jurors.length} jurors × ${hashes.length} works`,
  );
}

void main();
