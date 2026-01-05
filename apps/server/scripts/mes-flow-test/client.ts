import { expect } from "bun:test";

const API_URL = "http://127.0.0.1:3000/api";

export class ApiClient {
    private cookie: string = "";

    async login(email: string, password: string) {
        const res = await fetch(`${API_URL}/auth/sign-in/email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
            throw new Error(`Login failed: ${res.statusText}`);
        }

        this.cookie = res.headers.get("set-cookie") || "";
        console.log("Logged in successfully.");
    }

    async request(method: string, path: string, body?: any) {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "Cookie": this.cookie,
        };

        const res = await fetch(`${API_URL}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        const data = await res.json();
        return { ok: res.ok, status: res.status, data };
    }

    async get(path: string) {
        return this.request("GET", path);
    }

    async post(path: string, body?: any) {
        return this.request("POST", path, body);
    }

    async put(path: string, body?: any) {
        return this.request("PUT", path, body);
    }
}
