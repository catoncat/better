# Testing and Quality

## Goal
- Define baseline validation and change hygiene.

## When to Use
- Before committing or preparing a PR.

## Required Checks
- Type checking: `bun run check-types`
- Lint and format: `bun run lint:fix`

## Testing Notes
- No automated harness yet; use manual QA via `bun run dev`.
- If you add tests, colocate them near code (e.g., `foo.test.ts`).
- Keep tests deterministic and document fixtures if required.

## Commit and PR Notes
- Use clear, imperative commit subjects.
- PRs should include summary, linked issue (if any), affected areas, and verification steps.
- Mention schema changes and whether `db:migrate` or `db:deploy` is required.
