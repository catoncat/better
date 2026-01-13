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

## Troubleshooting
- `unable to open database file`: ensure `DATABASE_URL` points to a file path and the parent directory exists with correct permissions.
- `Both APP_TLS_CERT_PATH and APP_TLS_KEY_PATH must be set together`: set both or neither.
- `APP_WEB_MODE=embedded ... embedded assets are missing`: rebuild with `bun run build:single` before compiling/running the binary.
