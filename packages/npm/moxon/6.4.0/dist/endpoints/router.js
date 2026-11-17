import { Router } from 'express';
import { since } from '../utils/helpers.js';
import { error } from '../utils/response.js';
import { HttpError, Reply } from './define.js';
/**
 * Tells whether a parameter value counts as missing: an absent one, and with `required: true` an empty one too
 * (an empty string, 0 or false), as the handlers written by hand did.
 *
 * @param value - Value read from the query string or the body
 * @param required - Requirement of the parameter, when it has one
 * @returns True when the endpoint must answer that the parameter is missing
 */
function missing(value, required) {
    if (!required)
        return false;
    if (required === 'defined')
        return value === undefined || value === null;
    return !value;
}
/**
 * Builds the HTTP routes of the declared endpoints, with the required parameter check and the shared error format.
 * A version outside the `since` and `until` bounds of a contract answers 404, and a contract serves exactly the
 * method it declares: the answer to the other method stays with the routes written by hand.
 *
 * @param endpoints - Contracts to serve, each mounted under `/:version`
 * @returns Router to mount before the hand-written routes, so a declared endpoint takes precedence
 */
export function build(endpoints) {
    const router = Router();
    for (const endpoint of endpoints) {
        const served = (req) => (!endpoint.since || since(req.version, endpoint.since)) &&
            (!endpoint.until || !since(req.version, endpoint.until + 1));
        router[endpoint.method](`/:version${endpoint.path}`, (req, res) => {
            if (!served(req)) {
                error(res, 404, `Endpoint not available in ${req.version}.`);
                return;
            }
            const source = ((endpoint.method === 'get' ? req.query : req.body) ?? {});
            const values = {};
            for (const [name, param] of Object.entries(endpoint.params)) {
                const value = source[name];
                if (missing(value, param.required)) {
                    error(res, 400, param.missing ?? `Please provide a ${name}`);
                    return;
                }
                values[name] = value;
            }
            const respond = (result) => {
                if (result instanceof Reply)
                    res.status(result.status).jsonResponse(result.body);
                else
                    res.jsonResponse(result);
            };
            const refuse = (err) => error(res, err instanceof HttpError ? err.status : 400, err.message);
            // A synchronous run answers within the same tick, like the handlers written by hand did
            try {
                const result = endpoint.run(values, req);
                if (result instanceof Promise)
                    result.then(respond).catch(refuse);
                else
                    respond(result);
            }
            catch (err) {
                refuse(err);
            }
        });
    }
    return router;
}
//# sourceMappingURL=router.js.map