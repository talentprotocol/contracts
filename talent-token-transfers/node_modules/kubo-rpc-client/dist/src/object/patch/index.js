import { createAddLink } from './add-link.js';
import { createRmLink } from './rm-link.js';
export function createPatch(client) {
    return {
        addLink: createAddLink(client),
        rmLink: createRmLink(client)
    };
}
//# sourceMappingURL=index.js.map