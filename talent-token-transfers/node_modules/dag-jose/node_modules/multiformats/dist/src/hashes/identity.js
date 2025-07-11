import { coerce } from '../bytes.js';
import * as Digest from './digest.js';
const code = 0x0;
const name = 'identity';
const encode = coerce;
function digest(input) {
    return Digest.create(code, encode(input));
}
export const identity = { code, name, encode, digest };
//# sourceMappingURL=identity.js.map