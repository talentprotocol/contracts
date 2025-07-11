import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createVersion(client) {
    return async function version(options = {}) {
        const res = await (await client.post('repo/version', {
            signal: options.signal,
            searchParams: toUrlSearchParams(options),
            headers: options.headers
        })).json();
        return res.Version;
    };
}
//# sourceMappingURL=version.js.map