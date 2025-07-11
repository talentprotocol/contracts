import { rpcArrayToTextArray } from '../lib/http-rpc-wire-format.js';
import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createLs(client) {
    return async function ls(options = {}) {
        const { Strings } = await (await client.post('pubsub/ls', {
            signal: options.signal,
            searchParams: toUrlSearchParams(options),
            headers: options.headers
        })).json();
        return rpcArrayToTextArray(Strings) ?? [];
    };
}
//# sourceMappingURL=ls.js.map