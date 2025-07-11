import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createDisconnect(client) {
    return async function disconnect(addr, options = {}) {
        const res = await client.post('swarm/disconnect', {
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
//# sourceMappingURL=disconnect.js.map