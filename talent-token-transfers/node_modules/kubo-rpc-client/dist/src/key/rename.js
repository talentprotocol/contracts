import { objectToCamel } from '../lib/object-to-camel.js';
import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createRename(client) {
    return async function rename(oldName, newName, options = {}) {
        const res = await client.post('key/rename', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                arg: [
                    oldName,
                    newName
                ],
                ...options
            }),
            headers: options.headers
        });
        return objectToCamel(await res.json());
    };
}
//# sourceMappingURL=rename.js.map