import { api, define } from './define.js';
export default define({
    name: 'csv',
    method: 'post',
    path: '/csv',
    category: 'compute',
    since: 5,
    params: {
        action: {
            required: true,
            type: 'string',
            options: ['parse', 'format'],
            missing: 'Please provide an action (?action=parse|format)',
        },
        csv: { type: 'string' },
        json: { type: 'array' },
        delimiter: { type: 'string', default: ',' },
        headers: { type: 'boolean', default: 'true' },
    },
    example: { action: 'parse', csv: 'name,age\nAda,36\nAlan,41' },
    run: ({ action, csv, json, delimiter, headers }, req) => api(req).csv(action, { csv: csv, json: json }, {
        delimiter: delimiter,
        headers: headers !== undefined ? Boolean(headers) : undefined,
    }),
});
//# sourceMappingURL=csv.js.map