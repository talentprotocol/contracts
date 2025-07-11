import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createResolve(client) {
    return async function* resolve(path, options = {}) {
        const res = await client.post('name/resolve', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                arg: path,
                stream: true,
                ...options
            }),
            headers: options.headers
        });
        for await (const result of res.ndjson()) {
            yield result.Path;
        }
    };
}
//# sourceMappingURL=resolve.js.map