import { Router } from 'express';
import { env } from '../config/env.js';
import { versions } from '../config/versions.js';
import { chatStorage } from '../storage/index.js';
import { since } from '../utils/helpers.js';
import { error } from '../utils/response.js';
const router = Router();
const postOnly = (name) => (req, res) => {
    const available = versions[req.version]?.endpoints.post.some((e) => e.name === name);
    if (!available) {
        error(res, 404, `Endpoint not available in ${req.version}.`);
        return;
    }
    error(res, 405, 'This endpoint only supports POST requests.');
};
// Display version information
router.get('/:version', (req, res) => {
    const version = req.params.version;
    const versionConfig = versions[version];
    const endpoints = Object.keys(versionConfig.endpoints).reduce((acc, method) => {
        const endpointList = versionConfig.endpoints[method];
        if (!endpointList)
            return acc;
        acc[method] = endpointList
            .sort((a, b) => a.name.localeCompare(b.name))
            .reduce((group, endpoint) => {
            if (endpoint.children) {
                group[endpoint.name] = Object.keys(endpoint.children)
                    .sort((a, b) => a.localeCompare(b))
                    .reduce((childGroup, childName) => {
                    childGroup[childName] = `/${version}${endpoint.children[childName]}`;
                    return childGroup;
                }, {});
            }
            else {
                group[endpoint.name] = `/${version}${endpoint.path}`;
            }
            return group;
        }, {});
        return acc;
    }, {});
    res.jsonResponse({
        version,
        ...(env.DOCS_URL ? { documentation: `${env.DOCS_URL}/${version}` } : {}),
        endpoints,
    });
});
// GET asymmetric error
router.get('/:version/asymmetric', postOnly('asymmetric'));
// Generate an identicon or pixel-art avatar from a seed
router.get('/:version/avatar', (req, res) => {
    const avatarFn = req.module.avatar;
    if (!avatarFn) {
        error(res, 404, `Endpoint not available in ${req.version}.`);
        return;
    }
    const { seed, size, type, bg, format } = req.query;
    const parsedSize = size !== undefined ? parseInt(size, 10) : undefined;
    if (parsedSize !== undefined && isNaN(parsedSize)) {
        error(res, 400, 'Please provide a valid size (&size={50-2000})');
        return;
    }
    try {
        const { contentType, body } = avatarFn({
            seed: seed,
            size: parsedSize,
            type: type,
            bg: bg,
            format: format,
        });
        res.type(contentType).send(body);
    }
    catch (err) {
        error(res, 400, err.message);
    }
});
/**
 * Reads a plain decimal number from a query value, so hexadecimal and exponent forms are refused.
 *
 * @param value - Raw query value
 * @returns The number, NaN for anything that is not a plain decimal of at most three digits and two decimals, or
 * undefined when the parameter is absent
 */
function decimal(value) {
    if (value === undefined)
        return undefined;
    return typeof value === 'string' && /^\d{1,3}(\.\d{1,2})?$/.test(value) ? Number(value) : NaN;
}
// Generate a badge as an SVG image
router.get('/:version/badge', (req, res) => {
    const badgeFn = req.module.badge;
    if (!badgeFn) {
        error(res, 404, `Endpoint not available in ${req.version}.`);
        return;
    }
    const { label, icon, trail, start, end, ink, message, messageStart, messageEnd, messageInk } = req.query;
    const { border, size, font, weight, lift, radius, angle } = req.query;
    try {
        const { contentType, body } = badgeFn({
            label: label,
            icon: icon,
            trail: trail,
            start: start,
            end: end,
            ink: ink,
            message: message,
            messageStart: messageStart,
            messageEnd: messageEnd,
            messageInk: messageInk,
            border: border,
            size: size,
            font: font,
            weight: weight,
            lift: decimal(lift),
            radius: decimal(radius),
            angle: decimal(angle),
        });
        // The image only depends on the query string, so it can be cached by browsers and proxies alike
        res.set({
            'Cache-Control': 'public, max-age=86400',
            'Content-Security-Policy': "default-src 'none'",
        })
            .type(contentType)
            .send(body);
    }
    catch (err) {
        error(res, 400, err.message);
    }
});
// Generate a barcode image
router.get('/:version/barcode', (req, res) => {
    const barcodeFn = req.module.barcode;
    if (!barcodeFn) {
        error(res, 404, `Endpoint not available in ${req.version}.`);
        return;
    }
    const { data, type, width, height, format, color, bg } = req.query;
    if (!data) {
        error(res, 400, 'Please provide data to encode (?data={string})');
        return;
    }
    const parsedWidth = width !== undefined ? parseInt(width, 10) : undefined;
    const parsedHeight = height !== undefined ? parseInt(height, 10) : undefined;
    if ((parsedWidth !== undefined && isNaN(parsedWidth)) || (parsedHeight !== undefined && isNaN(parsedHeight))) {
        error(res, 400, 'Please provide valid dimensions (&width={px}&height={px})');
        return;
    }
    try {
        const { contentType, body } = barcodeFn({
            data: data,
            type: type,
            width: parsedWidth,
            height: parsedHeight,
            format: format,
            color: color,
            bg: bg,
        });
        res.type(contentType).send(body);
    }
    catch (err) {
        error(res, 400, err.message);
    }
});
// Generate captcha
router.get('/:version/captcha', (req, res) => {
    try {
        const mode = req.query.mode ?? (since(req.version, 6) ? 'challenge' : 'image');
        if (mode !== 'image' && mode !== 'challenge') {
            error(res, 400, 'Mode must be one of: image, challenge');
            return;
        }
        const challenge = mode === 'challenge';
        if (challenge && !since(req.version, 5)) {
            error(res, 404, `Challenge mode not available in ${req.version}.`);
            return;
        }
        if (challenge && req.query.text) {
            error(res, 400, 'A custom text cannot be used in challenge mode');
            return;
        }
        const options = {
            text: req.query.text,
            length: req.query.length ? Number(req.query.length) : undefined,
            width: req.query.width ? Number(req.query.width) : undefined,
            height: req.query.height ? Number(req.query.height) : undefined,
            noise: req.query.noise,
            bg: req.query.bg,
            color: req.query.color,
        };
        if (challenge) {
            const challengeFn = req.module
                .captchaChallenge;
            const result = challengeFn(options);
            res.set('X-Captcha-Token', result.token);
            res.type('png').send(result.body);
            return;
        }
        const captchaFn = req.module.captcha;
        const result = captchaFn(options);
        res.set('X-Captcha-Text', result.text);
        res.type('png').send(result.body);
    }
    catch (err) {
        error(res, 400, err.message);
    }
});
// GET chart error
router.get('/:version/chart', postOnly('chart'));
// Display stored data
router.get('/:version/chat', (req, res) => {
    try {
        const messages = req.module.chat('fetch', {
            username: `reader:${req.ip ?? 'unknown'}`,
            storage: chatStorage,
        });
        res.jsonResponse(messages);
    }
    catch (err) {
        error(res, 400, err.message);
    }
});
// GET private chat error
router.get('/:version/chat/private', postOnly('chat'));
// GET csv error
router.get('/:version/csv', postOnly('csv'));
// GET diff error
router.get('/:version/diff', postOnly('diff'));
// Hash a text, answered by the declared endpoint on POST
router.get('/:version/hash', postOnly('hash'));
// GET planning error
router.get('/:version/hyperplanning', postOnly('hyperplanning'));
// Display API informations
router.get('/:version/infos', (req, res) => {
    const endpoints = Object.values(versions[req.version].endpoints).flat();
    const paths = endpoints.flatMap((e) => (e.children ? Object.values(e.children) : e.path ? [e.path] : []));
    res.jsonResponse({
        endpoints: new Set(paths).size,
        last_version: Object.keys(versions).pop(),
        ...(env.DOCS_URL ? { documentation: env.DOCS_URL } : {}),
        ...(env.REPO_URL ? { github: env.REPO_URL } : {}),
        ...(env.INSTANCE_CREATED ? { creation: env.INSTANCE_CREATED } : {}),
    });
});
// GET jwt error
router.get('/:version/jwt', postOnly('jwt'));
// GET matrix error
router.get('/:version/matrix', postOnly('matrix'));
// GET otp error
router.get('/:version/otp', postOnly('otp'));
// Generate a placeholder image or skeleton
router.get('/:version/placeholder', (req, res) => {
    const { type = 'image' } = req.query;
    const { version } = req.params;
    const placeholder = req.module.placeholder;
    if (!placeholder) {
        error(res, 404, `Endpoint not available in ${version}.`);
        return;
    }
    try {
        const result = placeholder(type, req.query);
        res.type(result.contentType).send(result.body);
    }
    catch (err) {
        error(res, 400, err.message);
    }
});
// Generate QR Code
router.get('/:version/qrcode', async (req, res) => {
    const { url } = req.query;
    if (!url) {
        error(res, 400, 'Please provide a valid url (?url={URL})');
        return;
    }
    try {
        const qrcodeFn = req.module.qrcode;
        const result = await qrcodeFn({
            url: url,
            size: req.query.size ? Number(req.query.size) : undefined,
            margin: req.query.margin ? Number(req.query.margin) : undefined,
            correction: req.query.correction,
            dark: req.query.dark,
            light: req.query.light,
            icon: req.query.icon,
            iconSize: req.query.iconSize ? Number(req.query.iconSize) : undefined,
            iconPadding: req.query.iconPadding ? Number(req.query.iconPadding) : undefined,
            iconRadius: req.query.iconRadius ? Number(req.query.iconRadius) : undefined,
            format: req.query.format,
        });
        if (result.contentType === 'application/json') {
            res.jsonResponse(result.body);
        }
        else {
            res.type(result.contentType).send(result.body);
        }
    }
    catch (err) {
        error(res, 400, err.message);
    }
});
// GET read error
router.get('/:version/read', postOnly('read'));
// GET symmetric error
router.get('/:version/symmetric', postOnly('symmetric'));
// GET tic-tac-toe errors
router.get('/:version/tic-tac-toe', postOnly('tic_tac_toe'));
router.get('/:version/tic-tac-toe/fetch', postOnly('tic_tac_toe'));
router.get('/:version/tic-tac-toe/list', postOnly('tic_tac_toe'));
// GET token error
router.get('/:version/token', postOnly('token'));
export default router;
//# sourceMappingURL=get.js.map