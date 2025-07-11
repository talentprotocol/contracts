import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createMv(client) {
    return async function mv(sources, destination, options = {}) {
        if (!Array.isArray(sources)) {
            sources = [sources];
        }
        const res = await client.post('files/mv', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                arg: sources.concat(destination),
                ...options
            }),
            headers: options.headers
        });
        await res.text();
    };
}
//# sourceMappingURL=mv.js.map