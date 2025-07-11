import { createGetAll } from './get-all.js';
import { createGet } from './get.js';
import { createProfiles } from './profiles/index.js';
import { createReplace } from './replace.js';
import { createSet } from './set.js';
export function createConfig(client) {
    return {
        getAll: createGetAll(client),
        get: createGet(client),
        set: createSet(client),
        replace: createReplace(client),
        profiles: createProfiles(client)
    };
}
//# sourceMappingURL=index.js.map