import { encodeQuery, decodePin } from './utils.js';
export function createLs(client) {
    return async function* ls({ timeout, signal, headers, ...query }) {
        const response = await client.post('pin/remote/ls', {
            timeout,
            signal,
            headers,
            searchParams: encodeQuery(query)
        });
        for await (const pin of response.ndjson()) {
            yield decodePin(pin);
        }
    };
}
//# sourceMappingURL=ls.js.map