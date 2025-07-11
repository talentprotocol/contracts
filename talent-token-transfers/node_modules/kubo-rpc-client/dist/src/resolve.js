import { toUrlSearchParams } from './lib/to-url-search-params.js';
export function createResolve(client) {
    return async function resolve(path, options = {}) {
        const res = await client.post('resolve', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                arg: path,
                ...options
            }),
            headers: options.headers
        });
        const { Path } = await res.json();
        return Path;
    };
}
//# sourceMappingURL=resolve.js.map