import { createId } from './id.js';
export function createIsOnline(client) {
    const id = createId(client);
    return async function isOnline(options = {}) {
        try {
            const res = await id(options);
            return Boolean(res?.addresses?.length);
        }
        catch {
            return false;
        }
    };
}
//# sourceMappingURL=is-online.js.map