import { createPublish } from './publish.js';
import { createPubsub } from './pubsub/index.js';
import { createResolve } from './resolve.js';
export function createName(client) {
    return {
        publish: createPublish(client),
        resolve: createResolve(client),
        pubsub: createPubsub(client)
    };
}
//# sourceMappingURL=index.js.map