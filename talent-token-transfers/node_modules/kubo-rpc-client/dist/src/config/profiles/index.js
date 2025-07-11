import { createApply } from './apply.js';
export function createProfiles(client) {
    return {
        apply: createApply(client)
    };
}
//# sourceMappingURL=index.js.map