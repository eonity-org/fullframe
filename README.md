# Full Frame

**Full Frame turns TYDAL vaults into curated photography exhibitions.**

Photography exhibitions built on TYDAL. Full Frame presents photographs through a vault, with an optional jury and a small curator studio. TYDAL remains the repository of record for photographs, workspaces and vault membership.

## Run

```bash
cp .env.example .env
# Set ADMIN_PASSWORD and FULLFRAME_ENCRYPTION_KEY (openssl rand -base64 32).
docker compose up -d --build
```

For local development on Docker, those two are the only values to set — the other defaults in `.env.example` already point at a TYDAL on `http://localhost:8000`.

Curators sign into [the studio](http://localhost:3020/admin) with their TYDAL account and see their organizations' exhibitions (see DEPLOY.md). Open the studio, paste a shared TYDAL vault URL, and check the connection. A private vault needs its read key; publishing and closing need a write key with `w:activate`, `w:open` and `w:close`; adding and correcting photographs from the studio also needs `w:ingest`, `w:update` and `w:withdraw`. No seed, organization identifier or resource slug is needed. In TYDAL, `php artisan exhibitions:create --org=… --name="…"` makes that vault and its keys in one step (after `exhibitions:setup` once per organization).

See [DEPLOY.md](DEPLOY.md) for environment, backups and container networking, and [the exhibition guide](docs/GUIDE.md) for the curator and juror workflows.

## The experience

- **Addresses:** `/` lists every exhibition on view, `/{organization}` one TYDAL organization's, and an exhibition lives at `/{organization}/{exhibition}` (see DEPLOY.md, "Multi-exhibition").
- **Mosaic:** Google Photos–style rows with narrow gaps and titles on hover or keyboard focus. A dedicated visitor view at `/{organization}/{exhibition}/album`, with filtering. Photograph links in Mosaic and Gallery open Wall at the selected image; if Wall is disabled, photographs open in a lightbox instead.
- **Gallery:** uncropped photographs with visible captions, in flowing rows or uniform Grid cards. New exhibitions enter through Gallery by default.
- **Exhibitions:** coloured, image-led posters use the exhibition palette and chosen cover, with a lightweight preview fetched independently for each collection.
- **Wall:** one photograph at a time, with keyboard navigation, slideshow and optional details. The centered caption keeps a second line for credits and the details control; details expand subtly below the caption, with the image adjusting to the available height. Long metadata scrolls only within its allotted space. The counter and slideshow control share the same size and alignment. Work addresses use vault hashes.
- **About:** exhibition title, introduction and a chosen cover photograph.
- **Appearance:** choose the available visitor views (Mosaic, Gallery, Wall) and the default opened by “Enter the exhibition”. Disabled views redirect to that default. White Gallery, Dark Gallery or Editorial, independently paired with TYDAL's Blue, William, Plum, Graphite or Copper palette. Preview on the real gallery before applying. Studio and jury retain their own neutral interface.
- **Studio:** connection, adding photographs during setup (no TYDAL account needed), exhibition details, optional jury, appearance, manual selection and publishing. Jury scores can inform selection; they are not required.
- **Jury:** personal links, an overall impression score from 1 to 5 for new exhibitions, private notes and automatic saving. Existing criteria and votes are retained. Closing judging freezes edits.
- **Languages:** English and Spanish. Each exhibition has its own language, chosen when connecting (it defaults to the language TYDAL reports for the photographs' texts) and editable in its details; its public pages and jury use it, because the exhibition's own texts are written in it. The home page and the studio follow the viewer instead: their choice in the header, else the browser's language.

## Boundary and storage

The shared URL is the connection entry point. Full Frame resolves a human vault address once and stores its machine hash. Subsequent reads, image URLs, votes, notes and selections use vault-scoped hashes. Human resource slugs are labels, never machine identity; internal TYDAL identifiers and storage URLs are not a client contract.

The Next.js server calls TYDAL through `@tydal/client`. Browser reads use a local vault proxy; pre-opening access requires a curator or juror session. Read/write keys are encrypted in SQLite with Full Frame's own `FULLFRAME_ENCRYPTION_KEY`, never sent to the browser. Public exhibitions use TYDAL's anonymous access.

Publishing verifies the saved hashes against the current vault, calls `activate` and then `open`, and records the local opening only after both succeed. Closing calls `close`, which makes the vault private and restores its original workspace projection. Neither operation deletes photographs from TYDAL or Elasticsearch.

SQLite holds exhibition settings, jury invitations, votes, notes, selected hashes and scoring archives. Hash rotation changes machine identity: create a new exhibition for a replacement vault rather than silently reassigning votes by a human slug.

Gallery cards and contact sheets use TYDAL's advertised `medium` preview rendition
(800 px), falling back to `small` or `thumbnail` when needed. Wall, the lightbox,
the jury's full photograph and the welcome cover use `large` (1600 px), or the
designated original when that size is unavailable. Originals and stored cover
references remain unchanged. Full Frame proxies these vault-issued URLs; it
does not resize images itself or use internal storage links.

## Translations

The English text in the code is the translation key: `t("Save selection")`. English needs no file; `src/i18n/es.json` maps each English sentence to Spanish, and anything missing falls back to English. Placeholders are `{name}` (`t("View {name}", { name })`), plurals use `t.n(count, "{count} photograph", "{count} photographs")`, and `t.rich` places elements inside a sentence. Server components use `viewerT()` or `exhibitionT(exhibition)` from `src/i18n/server.ts`; client components use `useT()`. Text defined away from where it is shown (labels in a constant, library errors) is marked with `msg("…")` and translated where it is displayed.

Keys must be string literals so they can be found. After changing text, run `npm run i18n` to list missing, unused or mismatched entries, or `npm run i18n -- --write` to add missing keys (empty, to translate) and drop unused ones. `npm test` fails until the dictionary matches the code.

## Development and verification

Node 20+ or Docker is sufficient. The stack is Next.js App Router, React, TypeScript, Drizzle and SQLite.

```bash
npm test
npm run typecheck
npm run build
```

For Docker development, `docker compose -f compose.preview.yml up -d --build` starts an isolated database at `data/preview.sqlite` on port 3021. It never mounts the production data volume. To work with existing data, use the online backup procedure in DEPLOY.md and copy that backup to `data/preview.sqlite` before starting the preview.

```bash
docker compose -f compose.preview.yml exec -T preview npm test
docker compose -f compose.preview.yml exec -T preview npm run typecheck
docker compose -f compose.preview.yml exec -T preview npm run check:preview
docker compose -f compose.preview.yml exec -T preview node scripts/check-close.mjs
docker compose -f compose.preview.yml exec -T preview npx tsx scripts/check-binding.ts
```

The live preview checks expect a copied, open exhibition with at least two photographs and valid server credentials. They temporarily edit that copied exhibition and create a temporary juror, restoring those changes on completion. They read the connected TYDAL vault but do not publish to it. Publication failure tests use a local fake vault with dummy credentials.

`npm run db:seed` creates a demo exhibition, `first-frame`, and `npm run db:seed-jury` adds two demo jurors with sample votes to it and prints their jury links. Both are for local development; don't run them against a real deployment.

See [ROADMAP.md](ROADMAP.md) for the current development priorities.

## Contributing and security

Contributions are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md). Please report vulnerabilities privately as described in [SECURITY.md](SECURITY.md), not in public issues.

## License

Full Frame is licensed under the [Apache License 2.0](LICENSE). See [NOTICE](NOTICE) for attribution and trademark terms.
