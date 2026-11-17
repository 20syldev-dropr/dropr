import { api, define } from './define.js';
export default define({
    name: 'credit',
    method: 'get',
    path: '/credit',
    category: 'fakeData',
    params: {
        brand: { type: 'string', options: ['visa', 'mastercard', 'amex', 'discover', 'random'], default: 'random' },
        count: { type: 'integer', default: '1' },
        format: { type: 'string', options: ['full', 'masked'], default: 'masked' },
    },
    example: { brand: 'visa', count: '2', format: 'masked' },
    run: ({ brand, count, format }, req) => api(req).credit(brand, count !== undefined ? parseInt(count, 10) : 1, format),
});
//# sourceMappingURL=credit.js.map