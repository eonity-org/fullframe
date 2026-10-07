/**
 * Exhibition and jury storage.
 *
 * TYDAL owns the works (resources, files, search); this database owns what
 * TYDAL deliberately does not: exhibitions as products (phase, theme, welcome
 * content) and the jury layer (jurors, votes, comments, criteria).
 *
 * Votes and comments key works by vault-issued hashes. Revoked references
 * are never silently reattached to a different photograph.
 */
import {
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
};

/**
 * setup → judging → selection → open; the bound vault stays private until
 * 'open'.
 *
 * `selection` is the curator's own step (review 3): judging is closed (the
 * jury freeze is `phase !== 'judging'`, so it happens by moving here) and the
 * ranking is settled before the opening is a question. It carries no vault
 * consequence — the exhibition is still private, exactly like `judging`.
 * Stored as free text in SQLite (no CHECK constraint), so adding a value
 * needs no migration.
 */
export const EXHIBITION_PHASES = [
  "setup",
  "judging",
  "selection",
  "open",
] as const;
export type ExhibitionPhase = (typeof EXHIBITION_PHASES)[number];

export const SUBMISSION_STATES = ["pending", "open", "closed"] as const;
export type SubmissionState = (typeof SUBMISSION_STATES)[number];

export const exhibitions = sqliteTable(
  "exhibitions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Unique within its organization: the address is `/{organizationSlug}/{slug}`. */
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    /** Editable one-line description shown as the public tagline. */
    subtitle: text("subtitle"),
    /**
     * The TYDAL organization the bound vault belongs to — learned from the
     * write-key check when the vault is connected, never chosen by hand. It
     * decides which curators reach the exhibition (src/lib/admin.ts); null means
     * installation admin only. The name is kept for display.
     */
    organizationId: text("organization_id"),
    organizationName: text("organization_name"),
    /**
     * The organization's slug, the first segment of the public address
     * (src/lib/paths.ts). Read from the vault's own description, so every
     * vault reports it, write key or not. Null only for an exhibition
     * connected before it was stored, until its old address resolves it.
     */
    organizationSlug: text("organization_slug"),
    /** Vault binding — machine hash and shared discovery URL. */
    vaultHash: text("vault_hash"),
    vaultUrl: text("vault_url"),
    vaultBaseUrl: text("vault_base_url"),
    appearance: text("appearance", { mode: "json" }).$type<
      import("../src/lib/appearance").Appearance
    >(),
    selectedHashes: text("selected_hashes", { mode: "json" }).$type<string[]>(),
    /**
     * Per-exhibition vault credentials, encrypted at rest (AES-256-GCM via
     * src/lib/crypto). Both are ciphertext — never plaintext, never sent to a
     * browser. `readVaultKey` (a `read` vault key) backs the jury proxy while the
     * vault is private; `writeVaultKey` (a `w:activate/open/close` key) authorizes
     * the opening. Replaces the former single global VAULT_KEY / service token
     * (VAULT_WRITE_METHODS.md §9).
     */
    readVaultKey: text("read_vault_key"),
    writeVaultKey: text("write_vault_key"),
    phase: text("phase", { enum: EXHIBITION_PHASES })
      .notNull()
      .default("setup"),
    /**
     * The submission period for invited authors (`authors`): `pending` until the
     * curator opens it or skips it, `open` while authors may send photographs,
     * `closed` once closed or skipped. Only honoured in `setup`; leaving setup
     * closes it.
     */
    submissions: text("submissions", { enum: SUBMISSION_STATES })
      .notNull()
      .default("pending"),
    /** How many photographs each invited author may send. */
    submissionLimit: integer("submission_limit").notNull().default(5),
    /** Whether invited authors must describe each photograph (curators never must). */
    descriptionRequired: integer("description_required", { mode: "boolean" })
      .notNull()
      .default(false),
    /**
     * Whether TYDAL's AITY proposes a title and description for the
     * photographs: the curator's own, and an invited author's only with that
     * author's consent. Fixed while submissions are open (the authors' form
     * depends on it).
     */
    suggestionsEnabled: integer("suggestions_enabled", { mode: "boolean" })
      .notNull()
      .default(false),
    /**
     * Data protection, for the notice every invited author accepts before
     * sending: who is responsible for the data (the organizer), where to
     * exercise rights, and anything else the organizer must say (the AI
     * service and where it runs, how long photographs are kept…). Required to
     * open submissions.
     */
    dataController: text("data_controller"),
    dataContact: text("data_contact"),
    privacyNotes: text("privacy_notes"),
    /**
     * The exhibition's language (`en` | `es`): its public pages and jury speak
     * it, since the curator writes the exhibition's own text in it. The studio
     * follows the curator's own language instead (src/i18n/server.ts).
     */
    locale: text("locale").notNull().default("en"),
    /** Admin-authored welcome description (plain text — paragraphs, no markdown). */
    welcomeContent: text("welcome_content"),
    /** Cover image for the welcome page — a vault-proxy preview path. */
    coverImage: text("cover_image"),
    /** Set by the opening flow once the TYDAL write-back has succeeded. */
    writebackAt: integer("writeback_at", { mode: "timestamp" }),
    /**
     * The immutable scoring record (final ranking + methodology), persisted at
     * the opening. FullFrame owns scoring, so this — not a TYDAL resource — is
     * the record: the exhibition is phase-frozen once open. Downloadable from
     * the admin. (Archiving into TYDAL would need a document-accepting
     * collection; the photo collection rejects JSON by design.)
     */
    scoringRecord: text("scoring_record", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
    openedAt: integer("opened_at", { mode: "timestamp" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("exhibitions_organization_slug").on(t.organizationSlug, t.slug),
  ],
);

export const criteria = sqliteTable("criteria", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  exhibitionId: integer("exhibition_id")
    .notNull()
    .references(() => exhibitions.id),
  name: text("name").notNull(),
  description: text("description"),
  /** Scores run 1..scaleMax. */
  scaleMax: integer("scale_max").notNull().default(5),
  weight: real("weight").notNull().default(1),
  position: integer("position").notNull().default(0),
  ...timestamps,
});

export const jurors = sqliteTable("jurors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  exhibitionId: integer("exhibition_id")
    .notNull()
    .references(() => exhibitions.id),
  name: text("name").notNull(),
  email: text("email"),
  /** sha256 of the personal URL token — the lookup key. */
  tokenHash: text("token_hash").notNull().unique(),
  /**
   * The raw token, kept so the admin can re-copy a juror's URL (they get
   * lost). A jury token is a low-stakes bearer link to a private vote form,
   * not a credential — re-displaying it to the authenticated admin is an
   * acceptable trade for the usability. Regenerating (revoke + re-mint) is
   * the stronger option if a link leaks.
   */
  token: text("token"),
  revokedAt: integer("revoked_at", { mode: "timestamp" }),
  ...timestamps,
});

export const votes = sqliteTable(
  "votes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    jurorId: integer("juror_id")
      .notNull()
      .references(() => jurors.id),
    criterionId: integer("criterion_id")
      .notNull()
      .references(() => criteria.id),
    /** Vault-issued machine reference. */
    resourceHash: text("resource_hash").notNull(),
    score: integer("score").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("votes_juror_work_criterion").on(
      t.jurorId,
      t.resourceHash,
      t.criterionId,
    ),
  ],
);

export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jurorId: integer("juror_id")
    .notNull()
    .references(() => jurors.id),
  resourceHash: text("resource_hash").notNull(),
  body: text("body").notNull(),
  ...timestamps,
});

/**
 * Invited authors. Each gets a personal `/e/{token}` link to send up to the
 * exhibition's `submissionLimit` photographs while submissions are open. The author's name is
 * fixed at invitation: every photograph sent through the link carries it, and
 * nobody — author or curator — can change it afterwards.
 */
export const authors = sqliteTable("authors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  exhibitionId: integer("exhibition_id")
    .notNull()
    .references(() => exhibitions.id),
  name: text("name").notNull(),
  /** sha256 of the personal URL token — the lookup key. */
  tokenHash: text("token_hash").notNull().unique(),
  /** The raw token, kept so the curator can re-copy the link (as for jurors). */
  token: text("token"),
  revokedAt: integer("revoked_at", { mode: "timestamp" }),
  /**
   * The author's record of consent: when they accepted the data protection
   * notice (required to send anything), and when they agreed to AI processing
   * (null: they didn't, or withdrew). `consentVersion` names the notice text
   * they saw (src/lib/consent.ts).
   */
  noticeAcceptedAt: integer("notice_accepted_at", { mode: "timestamp" }),
  aiConsentAt: integer("ai_consent_at", { mode: "timestamp" }),
  consentVersion: text("consent_version"),
  ...timestamps,
});

/** Which author sent which photograph (a vault-issued hash). */
export const submissions = sqliteTable("submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  authorId: integer("author_id")
    .notNull()
    .references(() => authors.id),
  resourceHash: text("resource_hash").notNull().unique(),
  /** Sent to TYDAL with `suggest` — the author had agreed to AI processing. */
  suggested: integer("suggested", { mode: "boolean" }).notNull().default(false),
  ...timestamps,
});
