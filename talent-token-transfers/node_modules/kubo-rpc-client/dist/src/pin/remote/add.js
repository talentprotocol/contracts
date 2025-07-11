import { encodeAddParams, decodePin } from './utils.js';
export function createAdd(client) {
    return async function add(cid, { timeout, signal, headers, ...query }) {
        const response = await client.post('pin/remote/add', {
            timeout,
            signal,
            headers,
            searchParams: encodeAddParams(cid, query)
        });
        return decodePin(await response.json());
    };
}
//# sourceMappingURL=add.js.map