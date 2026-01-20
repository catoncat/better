# Login loading issue analysis

## Context
- User reports login button spins indefinitely; page only works after manual refresh and re-login.
- Need root cause analysis without code changes; ignore existing uncommitted changes.

## Decisions
- Focus on client-side login flow and session hydration/redirect logic first.
- Fix by using a single shared QueryClient for router context + React Query provider; always clear login loading state after sign-in attempt.

## Plan
- Inspect login form submit handler and auth client/session helpers.
- Trace route guards or authenticated layouts that might block navigation until session cache updates.
- Check server auth/session endpoints for timing/headers/cookie config.
- Apply fix: share QueryClient + clear login loading in finally.

## Findings
- `apps/web/src/components/login-form.tsx` sets `isLoading` true and only clears it on `onError` or catch; success path navigates but never resets `isLoading`.
- Login success depends on `authClient.signIn.email` invoking `onSuccess` and on `queryClient.fetchQuery` for `sessionQueryKey` before navigation.
- `authClient` uses `createAuthClient` with `baseURL` from `VITE_SERVER_URL` or empty string; no explicit client config beyond that.
- `apps/web/src/routes/_authenticated.tsx` uses `beforeLoad` to read cached `sessionQueryKey` and redirects to `/login` if cache exists but has no `session`; otherwise fetches session and redirects if empty.
- `apps/server/src/plugins/auth.ts` relies on `auth.api.getSession({ headers })`; auth depends on cookies/headers on each request.
- `packages/auth/src/index.ts` sets Better Auth `basePath: "/api/auth"` and `baseURL` from `APP_URL`/`BETTER_AUTH_URL`; cookie attributes are `sameSite: "lax"` unless base URL starts with `https`, in which case `sameSite: "none"` + `secure: true`.
- `better-auth` client uses `createFetch` with `credentials: "include"` when supported (`apps/web/node_modules/better-auth/dist/client/config.mjs`), so cookies should be sent on auth requests.
- Client session atom queries `/get-session` and uses a refresh manager (`apps/web/node_modules/better-auth/dist/client/session-atom.mjs`).
- Auth client proxy calls `options.onSuccess` then toggles session signal via `setTimeout(10)` for `/sign-in/email` and related paths (`apps/web/node_modules/better-auth/dist/client/proxy.mjs`), implying a small async delay before session refresh.
- Two `QueryClient` instances exist: `apps/web/src/main.tsx` uses `queryClient` from `apps/web/src/lib/query-client.ts` for router context, while `apps/web/src/routes/__root.tsx` creates its own `QueryClient` for React Query provider. This splits cache between route loaders and components.
- Router `defaultPendingComponent` is a global spinner (`apps/web/src/components/loader.tsx`), so a stuck `beforeLoad` or session fetch can present as “loading forever”.
- `_authenticated` index routes immediately redirect to `/mes/work-orders` (`apps/web/src/routes/_authenticated/index.tsx`, `apps/web/src/routes/_authenticated/mes/index.tsx`); no extra guard logic there.
- No explicit `/` route file found; routes include `/login` and `_authenticated/*` only (route tree likely maps root elsewhere).
- In `better-auth` dist client, `/sign-in/email` is only referenced in atom listeners (`config.mjs`); login uses dynamic proxy, no custom handler found.
- `apps/web/src/routeTree.gen.ts` maps `/` to `_authenticated/index`, so first visit to `/` always runs `_authenticated` `beforeLoad` and caches a “no session” result in the router-context query client.
- The login flow updates a *different* QueryClient than the router uses, leaving the router cache stuck at “no session”; `_authenticated` then short-circuits on the cached value and redirects back to `/login`, matching the observed `?redirect=...` URL.

## Progress
- Located login form and handlers.
- Found local package `packages/auth` likely defining server auth config; pending inspection.
- `packages/auth/src` contains `index.ts` and `resend.ts` (auth config likely in `index.ts`).
- `apps/web/node_modules` includes `better-auth`; can inspect client implementation for credential/cookie behavior.
- Initial search for `createAuthClient` in `apps/web/node_modules/better-auth` returned no matches; package appears minimal (README/license/package.json).
- `createAuthClient` implementation lives in `apps/web/node_modules/better-auth/dist/client/react/index.mjs` and delegates to `getClientConfig` (need to inspect `$fetch` defaults).
- Router setup located in `apps/web/src/main.tsx`; need to confirm router context uses same `queryClient` instance as login form.
- Updated `apps/web/src/routes/__root.tsx` to use shared `queryClient` from `apps/web/src/lib/query-client.ts`.
- Updated `apps/web/src/components/login-form.tsx` to always clear loading state in `finally`.
- Ran `bun scripts/smart-verify.ts` successfully (biome check + check-types + db generate).

## Errors
- Tried to open `apps/web/node_modules/@better-fetch/fetch/dist/index.mjs` but file does not exist; need to locate actual entrypoint before inspecting.
- `apps/web/node_modules/@better-fetch` and `apps/web/node_modules/better-auth/node_modules` are missing (dependencies likely bundled/hoisted differently).
- Could not locate `@better-fetch/fetch` package via file search under `node_modules`/`apps/web/node_modules`.

## Open Questions
- Does `authClient.signIn.email` resolve without triggering callbacks in some cases (e.g., missing cookies / blocked session)?
- Are there route guards that rely on `useSession` cache and could block navigation until a refresh?

## References
- `apps/web/src/components/login-form.tsx`
