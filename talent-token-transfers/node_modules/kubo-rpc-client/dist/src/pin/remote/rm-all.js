import { encodeQuery } from './utils.js';
export function createRmAll(client) {
    return async function rmAll({ timeout, signal, headers, ...query }) {
        await client.post('pin/remote/rm', {
            timeout,
            signal,
            headers,
            searchParams: encodeQuery({
                ...query,
                all: true
            })
        });
    };
}
//# sourceMappingURL=rm-all.js.map