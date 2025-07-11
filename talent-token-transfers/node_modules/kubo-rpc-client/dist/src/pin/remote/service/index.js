import { createAdd } from './add.js';
import { createLs } from './ls.js';
import { createRm } from './rm.js';
export function createService(client) {
    return {
        add: createAdd(client),
        ls: createLs(client),
        rm: createRm(client)
    };
}
//# sourceMappingURL=index.js.map