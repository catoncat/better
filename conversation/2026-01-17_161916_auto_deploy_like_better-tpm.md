# Context
- User wants this repo to auto-deploy to server on push, like ~/lzb/better-tpm.

# Decisions
- None yet.

# Plan
- Inspect better-tpm deployment workflow and derive required secrets/steps.
- Compare with current repo build/deploy needs (build output, service name, target dir, env handling).

# Findings
- better-tpm has .github/workflows/deploy.yml triggered on push to main/test and workflow_dispatch.
- Build job uses bun, installs deps, runs `bun run build:single` with DATABASE_URL=file:./data/better-tpm.db, uploads apps/server/better-tpm as artifact.
- Deploy job uses appleboy ssh/scp actions with secrets VPS_HOST/VPS_USERNAME/VPS_SSH_KEY.
- Deploy path/service differ by branch: /opt/better-tpm or /opt/better-tpm-test; services better-tpm/better-tpm-test.
- Remote steps: stop systemd service, backup old binary, upload to /tmp, install to target dir, chmod, chown if user exists, restart systemd service.
- This repo already has .github/workflows/deploy.yml with the same structure, using better-app naming, paths (/opt/better-app*), and DATABASE_URL=file:./data/db.db; artifact path apps/server/better-app.

# Progress
- Read better-tpm deployment workflow.
- Read current repo deployment workflow.

# Errors
- None.

# Open Questions
- What build output/binary name should this repo deploy?
- What systemd service name and target install dir should be used?
- Which branches should trigger deploy?
- How should env/config/data be managed on the server for this repo?

# References
- /Users/envvar/lzb/better-tpm/.github/workflows/deploy.yml
