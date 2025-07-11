import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createSet(client) {
    return async function set(key, value, options = {}) {
        if (typeof key !== 'string') {
            throw new Error('Invalid key type');
        }
        const params = {
            ...options,
            ...encodeParam(key, value)
        };
        const res = await client.post('config', {
            signal: options.signal,
            searchParams: toUrlSearchParams(params),
            headers: options.headers
        });
        await res.text();
    };
}
function encodeParam(key, value) {
    switch (typeof value) {
        case 'boolean':
            return { arg: [key, value.toString()], bool: true };
        case 'string':
            return { arg: [key, value] };
        default:
            return { arg: [key, JSON.stringify(value)], json: true };
    }
}
//# sourceMappingURL=set.js.map