import { objectToCamel } from '../lib/object-to-camel.js';
import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createList(client) {
    return async function list(options = {}) {
        const res = await client.post('key/list', {
            signal: options.signal,
            searchParams: toUrlSearchParams(options),
            headers: options.headers
        });
        const data = await res.json();
        return (data.Keys ?? []).map((k) => objectToCamel(k));
    };
}
//# sourceMappingURL=list.js.map