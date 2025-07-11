import { InvalidParametersError } from '@libp2p/interface';
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string';
import randomBytes from '../../random-bytes.js';
import webcrypto from '../../webcrypto/index.js';
import * as utils from './utils.js';
export const RSAES_PKCS1_V1_5_OID = '1.2.840.113549.1.1.1';
export { utils };
export async function generateRSAKey(bits, options) {
    const pair = await webcrypto.get().subtle.generateKey({
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: bits,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: { name: 'SHA-256' }
    }, true, ['sign', 'verify']);
    options?.signal?.throwIfAborted();
    const keys = await exportKey(pair, options);
    return {
        privateKey: keys[0],
        publicKey: keys[1]
    };
}
export { randomBytes as getRandomValues };
export async function hashAndSign(key, msg, options) {
    const privateKey = await webcrypto.get().subtle.importKey('jwk', key, {
        name: 'RSASSA-PKCS1-v1_5',
        hash: { name: 'SHA-256' }
    }, false, ['sign']);
    options?.signal?.throwIfAborted();
    const sig = await webcrypto.get().subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, privateKey, msg instanceof Uint8Array ? msg : msg.subarray());
    options?.signal?.throwIfAborted();
    return new Uint8Array(sig, 0, sig.byteLength);
}
export async function hashAndVerify(key, sig, msg, options) {
    const publicKey = await webcrypto.get().subtle.importKey('jwk', key, {
        name: 'RSASSA-PKCS1-v1_5',
        hash: { name: 'SHA-256' }
    }, false, ['verify']);
    options?.signal?.throwIfAborted();
    const result = await webcrypto.get().subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, publicKey, sig, msg instanceof Uint8Array ? msg : msg.subarray());
    options?.signal?.throwIfAborted();
    return result;
}
async function exportKey(pair, options) {
    if (pair.privateKey == null || pair.publicKey == null) {
        throw new InvalidParametersError('Private and public key are required');
    }
    const result = await Promise.all([
        webcrypto.get().subtle.exportKey('jwk', pair.privateKey),
        webcrypto.get().subtle.exportKey('jwk', pair.publicKey)
    ]);
    options?.signal?.throwIfAborted();
    return result;
}
export function rsaKeySize(jwk) {
    if (jwk.kty !== 'RSA') {
        throw new InvalidParametersError('invalid key type');
    }
    else if (jwk.n == null) {
        throw new InvalidParametersError('invalid key modulus');
    }
    const bytes = uint8ArrayFromString(jwk.n, 'base64url');
    return bytes.length * 8;
}
//# sourceMappingURL=index.browser.js.map