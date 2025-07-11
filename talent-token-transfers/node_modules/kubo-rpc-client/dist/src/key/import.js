import { objectToCamel } from '../lib/object-to-camel.js';
import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createImport(client) {
    return async function importKey(name, pem, password, options = {}) {
        const res = await client.post('key/import', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                arg: name,
                pem,
                password,
                ...options
            }),
            headers: options.headers
        });
        const data = await res.json();
        return objectToCamel(data);
    };
}
//# sourceMappingURL=import.js.map