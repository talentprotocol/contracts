import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createLs(client) {
    return async function ls(options = {}) {
        const res = await client.post('log/ls', {
            signal: options.signal,
            searchParams: toUrlSearchParams(options),
            headers: options.headers
        });
        const data = await res.json();
        return data.Strings;
    };
}
//# sourceMappingURL=ls.js.map