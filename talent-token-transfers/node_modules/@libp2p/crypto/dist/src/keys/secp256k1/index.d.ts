import type { AbortOptions } from '@libp2p/interface';
import type { Uint8ArrayList } from 'uint8arraylist';
declare const PUBLIC_KEY_BYTE_LENGTH = 33;
declare const PRIVATE_KEY_BYTE_LENGTH = 32;
export { PUBLIC_KEY_BYTE_LENGTH as publicKeyLength };
export { PRIVATE_KEY_BYTE_LENGTH as privateKeyLength };
/**
 * Hash and sign message with private key
 */
export declare function hashAndSign(key: Uint8Array, msg: Uint8Array | Uint8ArrayList, options?: AbortOptions): Uint8Array;
/**
 * Hash message and verify signature with public key
 */
export declare function hashAndVerify(key: Uint8Array, sig: Uint8Array, msg: Uint8Array | Uint8ArrayList, options?: AbortOptions): boolean;
//# sourceMappingURL=index.d.ts.map