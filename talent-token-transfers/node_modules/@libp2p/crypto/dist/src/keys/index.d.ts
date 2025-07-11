/**
 * @packageDocumentation
 *
 * ## Supported Key Types
 *
 * Currently the `'RSA'`, `'ed25519'`, and `secp256k1` types are supported, although ed25519 and secp256k1 keys support only signing and verification of messages.
 *
 * For encryption / decryption support, RSA keys should be used.
 */
import type { Curve } from './ecdsa/index.js';
import type { PrivateKey, PublicKey, KeyType, RSAPrivateKey, Secp256k1PrivateKey, Ed25519PrivateKey, Secp256k1PublicKey, Ed25519PublicKey, ECDSAPrivateKey, ECDSAPublicKey } from '@libp2p/interface';
import type { MultihashDigest } from 'multiformats';
import type { Digest } from 'multiformats/hashes/digest';
export { generateEphemeralKeyPair } from './ecdh/index.js';
export type { Curve } from './ecdh/index.js';
export type { ECDHKey, EnhancedKey, EnhancedKeyPair, ECDHKeyPair } from './interface.js';
export { keyStretcher } from './key-stretcher.js';
/**
 * Generates a keypair of the given type and bitsize
 */
export declare function generateKeyPair(type: 'Ed25519'): Promise<Ed25519PrivateKey>;
export declare function generateKeyPair(type: 'secp256k1'): Promise<Secp256k1PrivateKey>;
export declare function generateKeyPair(type: 'ECDSA', curve?: Curve): Promise<ECDSAPrivateKey>;
export declare function generateKeyPair(type: 'RSA', bits?: number): Promise<RSAPrivateKey>;
export declare function generateKeyPair(type: KeyType, bits?: number): Promise<PrivateKey>;
/**
 * Generates a keypair of the given type from the passed seed.  Currently only
 * supports Ed25519 keys.
 *
 * Seed is a 32 byte uint8array
 */
export declare function generateKeyPairFromSeed(type: 'Ed25519', seed: Uint8Array): Promise<Ed25519PrivateKey>;
export declare function generateKeyPairFromSeed<T extends KeyType>(type: T, seed: Uint8Array, bits?: number): Promise<never>;
/**
 * Converts a protobuf serialized public key into its representative object.
 *
 * For RSA public keys optionally pass the multihash digest of the public key if
 * it is known. If the digest is omitted it will be calculated which can be
 * expensive.
 *
 * For other key types the digest option is ignored.
 */
export declare function publicKeyFromProtobuf(buf: Uint8Array, digest?: Digest<18, number>): PublicKey;
/**
 * Creates a public key from the raw key bytes
 */
export declare function publicKeyFromRaw(buf: Uint8Array): PublicKey;
/**
 * Creates a public key from an identity multihash which contains a protobuf
 * encoded Ed25519 or secp256k1 public key.
 *
 * RSA keys are not supported as in practice we they are not stored in identity
 * multihash since the hash would be very large.
 */
export declare function publicKeyFromMultihash(digest: MultihashDigest<0x0>): Ed25519PublicKey | Secp256k1PublicKey | ECDSAPublicKey;
/**
 * Converts a public key object into a protobuf serialized public key
 */
export declare function publicKeyToProtobuf(key: PublicKey): Uint8Array;
/**
 * Converts a protobuf serialized private key into its representative object
 */
export declare function privateKeyFromProtobuf(buf: Uint8Array): Ed25519PrivateKey | Secp256k1PrivateKey | RSAPrivateKey | ECDSAPrivateKey;
/**
 * Creates a private key from the raw key bytes. For Ed25519 keys this requires
 * the public key to be appended to the private key otherwise we can't
 * differentiate between Ed25519 and secp256k1 keys as they are the same length.
 */
export declare function privateKeyFromRaw(buf: Uint8Array): PrivateKey;
/**
 * Converts a private key object into a protobuf serialized private key
 */
export declare function privateKeyToProtobuf(key: PrivateKey): Uint8Array;
/**
 * Convert a libp2p RSA or ECDSA private key to a WebCrypto CryptoKeyPair
 */
export declare function privateKeyToCryptoKeyPair(privateKey: PrivateKey): Promise<CryptoKeyPair>;
/**
 * Convert a RSA or ECDSA WebCrypto CryptoKeyPair to a libp2p private key
 */
export declare function privateKeyFromCryptoKeyPair(keyPair: CryptoKeyPair): Promise<PrivateKey>;
//# sourceMappingURL=index.d.ts.map