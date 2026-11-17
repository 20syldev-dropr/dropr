// Keys come from clients, so the stores have no prototype ('constructor' or '__proto__' stay plain keys)
export const ipLimits = Object.create(null);
export const challengeStorage = { usedNonces: new Map(), attempts: new Map() };
export const chatStorage = {
    messages: [],
    privateChats: Object.create(null),
    sessions: Object.create(null),
    rateLimits: Object.create(null),
};
export const ticTacToeStorage = {
    games: Object.create(null),
    sessions: Object.create(null),
    rateLimits: Object.create(null),
};
//# sourceMappingURL=index.js.map