import type { Ed25519PublicKey, Ed25519PrivateKey } from '@libp2p/interface';
export declare function unmarshalEd25519PrivateKey(bytes: Uint8Array): Ed25519PrivateKey;
export declare function unmarshalEd25519PublicKey(bytes: Uint8Array): Ed25519PublicKey;
export declare function generateEd25519KeyPair(): Promise<Ed25519PrivateKey>;
export declare function generateEd25519KeyPairFromSeed(seed: Uint8Array): Promise<Ed25519PrivateKey>;
export declare function ensureEd25519Key(key: Uint8Array, length: number): Uint8Array;
//# sourceMappingURL=utils.d.ts.map