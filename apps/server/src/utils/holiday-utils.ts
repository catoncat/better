/**
 * Chinese Holiday Utility
 *
 * Provides functions to calculate workdays by considering:
 * - Weekends (Saturday and Sunday)
 * - Chinese national holidays
 * - Makeup workdays (when weekends are shifted to weekdays)
 *
 * Holiday data is fetched from https://github.com/NateScarlet/holiday-cn
 * and cached for 5 days to minimize network requests.
 */

interface HolidayDay {
	name: string;
	date: string;
	isOffDay: boolean;
}

interface HolidayData {
	year: number;
	papers?: string[];
	days: HolidayDay[];
}

const CACHE_TTL_MS = 60 * 60 * 24 * 5 * 1000; // 5 days
const FETCH_TIMEOUT_MS = 6000;

// In-memory cache
const holidayCache = new Map<number, { data: HolidayData; fetchedAt: number }>();

const apiUrl = (year: number): string =>
	`https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/${year}.json`;

const toYMD = (d: Date): string => {
	const y = d.getFullYear();
	const m = `${d.getMonth() + 1}`.padStart(2, "0");
	const day = `${d.getDate()}`.padStart(2, "0");
	return `${y}-${m}-${day}`;
};

const isWeekend = (d: Date): boolean => {
	const w = d.getDay();
	return w === 0 || w === 6;
};

const getYearRange = (start: number, end: number): number[] => {
	const years: number[] = [];
	for (let y = start; y <= end; y++) {
		years.push(y);
	}
	return years;
};

const fetchWithTimeout = async <T>(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<T> => {
	const controller = new AbortController();
	const id = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const res = await fetch(url, { signal: controller.signal });
		if (!res.ok) {
			throw new Error(`HTTP ${res.status}`);
		}
		return (await res.json()) as T;
	} finally {
		clearTimeout(id);
	}
};

/**
 * Fetch holiday data for a specific year with 5-day cache
 * Falls back to empty days array if fetch fails (weekend-only mode)
 */
export const getHolidayData = async (year: number): Promise<HolidayData> => {
	const now = Date.now();

	// Check cache
	const cached = holidayCache.get(year);
	if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
		return cached.data;
	}

	try {
		const data = await fetchWithTimeout<HolidayData>(apiUrl(year));

		if (!data || typeof data.year !== "number" || !Array.isArray(data.days)) {
			throw new Error("Invalid holiday JSON structure");
		}

		holidayCache.set(year, { data, fetchedAt: now });
		return data;
	} catch (err) {
		console.error("[holiday-utils] getHolidayData failed:", err);
		return { year, days: [] };
	}
};

/**
 * Check if a given date is a workday
 *
 * Priority:
 * 1. If date is in holiday data with isOffDay: true => NOT a workday
 * 2. If date is in holiday data with isOffDay: false => IS a workday (makeup day)
 * 3. Otherwise, weekdays (Mon-Fri) are workdays, weekends are not
 */
export const isWorkDay = async (date: Date): Promise<boolean> => {
	const y = date.getFullYear();
	const data = await getHolidayData(y);
	const ds = toYMD(date);

	const rec = data.days.find((d) => d.date === ds);
	if (rec) {
		return !rec.isOffDay;
	}

	return !isWeekend(date);
};

/**
 * Calculate the number of workdays between two dates (inclusive)
 *
 * Handles multi-year ranges by fetching and merging holiday data
 * for all years in the range.
 *
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @returns Number of workdays
 */
export const calculateWorkDays = async (startDate: Date, endDate: Date): Promise<number> => {
	if (!startDate || !endDate) {
		return 0;
	}

	const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
	const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

	if (end < start) {
		return 0;
	}

	const years = getYearRange(start.getFullYear(), end.getFullYear());
	const datasets = await Promise.all(years.map((y) => getHolidayData(y)));

	const offDays = new Set<string>();
	const workOverrides = new Set<string>();

	for (const data of datasets) {
		for (const d of data.days) {
			if (d.isOffDay) {
				offDays.add(d.date);
			} else {
				workOverrides.add(d.date);
			}
		}
	}

	let count = 0;
	const cursor = new Date(start);

	while (cursor <= end) {
		const ds = toYMD(cursor);

		if (offDays.has(ds)) {
			// This is a holiday, not a workday
		} else if (workOverrides.has(ds)) {
			// This is a makeup workday (even if it's a weekend)
			count++;
		} else if (!isWeekend(cursor)) {
			// Regular weekday
			count++;
		}

		cursor.setDate(cursor.getDate() + 1);
	}

	return count;
};
