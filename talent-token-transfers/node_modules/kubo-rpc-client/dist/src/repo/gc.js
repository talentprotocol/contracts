import { CID } from 'multiformats/cid';
import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createGc(client) {
    return async function* gc(options = {}) {
        const res = await client.post('repo/gc', {
            signal: options.signal,
            searchParams: toUrlSearchParams(options),
            headers: options.headers,
            transform: (res) => {
                return {
                    err: res.Error != null ? new Error(res.Error) : null,
                    cid: res.Key?.['/'] != null ? CID.parse(res.Key['/']) : null
                };
            }
        });
        yield* res.ndjson();
    };
}
//# sourceMappingURL=gc.js.map