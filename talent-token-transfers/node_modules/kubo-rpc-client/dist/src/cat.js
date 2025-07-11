import { toUrlSearchParams } from './lib/to-url-search-params.js';
export function createCat(client) {
    return async function* cat(path, options = {}) {
        const res = await client.post('cat', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                arg: path.toString(),
                ...options
            }),
            headers: options.headers
        });
        yield* res.iterator();
    };
}
//# sourceMappingURL=cat.js.map