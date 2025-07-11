import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createTail(client) {
    return async function* tail(options = {}) {
        const res = await client.post('log/tail', {
            signal: options.signal,
            searchParams: toUrlSearchParams(options),
            headers: options.headers
        });
        yield* res.ndjson();
    };
}
//# sourceMappingURL=tail.js.map