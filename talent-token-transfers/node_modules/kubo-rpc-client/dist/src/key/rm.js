import { objectToCamel } from '../lib/object-to-camel.js';
import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createRm(client) {
    return async function rm(name, options = {}) {
        const res = await client.post('key/rm', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                arg: name,
                ...options
            }),
            headers: options.headers
        });
        const data = await res.json();
        return objectToCamel(data.Keys[0]);
    };
}
//# sourceMappingURL=rm.js.map