import type { CronResult } from '../v4/cron.js';
/**
 * Parses a cron expression and returns the next scheduled execution dates.
 *
 * @param expr - Cron expression with 5 space-separated fields (minute hour dom month dow)
 * @param count - Number of next executions to return (1-20, default 5)
 * @param from - Starting date in ISO 8601 format (defaults to now)
 * @param timezone - Timezone to evaluate the expression in (default "UTC")
 * @returns Parsed expression with description and list of next execution timestamps
 * @throws Error if the expression is invalid, count is out of range, or timezone is unsupported
 */
export default function cron(expr: string, count?: number, from?: string, timezone?: string): CronResult;
/**
 * Runs the cron search and also tells whether it listed every date the schedule will ever have.
 *
 * @param expr - Cron expression with 5 space-separated fields (minute hour dom month dow)
 * @param count - Number of next executions to look for (1-20)
 * @param from - Starting date in ISO 8601 format (defaults to now)
 * @param timezone - Timezone to evaluate the expression in
 * @returns The cron result, and complete set when fewer than count dates exist after from
 * @throws Error if the expression is invalid, count is out of range, or timezone is unsupported
 */
export declare function cronSearch(expr: string, count: number, from: string | undefined, timezone: string): {
    result: CronResult;
    complete: boolean;
};
