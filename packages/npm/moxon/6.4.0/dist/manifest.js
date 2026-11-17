import { endpoints } from './endpoints/index.js';
// Declared endpoints without their run function, for the documentation sidebar, parameter lists and playground
export const manifest = endpoints.map(({ name, method, path, category, since, until, params, example }) => ({
    name,
    method,
    path,
    category,
    ...(since ? { since } : {}),
    ...(until ? { until } : {}),
    params,
    example: example,
}));
//# sourceMappingURL=manifest.js.map