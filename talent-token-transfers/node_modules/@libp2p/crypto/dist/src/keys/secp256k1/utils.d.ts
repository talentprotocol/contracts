import type { Secp256k1PublicKey, Secp256k1PrivateKey } from '@libp2p/interface';
declare const PRIVATE_KEY_BYTE_LENGTH = 32;
export { PRIVATE_KEY_BYTE_LENGTH as privateKeyLength };
export declare function unmarshalSecp256k1PrivateKey(bytes: Uint8Array): Secp256k1PrivateKey;
export declare function unmarshalSecp256k1PublicKey(bytes: Uint8Array): Secp256k1PublicKey;
export declare function generateSecp256k1KeyPair(): Promise<Secp256k1PrivateKey>;
export declare function compressSecp256k1PublicKey(key: Uint8Array): Uint8Array;
export declare function decompressSecp256k1PublicKey(key: Uint8Array): Uint8Array;
export declare function validateSecp256k1PrivateKey(key: Uint8Array): Uint8Array;
export declare function validateSecp256k1PublicKey(key: Uint8Array): Uint8Array;
export declare function computeSecp256k1PublicKey(privateKey: Uint8Array): Uint8Array;
export declare function generateSecp256k1PrivateKey(): Uint8Array;
//# sourceMappingURL=utils.d.ts.map