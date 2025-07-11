import type { JWKKeyPair } from '../interface.js';
import type { RSAPrivateKey, RSAPublicKey } from '@libp2p/interface';
import type { Digest } from 'multiformats/hashes/digest';
export declare const MAX_RSA_KEY_SIZE = 8192;
/**
 * Convert a PKCS#1 in ASN1 DER format to a JWK private key
 */
export declare function pkcs1ToJwk(bytes: Uint8Array): JsonWebKey;
/**
 * Convert a PKCS#1 in ASN1 DER format to a JWK private key
 */
export declare function pkcs1MessageToJwk(message: any): JsonWebKey;
/**
 * Convert a JWK private key into PKCS#1 in ASN1 DER format
 */
export declare function jwkToPkcs1(jwk: JsonWebKey): Uint8Array;
/**
 * Convert a PKIX in ASN1 DER format to a JWK public key
 */
export declare function pkixToJwk(bytes: Uint8Array): JsonWebKey;
export declare function pkixMessageToJwk(message: any): JsonWebKey;
/**
 * Convert a JWK public key to PKIX in ASN1 DER format
 */
export declare function jwkToPkix(jwk: JsonWebKey): Uint8Array;
/**
 * Turn PKCS#1 DER bytes into a PrivateKey
 */
export declare function pkcs1ToRSAPrivateKey(bytes: Uint8Array): RSAPrivateKey;
/**
 * Turn PKCS#1 DER bytes into a PrivateKey
 */
export declare function pkcs1MessageToRSAPrivateKey(message: any): RSAPrivateKey;
/**
 * Turn a PKIX message into a PublicKey
 */
export declare function pkixToRSAPublicKey(bytes: Uint8Array, digest?: Digest<18, number>): RSAPublicKey;
export declare function pkixMessageToRSAPublicKey(message: any, bytes: Uint8Array, digest?: Digest<18, number>): RSAPublicKey;
export declare function jwkToRSAPrivateKey(jwk: JsonWebKey): RSAPrivateKey;
export declare function generateRSAKeyPair(bits: number): Promise<RSAPrivateKey>;
/**
 * Takes a jwk key and returns a JWK KeyPair
 */
export declare function jwkToJWKKeyPair(key: JsonWebKey): JWKKeyPair;
//# sourceMappingURL=utils.d.ts.map