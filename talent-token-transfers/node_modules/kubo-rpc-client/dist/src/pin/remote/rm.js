import { encodeQuery } from './utils.js';
export function createRm(client) {
    return async function rm({ timeout, signal, headers, ...query }) {
        await client.post('pin/remote/rm', {
            timeout,
            signal,
            headers,
            searchParams: encodeQuery({
                ...query,
                all: false
            })
        });
    };
}
//# sourceMappingURL=rm.js.map