export const ECDSA_P_256_OID = '1.2.840.10045.3.1.7';
export const ECDSA_P_384_OID = '1.3.132.0.34';
export const ECDSA_P_521_OID = '1.3.132.0.35';
export async function generateECDSAKey(curve = 'P-256') {
    const keyPair = await crypto.subtle.generateKey({
        name: 'ECDSA',
        namedCurve: curve
    }, true, ['sign', 'verify']);
    return {
        publicKey: await crypto.subtle.exportKey('jwk', keyPair.publicKey),
        privateKey: await crypto.subtle.exportKey('jwk', keyPair.privateKey)
    };
}
export async function hashAndSign(key, msg, options) {
    const privateKey = await crypto.subtle.importKey('jwk', key, {
        name: 'ECDSA',
        namedCurve: key.crv ?? 'P-256'
    }, false, ['sign']);
    options?.signal?.throwIfAborted();
    const signature = await crypto.subtle.sign({
        name: 'ECDSA',
        hash: {
            name: 'SHA-256'
        }
    }, privateKey, msg.subarray());
    options?.signal?.throwIfAborted();
    return new Uint8Array(signature, 0, signature.byteLength);
}
export async function hashAndVerify(key, sig, msg, options) {
    const publicKey = await crypto.subtle.importKey('jwk', key, {
        name: 'ECDSA',
        namedCurve: key.crv ?? 'P-256'
    }, false, ['verify']);
    options?.signal?.throwIfAborted();
    const result = await crypto.subtle.verify({
        name: 'ECDSA',
        hash: {
            name: 'SHA-256'
        }
    }, publicKey, sig, msg.subarray());
    options?.signal?.throwIfAborted();
    return result;
}
//# sourceMappingURL=index.js.map