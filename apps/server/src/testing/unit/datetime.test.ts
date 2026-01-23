import { describe, expect, test } from "bun:test";
import { diffInCalendarDays, endOfDayWithOffset, startOfDayWithOffset } from "../../utils/datetime";

describe("unit: datetime helpers", () => {
	test("start/end of day with offset (UTC+8)", () => {
		const offsetMinutes = 480;
		const input = new Date("2025-12-01T12:34:56.000Z");

		expect(new Date(startOfDayWithOffset(input, offsetMinutes)).toISOString()).toBe(
			"2025-11-30T16:00:00.000Z",
		);
		expect(new Date(endOfDayWithOffset(input, offsetMinutes)).toISOString()).toBe(
			"2025-12-01T15:59:59.999Z",
		);
	});

	test("diffInCalendarDays respects offset", () => {
		const offsetMinutes = 480;
		const a = new Date("2025-12-02T00:00:00.000Z");
		const b = new Date("2025-12-01T00:00:00.000Z");

		expect(diffInCalendarDays(a, b, offsetMinutes)).toBe(1);
	});
});

