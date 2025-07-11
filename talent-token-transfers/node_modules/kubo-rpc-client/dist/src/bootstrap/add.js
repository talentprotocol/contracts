import { multiaddr } from '@multiformats/multiaddr';
import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createAdd(client) {
    return async function add(addr, options = {}) {
        const res = await client.post('bootstrap/add', {
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
//# sourceMappingURL=add.js.map