import { toUrlSearchParams } from './lib/to-url-search-params.js';
export function createStop(client) {
    return async function stop(options = {}) {
        const res = await client.post('shutdown', {
            signal: options.signal,
            searchParams: toUrlSearchParams(options),
            headers: options.headers
        });
        await res.text();
    };
}
//# sourceMappingURL=stop.js.map