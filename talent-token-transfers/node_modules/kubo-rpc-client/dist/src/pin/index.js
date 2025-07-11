import { createAddAll } from './add-all.js';
import { createAdd } from './add.js';
import { createLs } from './ls.js';
import { createRemote } from './remote/index.js';
import { createRmAll } from './rm-all.js';
import { createRm } from './rm.js';
import { createUpdate } from './update.js';
export function createPin(client) {
    return {
        addAll: createAddAll(client),
        add: createAdd(client),
        ls: createLs(client),
        rmAll: createRmAll(client),
        rm: createRm(client),
        update: createUpdate(client),
        remote: createRemote(client)
    };
}
//# sourceMappingURL=index.js.map