const MS_PER_DAY = 86_400_000;

const parseOffsetFromTzName = (tzName: string) => {
	// Typically like "GMT+8", "GMT-05", "UTC+08", "UTC-08:30"
	const match = tzName.match(/(GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?/i);
	if (!match) return null;
	const [, , sign, hh, mm] = match;
	const minutes = Number(hh) * 60 + (mm ? Number(mm) : 0);
	return sign === "-" ? -minutes : minutes;
};

const offsetFromIana = (timeZone: string, reference: Date = new Date()) => {
	let parts: Intl.DateTimeFormatPart[];
	try {
		parts = new Intl.DateTimeFormat("en-US", {
			timeZone,
			timeZoneName: "short",
		}).formatToParts(reference);
	} catch (_error) {
		throw new Error(`Invalid IANA timezone: ${timeZone}`);
	}
	const tzName = parts.find((p) => p.type === "timeZoneName")?.value;
	if (!tzName) throw new Error(`Unable to determine offset for timezone: ${timeZone}`);
	const offset = parseOffsetFromTzName(tzName);
	if (offset === null || Number.isNaN(offset)) {
		throw new Error(`Unable to parse timezone offset from: ${tzName} (${timeZone})`);
	}
	return offset;
};

/** Default timezone if APP_TIMEZONE not configured */
const DEFAULT_TIMEZONE = "Asia/Shanghai";

/**
 * Get the IANA timezone string from environment.
 * Returns APP_TIMEZONE if set, otherwise falls back to DEFAULT_TIMEZONE.
 */
export const getTimezoneIana = (): string => {
	const envIana = process.env.APP_TIMEZONE;
	if (envIana && envIana.trim() !== "") {
		return envIana.trim();
	}
	return DEFAULT_TIMEZONE;
};

/**
 * Get timezone offset in minutes east of UTC.
 * Calculated from APP_TIMEZONE (IANA format).
 */
export const getTimezoneOffsetMinutes = () => {
	return offsetFromIana(getTimezoneIana());
};

export const startOfDayWithOffset = (date: Date, offsetMinutes: number) => {
	const offsetMs = offsetMinutes * 60_000;
	const shifted = date.getTime() + offsetMs;
	const startOfLocalDay = Math.floor(shifted / MS_PER_DAY) * MS_PER_DAY;
	return startOfLocalDay - offsetMs;
};

export const diffInCalendarDays = (
	a: Date,
	b: Date,
	offsetMinutes = getTimezoneOffsetMinutes(),
) => {
	const startA = startOfDayWithOffset(a, offsetMinutes);
	const startB = startOfDayWithOffset(b, offsetMinutes);
	return Math.floor((startA - startB) / MS_PER_DAY);
};

/**
 * Get the end of day (23:59:59.999) for a given date in the configured timezone.
 */
export const endOfDayWithOffset = (date: Date, offsetMinutes: number) => {
	const startOfDay = startOfDayWithOffset(date, offsetMinutes);
	return startOfDay + MS_PER_DAY - 1; // 23:59:59.999
};

/**
 * Parse date range from query parameters with proper timezone handling.
 *
 * This ensures that date boundaries are calculated in the configured timezone,
 * not the server's local timezone.
 *
 * @param startDateStr - ISO date string or undefined
 * @param endDateStr - ISO date string or undefined
 * @param defaultDays - Default number of days if no dates provided
 * @param offsetMinutes - Timezone offset in minutes east of UTC
 * @returns { startDate, endDate } as Date objects (UTC timestamps)
 *
 * Example:
 * - Input: startDate="2025-12-01", endDate="2025-12-10", offset=480 (UTC+8)
 * - Output: startDate=2025-11-30T16:00:00Z (start of 12-01 in UTC+8)
 *           endDate=2025-12-10T15:59:59.999Z (end of 12-10 in UTC+8)
 */
export const parseDateRangeWithOffset = (
	startDateStr: string | undefined,
	endDateStr: string | undefined,
	defaultDays: number,
	offsetMinutes: number,
): { startDate: Date; endDate: Date } => {
	const now = new Date();

	// Parse end date
	let endDate: Date;
	if (endDateStr) {
		// Parse as date-only (YYYY-MM-DD) or full ISO string
		const parsed = new Date(endDateStr);
		// Get end of that day in the target timezone
		endDate = new Date(endOfDayWithOffset(parsed, offsetMinutes));
	} else {
		// Default to end of today
		endDate = new Date(endOfDayWithOffset(now, offsetMinutes));
	}

	// Parse start date
	let startDate: Date;
	if (startDateStr) {
		const parsed = new Date(startDateStr);
		// Get start of that day in the target timezone
		startDate = new Date(startOfDayWithOffset(parsed, offsetMinutes));
	} else {
		// Default to defaultDays ago
		const defaultStart = new Date(endDate.getTime() - defaultDays * MS_PER_DAY);
		startDate = new Date(startOfDayWithOffset(defaultStart, offsetMinutes));
	}

	return { startDate, endDate };
};

/**
 * Calculate the previous period for trend comparison.
 *
 * @param startDate - Current period start (UTC timestamp)
 * @param endDate - Current period end (UTC timestamp)
 * @param offsetMinutes - Timezone offset
 * @returns Previous period with same duration, ending just before current period starts
 */
export const getPreviousPeriod = (
	startDate: Date,
	endDate: Date,
	offsetMinutes: number,
): { prevStartDate: Date; prevEndDate: Date } => {
	const periodDuration = endDate.getTime() - startDate.getTime();

	// Previous period ends 1ms before the current period starts
	const prevEndTimestamp = startOfDayWithOffset(startDate, offsetMinutes) - 1;
	const prevEndDate = new Date(prevEndTimestamp);

	// Previous period starts at the same time offset
	const prevStartTimestamp = prevEndTimestamp - periodDuration + 1;
	const prevStartDate = new Date(startOfDayWithOffset(new Date(prevStartTimestamp), offsetMinutes));

	return { prevStartDate, prevEndDate };
};
