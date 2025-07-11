import { createLevel } from './level.js';
import { createLs } from './ls.js';
import { createTail } from './tail.js';
export function createLog(client) {
    return {
        level: createLevel(client),
        ls: createLs(client),
        tail: createTail(client)
    };
}
//# sourceMappingURL=index.js.map