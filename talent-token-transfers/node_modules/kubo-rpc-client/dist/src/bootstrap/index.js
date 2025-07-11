import { createAdd } from './add.js';
import { createList } from './list.js';
import { createRm } from './rm.js';
export function createBootstrap(client) {
    return {
        add: createAdd(client),
        list: createList(client),
        rm: createRm(client)
    };
}
//# sourceMappingURL=index.js.map