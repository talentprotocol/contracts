import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createConnect(client) {
    return async function connect(addr, options = {}) {
        const res = await client.post('swarm/connect', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                arg: addr,
                ...options
            }),
            headers: options.headers
        });
        const { Strings } = await res.json();
        return Strings ?? [];
    };
}
//# sourceMappingURL=connect.js.map