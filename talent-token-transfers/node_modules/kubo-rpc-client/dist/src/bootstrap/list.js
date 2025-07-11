import { multiaddr } from '@multiformats/multiaddr';
import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createList(client) {
    return async function list(options = {}) {
        const res = await client.post('bootstrap/list', {
            signal: options.signal,
            searchParams: toUrlSearchParams(options),
            headers: options.headers
        });
        const { Peers } = await res.json();
        return { Peers: Peers.map((ma) => multiaddr(ma)) };
    };
}
//# sourceMappingURL=list.js.map