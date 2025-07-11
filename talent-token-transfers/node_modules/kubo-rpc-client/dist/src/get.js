import { CID } from 'multiformats/cid';
import { toUrlSearchParams } from './lib/to-url-search-params.js';
export function createGet(client) {
    return async function* get(path, options = {}) {
        const opts = {
            arg: `${path instanceof Uint8Array ? CID.decode(path) : path}`,
            ...options
        };
        const res = await client.post('get', {
            signal: options.signal,
            searchParams: toUrlSearchParams(opts),
            headers: options.headers
        });
        yield* res.iterator();
    };
}
//# sourceMappingURL=get.js.map