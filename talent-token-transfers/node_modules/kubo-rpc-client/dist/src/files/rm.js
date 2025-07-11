import { HTTPError } from '../lib/errors.js';
import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createRm(client) {
    return async function rm(path, options = {}) {
        const res = await client.post('files/rm', {
            signal: options.signal,
            searchParams: toUrlSearchParams({
                arg: path,
                ...options
            }),
            headers: options.headers
        });
        const body = await res.text();
        // we don't expect text body to be ever present
        // (if so, it means an error such as https://github.com/ipfs/go-ipfs/issues/8606)
        if (body !== '') {
            const error = new HTTPError(res);
            error.message = body;
            throw error;
        }
    };
}
//# sourceMappingURL=rm.js.map