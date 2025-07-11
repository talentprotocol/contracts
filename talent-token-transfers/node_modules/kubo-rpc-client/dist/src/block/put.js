import { anySignal } from 'any-signal';
import { CID } from 'multiformats/cid';
import { multipartRequest } from '../lib/multipart-request.js';
import { toUrlSearchParams } from '../lib/to-url-search-params.js';
export function createPut(client) {
    return async function put(data, options = {}) {
        // allow aborting requests on body errors
        const controller = new AbortController();
        const signal = anySignal([controller.signal, options.signal]);
        let res;
        try {
            const response = await client.post('block/put', {
                signal,
                searchParams: toUrlSearchParams(options),
                ...(await multipartRequest([data], controller, options.headers))
            });
            res = await response.json();
        }
        catch (err) {
            // Retry with "protobuf"/"cbor" format for go-ipfs
            // TODO: remove when https://github.com/ipfs/go-cid/issues/75 resolved
            if (options.format === 'dag-pb') {
                return await put(data, { ...options, format: 'protobuf' });
            }
            else if (options.format === 'dag-cbor') {
                return await put(data, { ...options, format: 'cbor' });
            }
            throw err;
        }
        finally {
            signal.clear();
        }
        return CID.parse(res.Key);
    };
}
//# sourceMappingURL=put.js.map