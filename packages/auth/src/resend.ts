type ResendSendEmailPayload = {
	from: string;
	to: string[];
	subject: string;
	html: string;
	text?: string;
};

export async function resendSendEmail(payload: ResendSendEmailPayload) {
	const apiKey = process.env.RESEND_API_KEY;
	if (!apiKey) {
		throw new Error("RESEND_API_KEY is missing");
	}

	const response = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		const text = await response.text().catch(() => "");
		throw new Error(`Resend API error: ${response.status} ${response.statusText} ${text}`.trim());
	}

	return response.json().catch(() => null);
}
