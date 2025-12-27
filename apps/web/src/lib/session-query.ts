import { authClient } from "@/lib/auth-client";

export const sessionQueryKey = ["auth", "session"] as const;

export const fetchSession = () => authClient.getSession();

export type SessionQueryResult = Awaited<ReturnType<typeof fetchSession>>;
