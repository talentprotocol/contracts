import { createPatch } from './patch/index.js';
export function createObject(client, codecs) {
    return {
        patch: createPatch(client)
    };
}
//# sourceMappingURL=index.js.map