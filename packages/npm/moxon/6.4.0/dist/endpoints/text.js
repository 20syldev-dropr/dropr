import { api, define } from './define.js';
export default define({
    name: 'text',
    method: 'get',
    path: '/text',
    category: 'text',
    params: {
        method: {
            required: true,
            type: 'string',
            options: ['slug', 'stats', 'lorem', 'number'],
            missing: 'Please provide a valid method (?method={slug|stats|lorem|number})',
        },
        value: { type: 'string' },
        text: { type: 'string' },
        type: { type: 'string', options: ['words', 'sentences', 'paragraphs'], default: 'words' },
        count: { type: 'number', default: '5' },
        lang: { type: 'string', options: ['en', 'fr'], default: 'en' },
    },
    example: { method: 'slug', value: 'Hello Big World' },
    run: ({ method, value, text, type, count, lang }, req) => {
        const textMod = api(req).text;
        if (!method || !Object.hasOwn(textMod, method))
            throw new Error('Please provide a valid method (?method={slug|stats|lorem|number})');
        let result;
        switch (method) {
            case 'slug':
            case 'stats':
                result = textMod[method]((value ?? text));
                break;
            case 'lorem':
                result = textMod.lorem(type || 'words', count || '5');
                break;
            case 'number':
                result = textMod.number(value, lang || 'en');
                break;
            default:
                throw new Error('Unknown method');
        }
        return { method, result };
    },
});
//# sourceMappingURL=text.js.map