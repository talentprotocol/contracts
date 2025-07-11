import { base58btc } from 'multiformats/bases/base58';
import { CID } from 'multiformats/cid';
import { identity } from 'multiformats/hashes/identity';
import { equals as uint8ArrayEquals } from 'uint8arrays/equals';
import { publicKeyToProtobuf } from '../index.js';
import { validateSecp256k1PublicKey, compressSecp256k1PublicKey, computeSecp256k1PublicKey, validateSecp256k1PrivateKey } from './utils.js';
import { hashAndVerify, hashAndSign } from './index.js';
export class Secp256k1PublicKey {
    type = 'secp256k1';
    raw;
    _key;
    constructor(key) {
        this._key = validateSecp256k1PublicKey(key);
        this.raw = compressSecp256k1PublicKey(this._key);
    }
    toMultihash() {
        return identity.digest(publicKeyToProtobuf(this));
    }
    toCID() {
        return CID.createV1(114, this.toMultihash());
    }
    toString() {
        return base58btc.encode(this.toMultihash().bytes).substring(1);
    }
    equals(key) {
        if (key == null || !(key.raw instanceof Uint8Array)) {
            return false;
        }
        return uint8ArrayEquals(this.raw, key.raw);
    }
    verify(data, sig, options) {
        return hashAndVerify(this._key, sig, data, options);
    }
}
export class Secp256k1PrivateKey {
    type = 'secp256k1';
    raw;
    publicKey;
    constructor(key, publicKey) {
        this.raw = validateSecp256k1PrivateKey(key);
        this.publicKey = new Secp256k1PublicKey(publicKey ?? computeSecp256k1PublicKey(key));
    }
    equals(key) {
        if (key == null || !(key.raw instanceof Uint8Array)) {
            return false;
        }
        return uint8ArrayEquals(this.raw, key.raw);
    }
    sign(message, options) {
        return hashAndSign(this.raw, message, options);
    }
}
//# sourceMappingURL=secp256k1.js.map