import last from 'it-last';
import { createAddAll } from './add-all.js';
export function createAdd(client) {
    const all = createAddAll(client);
    return async function add(path, options = {}) {
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
//# sourceMappingURL=add.js.map