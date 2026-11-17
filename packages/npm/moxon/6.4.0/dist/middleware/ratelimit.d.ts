import type { NextFunction, Request, Response } from 'express';
import type { IpLimits } from '../types/storage.js';
export interface RateLimiterOptions {
    now?: () => number;
    burst?: boolean;
    global?: number;
    limits?: IpLimits;
}
/**
 * Derives the key a client is rate limited under.
 *
 * An IPv4-mapped IPv6 address counts as its IPv4 form, so a dual-stack socket
 * and a proxy header naming the same caller share one quota. Any other IPv6
 * address counts as its /64 prefix, the block a single subscriber is usually
 * handed, so rotating addresses inside it does not reset the quota.
 *
 * @param ip - Client address as resolved by Express
 * @returns The IPv4 address, the IPv6 prefix, or the input unchanged when it is not an IP address
 */
export declare function clientKey(ip: string): string;
/**
 * Derives the IPv6 network a client belongs to, the largest block one subscriber is usually handed.
 *
 * @param ip - Client address as resolved by Express
 * @returns The /48 prefix of an IPv6 address, or null for IPv4, IPv4-mapped and non-IP input
 */
export declare function networkKey(ip: string): string | null;
/**
 * Drops the hourly counters left from past hours and the burst timestamps outside the window.
 *
 * @param limits - Hourly counters, keyed by client
 * @param bursts - Timestamps of recent requests, keyed by client
 * @param now - Current time in milliseconds
 * @param networks - Admitted requests per IPv6 network, with the epoch hour they were counted in
 */
export declare function sweep(limits: IpLimits, bursts: Map<string, number[]>, now: number, networks?: Map<string, {
    hour: number;
    count: number;
}>): void;
/**
 * Builds a rate limiting middleware with its own counters.
 *
 * A request is checked against the instance-wide hourly budget, then against
 * the burst window and the hourly quota of its plan for its client key, and an
 * IPv6 client also against a larger quota for its whole /48 network. Only a
 * request that passes every check uses the instance-wide and network budgets,
 * so a client being refused cannot exhaust them for everybody else. A forged
 * proxy header that is not an IP address counts as the socket peer instead.
 *
 * @param options - Clock, burst switch, instance-wide budget and hourly store, each with a production default
 * @returns An Express middleware enforcing the limits
 */
export declare function createRateLimiter(options?: RateLimiterOptions): (req: Request, res: Response, next: NextFunction) => void;
export declare const rateLimitMiddleware: (req: Request, res: Response, next: NextFunction) => void;
