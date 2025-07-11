import { toUrlSearchParams } from '../../../lib/to-url-search-params.js';
import { decodeRemoteService } from './utils.js';
export function createLs(client) {
    return async function ls(options = {}) {
        // @ts-expect-error cannot derive option type from typedef
        const { stat, headers, timeout, signal } = options;
        const response = await client.post('pin/remote/service/ls', {
            timeout,
            signal,
            headers,
            searchParams: stat === true ? toUrlSearchParams({ stat }) : undefined
        });
        const json = await response.json();
        return json.RemoteServices.map(decodeRemoteService);
    };
}
//# sourceMappingURL=ls.js.map