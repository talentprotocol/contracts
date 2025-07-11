import { toUrlSearchParams } from '../../../lib/to-url-search-params.js';
import { encodeEndpoint } from './utils.js';
export function createAdd(client) {
    return async function add(name, options) {
        const { endpoint, key, headers, timeout, signal } = options;
        await client.post('pin/remote/service/add', {
            timeout,
            signal,
            searchParams: toUrlSearchParams({
                arg: [name, encodeEndpoint(endpoint), key]
            }),
            headers
        });
    };
}
//# sourceMappingURL=add.js.map