---
name: backend-api-endpoint
description: "Implement a new backend API endpoint in apps/server (新增接口/API endpoint/后端接口/elysia). Use when adding or changing HTTP routes, controllers, services, schemas, audit logging, or idempotency in this repo."
---

# Backend API Endpoint

## Goal

Implement an endpoint with correct layering (routes vs service), envelopes, validation, and audit, while committing in small slices.

## Required Reference

- Read `agent_docs/03_backend/api_patterns.md` before coding.

## Workflow

0. Preflight:
   - Run `git status` and call out a dirty tree.
   - If the change is high-churn, recommend a worktree (`worktree-bootstrap`).
1. Confirm contract (short):
   - Method + path
   - Input schema (params/query/body)
   - Output shape + error codes
   - Idempotency requirement (header vs `eventId`)
   - Audit requirement (writes must log success + failure)
2. Implement in controller-service pattern:
   - `service.ts`: business logic returns `ServiceResult<T>`, no HTTP concerns.
   - `routes.ts`: auth/context/audit mapping + `{ ok, data/error }` envelope.
   - `schema.ts`: `Elysia.t` (TypeBox) validation + response schemas.
3. Commit checkpoints (do not wait for the end):
   - Slice 1: route + schema skeleton (`feat(server): add <entity> endpoint skeleton`)
   - Slice 2: service logic + transaction (`feat(server): implement <entity> service`)
   - Slice 3: audit + error mapping + polish (`fix(server): add audit/envelope for <entity>`)
4. Verify (in the merge worktree):
   - `bun scripts/smart-verify.ts` (doc-only skips; `--force` overrides)
