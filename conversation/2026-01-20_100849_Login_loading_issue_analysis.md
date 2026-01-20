# Login loading issue analysis

## Context
- User reports login button spins indefinitely; page only works after manual refresh and re-login.
- Need root cause analysis without code changes; ignore existing uncommitted changes.

## Decisions
- Focus on client-side login flow and session hydration/redirect logic first.

## Plan
- Inspect login form submit handler and auth client/session helpers.
- Trace route guards or authenticated layouts that might block navigation until session cache updates.
- Check server auth/session endpoints for timing/headers/cookie config.

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

## Progress
- Located login form and handlers.
- Found local package `packages/auth` likely defining server auth config; pending inspection.
- `packages/auth/src` contains `index.ts` and `resend.ts` (auth config likely in `index.ts`).
- `apps/web/node_modules` includes `better-auth`; can inspect client implementation for credential/cookie behavior.
- Initial search for `createAuthClient` in `apps/web/node_modules/better-auth` returned no matches; package appears minimal (README/license/package.json).
- `createAuthClient` implementation lives in `apps/web/node_modules/better-auth/dist/client/react/index.mjs` and delegates to `getClientConfig` (need to inspect `$fetch` defaults).

## Errors
- None.

## Open Questions
- Does `authClient.signIn.email` resolve without triggering callbacks in some cases (e.g., missing cookies / blocked session)?
- Are there route guards that rely on `useSession` cache and could block navigation until a refresh?

## References
- `apps/web/src/components/login-form.tsx`
