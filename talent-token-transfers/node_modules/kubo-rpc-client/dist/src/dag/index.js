import { createExport } from './export.js';
import { createGet } from './get.js';
import { createImport } from './import.js';
import { createPut } from './put.js';
import { createResolve } from './resolve.js';
export function createDAG(client, codecs) {
    return {
        export: createExport(client),
        get: createGet(client, codecs),
        import: createImport(client),
        put: createPut(client, codecs),
        resolve: createResolve(client)
    };
}
//# sourceMappingURL=index.js.map