import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createSys(client) {
    return async function sys(options = {}) {
        const res = await client.post('diag/sys', {
            signal: options.signal,
            searchParams: toUrlSearchParams(options),
            headers: options.headers
        });
        return res.json();
    };
}
//# sourceMappingURL=sys.js.map