import { toUrlSearchParams } from '../../../lib/to-url-search-params.js';
export function createRm(client) {
    return async function rm(name, options = {}) {
        await client.post('pin/remote/service/rm', {
            signal: options.signal,
            headers: options.headers,
            searchParams: toUrlSearchParams({
                arg: name
            })
        });
    };
}
//# sourceMappingURL=rm.js.map