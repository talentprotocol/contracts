import type { Curve } from '../ecdh/index.js';
import type { ECDSAPublicKey, ECDSAPrivateKey } from '@libp2p/interface';
export declare function unmarshalECDSAPrivateKey(bytes: Uint8Array): ECDSAPrivateKey;
export declare function pkiMessageToECDSAPrivateKey(message: any): ECDSAPrivateKey;
export declare function unmarshalECDSAPublicKey(bytes: Uint8Array): ECDSAPublicKey;
export declare function pkiMessageToECDSAPublicKey(message: any): ECDSAPublicKey;
export declare function privateKeyToPKIMessage(privateKey: JsonWebKey): Uint8Array;
export declare function publicKeyToPKIMessage(publicKey: JsonWebKey): Uint8Array;
export declare function generateECDSAKeyPair(curve?: Curve): Promise<ECDSAPrivateKey>;
export declare function ensureECDSAKey(key: Uint8Array, length: number): Uint8Array;
//# sourceMappingURL=utils.d.ts.map