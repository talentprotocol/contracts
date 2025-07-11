import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createNet(client) {
    return async function net(options = {}) {
        const res = await client.post('diag/net', {
            signal: options.signal,
            searchParams: toUrlSearchParams(options),
            headers: options.headers
        });
        return res.json();
    };
}
//# sourceMappingURL=net.js.map