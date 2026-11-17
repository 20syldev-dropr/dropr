import { type Express } from 'express';
/**
 * Applies the proxy setting, the security headers, CORS and the robots.txt route.
 *
 * The security headers come first so that every response carries them,
 * preflights and errors included. Body parsing is mounted separately by
 * setupParsers, after the rate limiter.
 *
 * @param app - Express application to configure
 */
export declare function setupCors(app: Express): void;
/**
 * Mounts the URL-encoded and JSON body parsers, both capped at 10 KB.
 *
 * @param app - Express application to configure
 */
export declare function setupParsers(app: Express): void;
