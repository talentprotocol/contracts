import type { JWKKeyPair } from '../interface.js';
import type { AbortOptions } from '@libp2p/interface';
import type { Uint8ArrayList } from 'uint8arraylist';
export type Curve = 'P-256' | 'P-384' | 'P-521';
export declare const ECDSA_P_256_OID = "1.2.840.10045.3.1.7";
export declare const ECDSA_P_384_OID = "1.3.132.0.34";
export declare const ECDSA_P_521_OID = "1.3.132.0.35";
export declare function generateECDSAKey(curve?: Curve): Promise<JWKKeyPair>;
export declare function hashAndSign(key: JsonWebKey, msg: Uint8Array | Uint8ArrayList, options?: AbortOptions): Promise<Uint8Array>;
export declare function hashAndVerify(key: JsonWebKey, sig: Uint8Array, msg: Uint8Array | Uint8ArrayList, options?: AbortOptions): Promise<boolean>;
//# sourceMappingURL=index.d.ts.map