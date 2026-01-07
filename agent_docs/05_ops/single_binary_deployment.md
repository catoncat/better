# Single-Binary Deployment

## Goal
- Build and run one Bun binary (web + API) with one SQLite file, exposed on HTTPS 443.

## When to Use
- When building the single-binary artifact for deployment.
- When configuring TLS and runtime environment variables.

## Build
```bash
bun install
bun run build:single
```
Output: `apps/server/better-app`

## TLS
Set:
- `APP_TLS_CERT_PATH=/etc/ssl/better-app/fullchain.pem`
- `APP_TLS_KEY_PATH=/etc/ssl/better-app/privkey.pem`

## Runtime Env (Example)
- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `PORT=443`
- `APP_URL=https://your-domain.example`
- `DATABASE_URL=file:/var/lib/better-app/`
- `APP_WEB_MODE=embedded` (default)

## Optional External Web Dir
- `APP_WEB_MODE=dir`
- `APP_WEB_DIR=/absolute/path/to/web/dist`

