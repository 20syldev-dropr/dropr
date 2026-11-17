import { Router } from 'express';
import { type Endpoint } from './define.js';
/**
 * Builds the HTTP routes of the declared endpoints, with the required parameter check and the shared error format.
 * A version outside the `since` and `until` bounds of a contract answers 404, and a contract serves exactly the
 * method it declares: the answer to the other method stays with the routes written by hand.
 *
 * @param endpoints - Contracts to serve, each mounted under `/:version`
 * @returns Router to mount before the hand-written routes, so a declared endpoint takes precedence
 */
export declare function build(endpoints: Endpoint[]): Router;
