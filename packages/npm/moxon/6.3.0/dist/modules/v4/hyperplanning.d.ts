import { type RemoteFetcher } from '../../utils/remote.js';
interface CalendarEvent {
    summary: string[] | string;
    subject?: string;
    teacher?: string;
    classes?: string[];
    type?: string;
    start: string;
    end: string;
}
/**
 * Fetches and parses an ICS calendar from a Hyperplanning URL, filtering out past events.
 *
 * @param url - HTTPS URL to the ICS calendar
 * @param detail - Level of detail: "full" (subject/teacher/classes), "list" (summary/times), or default (summary only)
 * @returns Array of calendar events sorted by start time, excluding past events
 * @throws Error if the URL is invalid, uses HTTP, points to a private host, or does not return a valid ICS file
 */
export default function hyperplanning(url: string, detail?: string): Promise<CalendarEvent[]>;
/**
 * Same as hyperplanning, with the remote fetch implementation passed in so tests can replace it.
 *
 * @param url - HTTPS URL to the ICS calendar
 * @param detail - Level of detail: "full" (subject/teacher/classes), "list" (summary/times), or default (summary only)
 * @param fetcher - Remote fetch implementation, fetchRemote in production
 * @returns Array of calendar events sorted by start time, excluding past events
 * @throws Error if the URL is invalid or internal, the file is too large or has too many events, or is not an ICS file
 */
export declare function fetchCalendar(url: string, detail: string | undefined, fetcher: RemoteFetcher): Promise<CalendarEvent[]>;
export {};
