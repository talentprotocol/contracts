import { InvalidParametersError } from '@libp2p/interface';
import { Ed25519PublicKey as Ed25519PublicKeyClass, Ed25519PrivateKey as Ed25519PrivateKeyClass } from './ed25519.js';
import * as crypto from './index.js';
export function unmarshalEd25519PrivateKey(bytes) {
    // Try the old, redundant public key version
    if (bytes.length > crypto.privateKeyLength) {
        bytes = ensureEd25519Key(bytes, crypto.privateKeyLength + crypto.publicKeyLength);
        const privateKeyBytes = bytes.subarray(0, crypto.privateKeyLength);
        const publicKeyBytes = bytes.subarray(crypto.privateKeyLength, bytes.length);
        return new Ed25519PrivateKeyClass(privateKeyBytes, publicKeyBytes);
    }
    bytes = ensureEd25519Key(bytes, crypto.privateKeyLength);
    const privateKeyBytes = bytes.subarray(0, crypto.privateKeyLength);
    const publicKeyBytes = bytes.subarray(crypto.publicKeyLength);
    return new Ed25519PrivateKeyClass(privateKeyBytes, publicKeyBytes);
}
export function unmarshalEd25519PublicKey(bytes) {
    bytes = ensureEd25519Key(bytes, crypto.publicKeyLength);
    return new Ed25519PublicKeyClass(bytes);
}
export async function generateEd25519KeyPair() {
    const { privateKey, publicKey } = crypto.generateKey();
    return new Ed25519PrivateKeyClass(privateKey, publicKey);
}
export async function generateEd25519KeyPairFromSeed(seed) {
    const { privateKey, publicKey } = crypto.generateKeyFromSeed(seed);
    return new Ed25519PrivateKeyClass(privateKey, publicKey);
}
export function ensureEd25519Key(key, length) {
    key = Uint8Array.from(key ?? []);
    if (key.length !== length) {
        throw new InvalidParametersError(`Key must be a Uint8Array of length ${length}, got ${key.length}`);
    }
    return key;
}
//# sourceMappingURL=utils.js.map