import { CID } from 'multiformats/cid';
import { objectToCamelWithMetadata } from '../lib/object-to-camel-with-metadata.js';
import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createStat(client) {
    return async function stat(path, options = {}) {
        const res = await client.post('files/stat', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                arg: path,
                ...options
            }),
            headers: options.headers
        });
        const data = await res.json();
        data.WithLocality = data.WithLocality ?? false;
        return toCoreInterface(objectToCamelWithMetadata(data));
    };
}
function toCoreInterface(entry) {
    entry.cid = CID.parse(entry.hash);
    delete entry.hash;
    return entry;
}
//# sourceMappingURL=stat.js.map