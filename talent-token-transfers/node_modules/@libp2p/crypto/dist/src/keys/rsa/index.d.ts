import randomBytes from '../../random-bytes.js';
import * as utils from './utils.js';
import type { JWKKeyPair } from '../interface.js';
import type { AbortOptions } from '@libp2p/interface';
import type { Uint8ArrayList } from 'uint8arraylist';
export declare const RSAES_PKCS1_V1_5_OID = "1.2.840.113549.1.1.1";
export { utils };
export declare function generateRSAKey(bits: number, options?: AbortOptions): Promise<JWKKeyPair>;
export { randomBytes as getRandomValues };
export declare function hashAndSign(key: JsonWebKey, msg: Uint8Array | Uint8ArrayList, options?: AbortOptions): Uint8Array;
export declare function hashAndVerify(key: JsonWebKey, sig: Uint8Array, msg: Uint8Array | Uint8ArrayList, options?: AbortOptions): boolean;
export declare function rsaKeySize(jwk: JsonWebKey): number;
//# sourceMappingURL=index.d.ts.map