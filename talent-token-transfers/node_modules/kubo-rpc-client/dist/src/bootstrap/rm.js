import { multiaddr } from '@multiformats/multiaddr';
import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createRm(client) {
    return async function rm(addr, options = {}) {
        const res = await client.post('bootstrap/rm', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                arg: addr,
                ...options
            }),
            headers: options.headers
        });
        const { Peers } = await res.json();
        return { Peers: Peers.map((ma) => multiaddr(ma)) };
    };
}
//# sourceMappingURL=rm.js.map