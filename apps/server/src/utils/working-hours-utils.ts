/**
 * Working Hours Calculation Utilities
 *
 * Calculates actual working hours between two timestamps,
 * considering:
 * - Working days (Mon-Fri, excluding holidays, including makeup workdays)
 * - Working hours per day (8:00-12:00, 13:00-17:00 = 8 hours)
 */

import { isWorkDay } from "./holiday-utils";

// Working hours configuration
const WORK_START_HOUR = 8;
const WORK_END_HOUR = 17;
const LUNCH_START_HOUR = 12;
const LUNCH_END_HOUR = 13;

/**
 * Get working hours for a specific date (8:00-12:00, 13:00-17:00)
 */
function getWorkingHoursForDay(date: Date): { start: Date; end: Date }[] {
	const morning = {
		start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), WORK_START_HOUR, 0, 0),
		end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), LUNCH_START_HOUR, 0, 0),
	};

	const afternoon = {
		start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), LUNCH_END_HOUR, 0, 0),
		end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), WORK_END_HOUR, 0, 0),
	};

	return [morning, afternoon];
}

/**
 * Calculate working hours between two timestamps
 *
 * @param startTime - Start timestamp (inclusive)
 * @param endTime - End timestamp (inclusive)
 * @returns Number of working hours (excluding weekends, holidays, and non-working hours)
 *
 * @example
 * // Friday 15:00 to Monday 10:00
 * calculateWorkingHours(
 *   new Date('2025-01-10T15:00:00+08:00'),
 *   new Date('2025-01-13T10:00:00+08:00')
 * )
 * // Returns: 2 + 2 = 4 hours
 * // Friday 15:00-17:00 (2h) + Monday 08:00-10:00 (2h)
 */
export async function calculateWorkingHours(startTime: Date, endTime: Date): Promise<number> {
	if (!startTime || !endTime || endTime <= startTime) {
		return 0;
	}

	let totalHours = 0;

	// Iterate through each day in the range
	const currentDate = new Date(startTime);
	currentDate.setHours(0, 0, 0, 0);

	const endDate = new Date(endTime);
	endDate.setHours(23, 59, 59, 999);

	while (currentDate <= endDate) {
		// Check if this is a working day
		const isWork = await isWorkDay(currentDate);

		if (isWork) {
			const workPeriods = getWorkingHoursForDay(currentDate);

			for (const period of workPeriods) {
				// Calculate overlap between work period and query time range
				const overlapStart = startTime > period.start ? startTime : period.start;
				const overlapEnd = endTime < period.end ? endTime : period.end;

				if (overlapStart < overlapEnd) {
					const hours = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60);
					totalHours += hours;
				}
			}
		}

		// Move to next day
		currentDate.setDate(currentDate.getDate() + 1);
	}

	return Math.round(totalHours * 10) / 10; // Round to 1 decimal
}

/**
 * Calculate deadline from a start time and required working hours
 *
 * @param startTime - Start timestamp
 * @param requiredHours - Required working hours
 * @returns Deadline timestamp
 *
 * @example
 * // Friday 15:00 + 4 working hours
 * calculateDeadline(
 *   new Date('2025-01-10T15:00:00+08:00'),
 *   4
 * )
 * // Returns: Monday 10:00
 * // Friday 15:00-17:00 (2h) + Monday 08:00-10:00 (2h)
 */
export async function calculateDeadline(startTime: Date, requiredHours: number): Promise<Date> {
	if (!startTime || requiredHours <= 0) {
		return startTime;
	}

	let remainingHours = requiredHours;
	const currentTime = new Date(startTime);

	// Iterate day by day until we accumulate enough working hours
	while (remainingHours > 0) {
		const currentDate = new Date(currentTime);
		currentDate.setHours(0, 0, 0, 0);

		const isWork = await isWorkDay(currentDate);

		if (isWork) {
			const workPeriods = getWorkingHoursForDay(currentDate);

			for (const period of workPeriods) {
				// If current time is before this work period, start from period start
				if (currentTime < period.start) {
					currentTime.setTime(period.start.getTime());
				}

				// If current time is within or before this period
				if (currentTime < period.end) {
					const availableHours = (period.end.getTime() - currentTime.getTime()) / (1000 * 60 * 60);

					if (remainingHours <= availableHours) {
						// We can finish within this period
						const finishTime = new Date(currentTime.getTime() + remainingHours * 60 * 60 * 1000);
						return finishTime;
					}
					// Use up this period and continue
					remainingHours -= availableHours;
					currentTime.setTime(period.end.getTime());
				}
			}
		}

		// Move to next day
		currentTime.setDate(currentTime.getDate() + 1);
		currentTime.setHours(0, 0, 0, 0);
	}

	return currentTime;
}

/**
 * Check if a task was completed on time based on working hours
 *
 * @param startTime - Task start time
 * @param completionTime - Actual completion time
 * @param timeLimit - Time limit in working hours
 * @returns true if completed on time
 */
export async function isCompletedOnTime(
	startTime: Date,
	completionTime: Date,
	timeLimit: number,
): Promise<boolean> {
	const actualHours = await calculateWorkingHours(startTime, completionTime);
	return actualHours <= timeLimit;
}
