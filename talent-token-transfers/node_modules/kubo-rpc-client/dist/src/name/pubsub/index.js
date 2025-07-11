import { createCancel } from './cancel.js';
import { createState } from './state.js';
import { createSubs } from './subs.js';
export function createPubsub(client) {
    return {
        cancel: createCancel(client),
        state: createState(client),
        subs: createSubs(client)
    };
}
//# sourceMappingURL=index.js.map