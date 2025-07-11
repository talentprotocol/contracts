import { CID } from 'multiformats/cid';
import { objectToCamel } from '../lib/object-to-camel.js';
import { toUrlSearchParams } from '../lib/to-url-search-params.js';
import { createLocal } from './local.js';
export function createRefs(client) {
    async function* refs(args, options = {}) {
        const argsArr = Array.isArray(args) ? args : [args];
        const res = await client.post('refs', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                arg: argsArr.map(arg => `${arg instanceof Uint8Array ? CID.decode(arg) : arg}`),
                ...options
            }),
            headers: options.headers,
            transform: objectToCamel
        });
        yield* res.ndjson();
    }
    return Object.assign(refs, {
        local: createLocal(client)
    });
}
//# sourceMappingURL=index.js.map