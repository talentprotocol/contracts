import { createGen } from './gen.js';
import { createImport } from './import.js';
import { createList } from './list.js';
import { createRename } from './rename.js';
import { createRm } from './rm.js';
export function createKey(client) {
    return {
        gen: createGen(client),
        import: createImport(client),
        list: createList(client),
        rename: createRename(client),
        rm: createRm(client)
    };
}
//# sourceMappingURL=index.js.map