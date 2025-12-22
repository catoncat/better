import { auth } from "@better-app/auth";
import { Elysia } from "elysia";

class UnauthorizedError extends Error {
	constructor() {
		super("Unauthorized");
		this.name = "UNAUTHORIZED";
	}
}

// Better-Auth integration following official guide
// https://elysiajs.com/integrations/better-auth.md
export const authPlugin = new Elysia({
	name: "better-auth",
})
	.decorate("auth", auth)
	.error({
		UNAUTHORIZED: UnauthorizedError,
	})
	.macro({
		isAuth: {
			async resolve({ request: { headers } }) {
				const session = await auth.api.getSession({
					headers,
				});

				if (!session) {
					throw new UnauthorizedError();
				}

				return {
					user: session.user,
					session: session.session,
				};
			},
		},
	})
	.onError(({ code, set }) => {
		if (code === "UNAUTHORIZED") {
			set.status = 401;
			return {
				code: "UNAUTHORIZED",
				message: "Unauthorized",
			};
		}
	});
