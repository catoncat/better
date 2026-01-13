# Single-Binary Deployment

## Goal
- Build and run one compiled Bun binary (web + API) backed by one SQLite database file.
- Support either built-in TLS (Bun) or a reverse proxy terminating TLS.

## When to Use
- When building the single-binary artifact for deployment.
- When configuring TLS and runtime environment variables.

## Build (From Repo Root)
```bash
bun install
bun run build:single
```
Output: `apps/server/better-app`

`bun run build:single` generates Prisma client, builds `apps/web`, embeds web assets into the server binary, then compiles the final artifact.

## Recommended Layout
- Binary: `/opt/better-app/better-app`
- DB file: `/var/lib/better-app/db.db`
- Optional runtime data:
  - audit archives: `/var/lib/better-app/audit-archives/`

## Required Runtime Env (Minimum)
- `NODE_ENV=production`
- `APP_URL=https://your-domain.example`
- `BETTER_AUTH_SECRET=<random>`
- `DATABASE_URL=file:/var/lib/better-app/db.db` (must be a **file path**, not a directory)
- `HOST=0.0.0.0`
- `PORT=443` (or use an HTTP port behind a reverse proxy)

## TLS (Built-In)
If you want the binary to serve HTTPS directly, set **both**:
- `APP_TLS_CERT_PATH=/etc/ssl/better-app/fullchain.pem`
- `APP_TLS_KEY_PATH=/etc/ssl/better-app/privkey.pem`

If only one is set, the server will refuse to start.

## Web Serving Modes
Default behavior:
- In production or when running as a compiled binary, web mode defaults to `embedded`.

Options:
- Embedded (default): `APP_WEB_MODE=embedded`
- Disable web serving (API only): `APP_WEB_MODE=off` (or CLI flag `--web-off`)
- Serve from directory: `APP_WEB_MODE=dir` + `APP_WEB_DIR=/absolute/path/to/web/dist` (or CLI arg `--web-dir=/absolute/path/to/web/dist`)

## Run
- `dotenv/config` is enabled in `apps/server/src/index.ts`, so you can either:
  - provide env vars via your process manager (systemd/Docker), or
  - place a `.env` file in the working directory and start the binary from that directory.
- Health check (API): `GET /api/health`

## SQLite Backup / Restore / Upgrade
This repo treats SQLite as a single DB file. Plan backups and upgrades around that file.

Backup (recommended: stop the service first):
- Identify DB path from `DATABASE_URL` (example: `/var/lib/better-app/db.db`).
- Stop the service, copy the DB file to a timestamped backup, then start the service.
- Ensure the service user has read/write permission to the DB file and its parent directory, and that the disk has enough free space for DB growth + backups.

Restore:
- Stop the service, replace the DB file with a known-good backup, then start the service.

Upgrade (migrations + binary):
- Always take a DB backup first.
- Apply Prisma migrations using the repo (requires Bun + deps on the host running migrations):
  - `DATABASE_URL=file:/var/lib/better-app/db.db bun run db:deploy`
- Replace the `better-app` binary and restart the service.
- Verify `GET /api/health` and a basic UI login.

## Logging and Audit
- Runtime logs:
  - The server logs to stdout/stderr (capture via systemd/journald, Docker logs, or your process manager).
  - `NODE_ENV=production` hides internal error details in HTTP responses, but errors are still logged server-side.
- Audit logs (event history):
  - API: `GET /api/audit-logs` (filters: `page/pageSize/actorId/entityType/entityId/action/status/from/to`)
  - API: `GET /api/audit-logs/:id`
  - UI (exploration): `GET /openapi` includes the `Audit Logs` endpoints for interactive querying.
- Optional audit archive cron:
  - Configure via `AUDIT_ARCHIVE_*` in `apps/server/.env.example` (`AUDIT_ARCHIVE_ENABLED`, retention, output dir).

## Troubleshooting
- `unable to open database file`: ensure `DATABASE_URL` points to a file path and the parent directory exists with correct permissions.
- `Both APP_TLS_CERT_PATH and APP_TLS_KEY_PATH must be set together`: set both or neither.
- `APP_WEB_MODE=embedded ... embedded assets are missing`: rebuild with `bun run build:single` before compiling/running the binary.
