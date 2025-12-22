// Production: relative /api via Caddy; Dev: /api via Vite proxy; VITE_SERVER_URL for override
const BASE_URL = import.meta.env.VITE_SERVER_URL
	? `${import.meta.env.VITE_SERVER_URL.replace(/\/$/, "")}/api`
	: "/api";

export async function fetchClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
	const url = `${BASE_URL}${endpoint}`;
	const headers = {
		"Content-Type": "application/json",
		...options.headers,
	};

	const response = await fetch(url, {
		...options,
		headers,
		// Include credentials to send cookies (for authentication)
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw new Error(error.message || "An error occurred while fetching data");
	}

	return response.json();
}
