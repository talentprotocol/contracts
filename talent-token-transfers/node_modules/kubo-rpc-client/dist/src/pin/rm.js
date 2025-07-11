import last from 'it-last';
import { createRmAll } from './rm-all.js';
export function createRm(client) {
    const all = createRmAll(client);
    return async function rm(path, options = {}) {
        const res = await last(all([{
                path: path.toString(),
                ...options
            }], options));
        if (res == null) {
            throw new Error('No response received');
        }
        return res;
    };
}
//# sourceMappingURL=rm.js.map