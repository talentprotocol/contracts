import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createGetAll(client) {
    return async function getAll(options = {}) {
        const res = await client.post('config/show', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                ...options
            }),
            headers: options.headers
        });
        const data = await res.json();
        return data;
    };
}
//# sourceMappingURL=get-all.js.map