# Deploying FullFrame

FullFrame is a single Next.js instance backed by one SQLite file. It targets
a small VM or container host — one process, one volume.

## Prerequisites

- A running **TYDAL** instance the server can reach.
- Per exhibition, a shared TYDAL `gallery` vault URL plus **vault keys** for
  it — a read key and a write key. The quickest way is TYDAL's own commands,
  which create everything and print the URL and both keys:

  ```bash
  php artisan exhibitions:setup --org=SLUG                 # once per organization
  php artisan exhibitions:create --org=SLUG --name="Name"  # once per exhibition
  ```

  Done by hand in TYDAL's admin instead, the keys need:
  - read key: `abilities: ["read"]` — the jury proxy.
  - write key: `abilities: ["w:activate", "w:open", "w:close"]` — the opening;
    add `"w:ingest", "w:update", "w:withdraw"` for curator uploads, which also
    need the vault's ingest target (`exposure_policy.ingest`) set in TYDAL.

  Paste the shared URL in the studio. Private reads need a read key; publishing
  and closing need a write key — the opening runs on the vault's own write key
  (TYDAL's VAULT_WRITE_METHODS.md), not an org token. Keys are stored encrypted
  per exhibition.

## Environment (the contract)

Copy `.env.example` → `.env`. Everything server-only; nothing is `NEXT_PUBLIC`.

**Local development on Docker** needs only two values: `FULLFRAME_ENCRYPTION_KEY`
and `ADMIN_PASSWORD` (without it the studio has no login, so you can't create an
exhibition). Every other default in `.env.example` already fits a TYDAL on
`http://localhost:8000` and FullFrame on `http://localhost:3020`. A production
deploy also sets `APP_URL` and the TYDAL URLs to its real origins, and should
set `SESSION_SECRET` to its own random value (`openssl rand -base64 32`).
Without it the cookie key is derived from `ADMIN_PASSWORD` with a published
prefix, so session cookies are only as strong as that password.

| Var                                                             | Purpose                                                                                                                                                                                                    |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TYDAL_BASE_URL`                                                | Optional server alias for the local TYDAL instance (no `/api/v1`). Shared URLs on other origins are used directly.                                                                                         |
| `TYDAL_LINK_BASE_URL`                                           | Public TYDAL prefix mapped to `TYDAL_BASE_URL` inside Docker; defaults to `TYDAL_BASE_URL`. Browser image reads use FullFrame’s `/api/vault` proxy.                                                       |
| `FULLFRAME_ENCRYPTION_KEY`                                      | **Required.** 32-byte key (base64 or hex) that encrypts each exhibition's vault keys at rest (AES-256-GCM). `openssl rand -base64 32`. Rotating it strands stored keys (re-enter them).                    |
| `DEV_VAULT_HASH` / `DEV_READ_VAULT_KEY` / `DEV_WRITE_VAULT_KEY` | Optional dev-seed convenience — the FullFrameSeeder prints these; `npm run db:seed` stores them on the `first-frame` exhibition. Not used in production (keys are entered per exhibition in the admin UI). |
| `ADMIN_PASSWORD`                                                | The **installation admin**'s password — sees and manages every exhibition. Curators sign in with their TYDAL account instead (needs `TYDAL_BASE_URL`). Unset ⇒ no installation admin; set `SESSION_SECRET` then. |
| `SESSION_SECRET`                                                | Optional explicit HMAC key for the admin + jury session cookies (defaults to a derivation of `ADMIN_PASSWORD`). Set it if you rotate the password without logging everyone out.                            |
| `APP_URL`                                                       | Public origin — juror URLs, sitemap, robots.txt. Unset ⇒ empty sitemap and relative juror links.                                                                                                           |
| `FULLFRAME_PORT`                                                | Host port compose publishes (default `3020`; the container always listens on 3020).                                                                                                                        |
| `PREVIEW_MODE`                                                  | Dev-only phase-gate bypass (`npm run dev`). **Must be `false`/unset in production**; compose pins it to `false`, so `.env` cannot enable it there.                                                          |
| `DATABASE_PATH`                                                 | SQLite path for `npm run dev` and the `db:*` scripts. Compose pins it to the volume (`/app/data/fullframe.sqlite`) and ignores `.env`.                                                                      |

## Organizations and sign-in

One FullFrame serves several TYDAL organizations. Curators sign into the
studio with their **TYDAL account**: TYDAL confirms who they are
(`POST /api/v1/auth/identify` — no token is kept) and which organizations they
belong to. Each exhibition belongs to its vault's organization, learned from the
write key when it is connected.

| TYDAL role in the organization | In the studio |
|---|---|
| owner, admin, editor | manage its exhibitions, connect new ones |
| viewer | read-only |
| platform admin (or `ADMIN_PASSWORD`) | every exhibition |

Give someone access with `php artisan exhibitions:create … --curator=email`
(or in TYDAL). Removing them in TYDAL takes effect at their next sign-in;
curator sessions last 12 hours.

## Run

```bash
docker compose up -d --build          # builds the image, exposes port 3020
```

The schema is applied automatically on boot (generated SQL migrations, run by
`db/index.ts` before it opens the app's connection) — a fresh volume is
ready with no manual step. After changing `db/schema.ts`, regenerate the
migration and rebuild:

```bash
npm run db:generate                   # commit the new drizzle/*.sql
docker compose up -d --build
```

Exhibitions are created in the backoffice at `/admin` (log in with
`ADMIN_PASSWORD`), not by a seed.

## Trying a production build locally

The production image runs fine on a laptop, next to a TYDAL on
`http://localhost:8000`. It uses the same multi-stage build as a real deploy:
a standalone Next.js server with `NODE_ENV=production`, a non-root user,
`PREVIEW_MODE` forced off, and a database volume that starts empty.

**Running it next to another FullFrame.** Docker Compose names a project
after its folder. A second clone in a folder also called `fullframe` joins the
same project: `docker compose up` replaces the running container and reuses its
database volume. It also competes for port 3020. Give the copy its own project
name with `-p` and its own `FULLFRAME_PORT`:

```bash
git clone git@github.com:eonity-org/fullframe.git fullframe-prodtest
cd fullframe-prodtest
cp .env.example .env
```

Fill in `.env` the way a production deploy would:

```bash
FULLFRAME_ENCRYPTION_KEY=...                  # openssl rand -base64 32
ADMIN_PASSWORD=...                            # a strong password
SESSION_SECRET=...                            # openssl rand -base64 32
APP_URL=http://localhost:3030
FULLFRAME_PORT=3030
TYDAL_BASE_URL=http://host.docker.internal:8000
TYDAL_LINK_BASE_URL=http://localhost:8000
```

```bash
docker compose -p fullframe-prodtest up -d --build
docker compose -p fullframe-prodtest logs -f    # wait for migrate.done and the Next.js ready line
```

Then go through the whole flow, as an operator would:

1. In TYDAL, create the exhibition's vault and keys:
   `php artisan exhibitions:create --org=SLUG --name="Name" --curator=EMAIL`
   (after `exhibitions:setup` once per organization).
2. Sign into `http://localhost:3030/admin`, paste the vault URL and the keys
   the command printed, and check the connection.
3. Mint a juror, open their link, and score a few photographs.
4. Select photographs, publish, and visit the public exhibition.
5. Close the exhibition.

Remove the copy and its data when you are done. This deletes only the
`fullframe-prodtest` project's volume:

```bash
docker compose -p fullframe-prodtest down -v
```

**How it differs from a real deployment:**

- **No TLS.** A real deploy puts HTTPS in front of the app with a reverse
  proxy. The studio and jury cookies don't set the `Secure` flag, so sign-in
  works over plain http here, and in production they rely on the proxy
  redirecting every request to HTTPS.
- **Local TYDAL.** A real deploy sets `TYDAL_BASE_URL` and
  `TYDAL_LINK_BASE_URL` to TYDAL's public origin and doesn't need
  `host.docker.internal`.
- **`APP_URL`** must be the public https origin, or juror links and the
  sitemap point at localhost.

## Running without Docker

FullFrame can run directly on a Linux server. It is the same standalone
build the Docker image uses, assembled by hand. You need **Node 20 or later**
(the image uses 22) and a C/C++ toolchain, because `better-sqlite3` compiles a
native addon.

```bash
# Once: build tools (Debian/Ubuntu)
sudo apt-get install -y python3 make g++

git clone https://github.com/eonity-org/fullframe.git /opt/fullframe
cd /opt/fullframe
git checkout main
```

**Build.** The build needs the dev dependencies and a database to exist before
Next.js's parallel page-data workers open it, so it runs the migrations against
a throwaway file first, as the Dockerfile does:

```bash
npm ci
export DATABASE_PATH=/tmp/fullframe-build.sqlite
npm run db:migrate && npm run build
unset DATABASE_PATH

# Assemble the runnable folder: the same copies the Dockerfile makes.
cp -r .next/static .next/standalone/.next/static
cp -r public       .next/standalone/public
cp -r drizzle      .next/standalone/drizzle
```

**Environment.** The standalone server doesn't copy `.env`, so keep the
settings in a file that systemd loads, `/etc/fullframe.env`, readable only by
root:

```bash
NODE_ENV=production
PORT=3020
HOSTNAME=127.0.0.1
DATABASE_PATH=/var/lib/fullframe/fullframe.sqlite
FULLFRAME_ENCRYPTION_KEY=...                  # openssl rand -base64 32
ADMIN_PASSWORD=...
SESSION_SECRET=...                            # openssl rand -base64 32
APP_URL=https://fullframe.example.org
TYDAL_BASE_URL=https://tydal.example.org
TYDAL_LINK_BASE_URL=https://tydal.example.org
# PREVIEW_MODE stays unset.
```

Set `HOSTNAME` explicitly: it is the address the server listens on, and Linux
shells often set it to the machine's own name. `127.0.0.1` keeps the app
reachable only through the reverse proxy.

**Service.** `/etc/systemd/system/fullframe.service`:

```ini
[Unit]
Description=FullFrame
After=network.target

[Service]
User=fullframe
WorkingDirectory=/opt/fullframe/.next/standalone
EnvironmentFile=/etc/fullframe.env
ExecStart=/usr/bin/node server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo useradd --system fullframe
sudo mkdir -p /var/lib/fullframe && sudo chown fullframe: /var/lib/fullframe
sudo chmod 600 /etc/fullframe.env
sudo systemctl enable --now fullframe
journalctl -u fullframe -f        # wait for migrate.done and the Next.js ready line
```

The schema is applied on first start, as with Docker. The migrations are read
from `./drizzle` relative to the working directory, which is why
`WorkingDirectory` points at the standalone folder.

**HTTPS.** Put a reverse proxy in front for TLS, and have it redirect every
http request to https (the session cookies rely on that). With Caddy:

```
fullframe.example.org {
    reverse_proxy 127.0.0.1:3020
}
```

**Updating.**

1. Back up the database. The online backup under [Backups](#backups) works
   here too: run the `node -e` part from `/opt/fullframe` with the path
   `/var/lib/fullframe/fullframe.sqlite`.
2. `git pull`, then repeat the build and assemble steps above.
3. `sudo systemctl restart fullframe`.

After upgrading Node itself, run `npm ci` again so `better-sqlite3` is
recompiled for the new version, then rebuild.

Compared with Docker, you manage the Node version and the toolchain, the data
lives in `/var/lib/fullframe` rather than a volume, and the `fullframe` system
user replaces the container's non-root user.

## Multi-exhibition

One instance hosts many exhibitions from many TYDAL organizations — routing
is path-based, each exhibition bound to its own vault in the backoffice. No
config per exhibition beyond creating it. (Host-based routing, if wanted, is
a reverse-proxy concern in front of the single app.)

| Address | Shows |
|---|---|
| `/` | every exhibition on view, from every organization |
| `/{organization}` | one organization's exhibitions on view |
| `/{organization}/{exhibition}[/album\|salon\|wall\|jury]` | one exhibition |

`{organization}` is the TYDAL organization's slug, read from the vault when
it's connected (and kept current when the connection is edited, so renaming
the organization in TYDAL moves the address). An exhibition slug is unique
within its organization. A vault from an organization whose slug is one of
FullFrame's own first path segments — `admin`, `api`, `e`, `j` and a few
files (`src/lib/paths.ts`) — is refused; rename the organization in TYDAL.

Addresses from before organizations were in the URL (`/{exhibition}/…`)
redirect permanently to the new ones while the exhibition slug is
unambiguous; an exhibition connected before then learns its organization's
slug from its vault on its first such visit.

## Backups

The whole state is `data/fullframe.sqlite` (votes, jurors, appearance, selection,
scoring records). Back it up with SQLite's online backup so a mid-write copy
is consistent:

```bash
docker compose exec -T fullframe node -e 'const Database = require("better-sqlite3"); const db = new Database("/app/data/fullframe.sqlite"); db.backup("/tmp/fullframe-backup.sqlite").then(() => db.close());'
docker compose cp fullframe:/tmp/fullframe-backup.sqlite ./fullframe-backup.sqlite
```

Copy the backup off-host on a schedule (cron/systemd timer). TYDAL holds the
images and the published selection independently — this DB is only Full
Frame's own layer.

## Logs & rate limits

The app emits structured JSON log lines (jury door misses/throttles, etc.).
Jury writes and the `/j/{token}` door are rate-limited in-memory (per juror /
per IP). Counters reset on restart — fine for a single instance; a
multi-instance deploy would move `rateLimit()` to shared storage.

## Security considerations

- **Curators can make the server fetch URLs.** Checking a vault connection
  fetches the pasted URL from the FullFrame server. Any signed-in curator can
  therefore make the server request an address of their choosing, including
  hosts on its internal network. Only give studio access to people you trust,
  and if the host can reach sensitive internal services, restrict its outbound
  traffic (firewall or egress proxy) to your TYDAL origins.
- **`PREVIEW_MODE` must stay off** in production; it bypasses the opening gate.
- **Back up `FULLFRAME_ENCRYPTION_KEY` separately** from the database: the key
  decrypts every stored vault key, so a backup holding both exposes them.

Report vulnerabilities as described in [SECURITY.md](SECURITY.md).

## Local Docker networking

For TYDAL at `http://localhost:8000`, set `TYDAL_LINK_BASE_URL=http://localhost:8000` and `TYDAL_BASE_URL=http://host.docker.internal:8000`. Paste the normal shared URL into FullFrame. The compose file maps `host.docker.internal` to the host gateway, so this also works on Linux. `APP_URL` is FullFrame's visitor-facing origin, typically `http://localhost:3020`; it does not set the listening port.

`FULLFRAME_ENCRYPTION_KEY` belongs to FullFrame, not to TYDAL's vault configuration. Back it up whenever you back up the database, because restoring stored credentials needs it, but store it separately (for example in a password manager) so a leaked database backup does not also leak the key.

## Schema migrations

Startup migrations bring any database — fresh or existing — to the current
schema, preserving exhibition settings, selections, credentials and jury
records. They replay the full migration history, so keep the `drizzle`
directory. Back up the database before rebuilding.
