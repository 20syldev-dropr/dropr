import { Router } from 'express';
import { challengeStorage, chatStorage, ticTacToeStorage } from '../storage/index.js';
import { since } from '../utils/helpers.js';
import { error } from '../utils/response.js';
const router = Router();
// Verify a captcha answer against its token
router.post('/:version/captcha', (req, res) => {
    const body = req.body || {};
    const { token, answer, minLength } = body;
    const { version } = req.params;
    const verifyFn = req.module.verifyCaptcha;
    if (!verifyFn) {
        error(res, 404, `Endpoint not available in ${version}.`);
        return;
    }
    if (!token || typeof token !== 'string') {
        error(res, 400, 'Please provide a token (?token={token})');
        return;
    }
    if (!answer || typeof answer !== 'string') {
        error(res, 400, 'Please provide an answer (&answer={answer})');
        return;
    }
    const min = minLength === undefined ? undefined : Number(minLength);
    if (min !== undefined && (!Number.isInteger(min) || min < 1)) {
        error(res, 400, 'Please provide a valid minimum length (&minLength={number})');
        return;
    }
    try {
        res.jsonResponse(verifyFn(token, answer, challengeStorage, min));
    }
    catch (err) {
        error(res, 400, err.message);
    }
});
// Generate a chart as SVG
router.post('/:version/chart', (req, res) => {
    const body = req.body || {};
    const { type, data, title, width, height, colors, bg, legend, mode } = body;
    const { version } = req.params;
    const chartMod = req.module.chart;
    if (!chartMod) {
        error(res, 404, `Endpoint not available in ${version}.`);
        return;
    }
    if (!type || typeof type !== 'string' || !Object.hasOwn(chartMod, type)) {
        error(res, 400, 'Please provide a valid chart type (?type=bar|line|pie|donut)');
        return;
    }
    try {
        const output = chartMod[type](data, { title, width, height, colors, bg, legend, mode });
        if (output.contentType === 'application/json') {
            res.jsonResponse(output.body);
        }
        else {
            res.type(output.contentType).send(output.body);
        }
    }
    catch (err) {
        error(res, 400, err.message);
    }
});
// Store chat messages
router.post('/:version/chat', (req, res) => {
    const { username, message, timestamp, session, token } = req.body || {};
    if (!username) {
        error(res, 400, 'Please provide a username (?username={username})');
        return;
    }
    if (!message) {
        error(res, 400, 'Please provide a message (&message={message})');
        return;
    }
    if (!session) {
        error(res, 400, 'Please provide a valid session ID (&session={ID})');
        return;
    }
    try {
        const result = req.module.chat('message', {
            username,
            message,
            timestamp,
            session,
            token,
            storage: chatStorage,
        });
        res.jsonResponse(result);
    }
    catch (err) {
        error(res, 400, err.message);
    }
});
// Clear a private chat
router.post('/:version/chat/clear', (req, res) => {
    const { username, session, token } = req.body || {};
    const { version } = req.params;
    if (!since(req.version, 6)) {
        error(res, 404, `Endpoint not available in ${version}.`);
        return;
    }
    if (!username) {
        error(res, 400, 'Please provide a username (?username={username})');
        return;
    }
    if (!token) {
        error(res, 400, 'Please provide a valid token (&token={key}).');
        return;
    }
    if (!session) {
        error(res, 400, 'Please provide a valid session ID (&session={ID})');
        return;
    }
    try {
        res.jsonResponse(req.module.chat('clear', { username, token, session, storage: chatStorage }));
    }
    catch (err) {
        error(res, 400, err.message);
    }
});
// Display a private chat with a token
router.post('/:version/chat/private', (req, res) => {
    const { username, token } = req.body || {};
    if (!username) {
        error(res, 400, 'Please provide a username (?username={username})');
        return;
    }
    if (!token) {
        error(res, 400, 'Please provide a valid token (&token={key}).');
        return;
    }
    try {
        const messages = req.module.chat('private', {
            username,
            token,
            storage: chatStorage,
        });
        res.jsonResponse(messages);
    }
    catch (err) {
        error(res, 400, err.message);
    }
});
// Verify a solved proof-of-work challenge
router.post('/:version/pow', (req, res) => {
    const body = req.body || {};
    const { token, nonce } = body;
    const { version } = req.params;
    const verifyFn = req.module.verifyPow;
    if (!verifyFn) {
        error(res, 404, `Endpoint not available in ${version}.`);
        return;
    }
    if (!token || typeof token !== 'string') {
        error(res, 400, 'Please provide a token (?token={token})');
        return;
    }
    if (nonce === undefined || nonce === null) {
        error(res, 400, 'Please provide a nonce (&nonce={nonce})');
        return;
    }
    try {
        res.jsonResponse(verifyFn(token, String(nonce), challengeStorage));
    }
    catch (err) {
        error(res, 400, err.message);
    }
});
// Store tic tac toe games
router.post('/:version/tic-tac-toe', (req, res) => {
    if (since(req.version, 6)) {
        error(res, 404, `Endpoint not available in ${req.version}.`);
        return;
    }
    const { username, move, session, game } = req.body || {};
    if (!username) {
        error(res, 400, 'Please provide a username (?username={username})');
        return;
    }
    if (!move) {
        error(res, 400, 'Please provide a valid move (&move={move})');
        return;
    }
    if (!session) {
        error(res, 400, 'Please provide a valid session ID (&session={ID})');
        return;
    }
    if (!game) {
        error(res, 400, 'Please provide a valid game ID (&game={ID})');
        return;
    }
    try {
        const result = req.module.tic_tac_toe('play', {
            username,
            move,
            session,
            game,
            storage: ticTacToeStorage,
        });
        res.jsonResponse(result);
    }
    catch (err) {
        error(res, 400, err.message);
    }
});
// Display a tic tac toe game with a token
router.post('/:version/tic-tac-toe/fetch', (req, res) => {
    const { username, game } = req.body || {};
    const privateGame = (req.body || {}).private;
    if (!username) {
        error(res, 400, 'Please provide a username (?username={username})');
        return;
    }
    try {
        const result = req.module.tic_tac_toe('fetch', {
            username,
            game,
            private: privateGame,
            storage: ticTacToeStorage,
        });
        res.jsonResponse(result);
    }
    catch (err) {
        error(res, 400, err.message);
    }
});
// Forfeit a tic-tac-toe game
router.post('/:version/tic-tac-toe/forfeit', (req, res) => {
    const { username, session, game } = req.body || {};
    const { version } = req.params;
    if (!since(req.version, 6)) {
        error(res, 404, `Endpoint not available in ${version}.`);
        return;
    }
    if (!username) {
        error(res, 400, 'Please provide a username (?username={username})');
        return;
    }
    if (!session) {
        error(res, 400, 'Please provide a valid session ID (&session={ID})');
        return;
    }
    if (!game) {
        error(res, 400, 'Please provide a game ID (&game={ID})');
        return;
    }
    try {
        res.jsonResponse(req.module.tic_tac_toe('forfeit', { username, session, game, storage: ticTacToeStorage }));
    }
    catch (err) {
        error(res, 400, err.message);
    }
});
// List public tic tac toe games
router.post('/:version/tic-tac-toe/list', (req, res) => {
    try {
        const result = req.module.tic_tac_toe('list', {
            storage: ticTacToeStorage,
        });
        res.jsonResponse(result);
    }
    catch (err) {
        error(res, 400, err.message);
    }
});
// Play a tic-tac-toe move
router.post('/:version/tic-tac-toe/play', (req, res) => {
    const { username, move, session, game } = req.body || {};
    const { version } = req.params;
    if (!since(req.version, 6)) {
        error(res, 404, `Endpoint not available in ${version}.`);
        return;
    }
    if (!username) {
        error(res, 400, 'Please provide a username (?username={username})');
        return;
    }
    if (!move) {
        error(res, 400, 'Please provide a valid move (&move={move})');
        return;
    }
    if (!session) {
        error(res, 400, 'Please provide a valid session ID (&session={ID})');
        return;
    }
    if (!game) {
        error(res, 400, 'Please provide a game ID (&game={ID})');
        return;
    }
    try {
        res.jsonResponse(req.module.tic_tac_toe('play', { username, move, session, game, storage: ticTacToeStorage }));
    }
    catch (err) {
        error(res, 400, err.message);
    }
});
export default router;
//# sourceMappingURL=post.js.map