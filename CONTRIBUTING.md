# Contributing to Full Frame

Thanks for your interest in Full Frame. Bug reports, fixes, translations and
improvements to accessibility and documentation are all welcome.

## Before you start

- For anything larger than a small fix, open an issue first so we can agree on
  the approach before you spend time on it.
- Security problems go through [SECURITY.md](SECURITY.md), not public issues.
- Full Frame is a client of TYDAL's vault boundary. Changes that need something
  new from TYDAL belong in the [TYDAL repository](https://github.com/eonity-org/tydal).

## Development setup

You need Node 20+ (or only Docker) and a running TYDAL instance with a gallery
vault. See [README.md](README.md) to run the app and [DEPLOY.md](DEPLOY.md) for
the environment variables.

```bash
cp .env.example .env    # set ADMIN_PASSWORD and FULLFRAME_ENCRYPTION_KEY
npm install
npm run dev             # http://localhost:3020
```

Without Node on the host, `./dev.sh` runs the same commands in a throwaway
`node:22` container.

## Pull requests

1. Branch from `develop` and open the pull request against `develop`.
2. Keep each pull request focused on one change.
3. Make sure these pass:

   ```bash
   npm test
   npm run typecheck
   npm run build
   ```

4. If you changed interface text, run `npm run i18n -- --write` and fill in
   the Spanish entries in `src/i18n/es.json` (see "Translations" in the README).
   `npm test` fails until the dictionary matches the code.
5. If you changed `db/schema.ts`, run `npm run db:generate` and commit the new
   migration under `drizzle/`. Never edit or delete existing migrations.

## License

By contributing, you agree that your contributions are licensed under the
[Apache License 2.0](LICENSE), the same license as the project.
