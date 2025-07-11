import { base58btc } from 'multiformats/bases/base58';
import { CID } from 'multiformats/cid';
import { identity } from 'multiformats/hashes/identity';
import { equals as uint8ArrayEquals } from 'uint8arrays/equals';
import { isPromise } from "../../util.js";
import { publicKeyToProtobuf } from '../index.js';
import { ensureEd25519Key } from './utils.js';
import * as crypto from './index.js';
export class Ed25519PublicKey {
    type = 'Ed25519';
    raw;
    constructor(key) {
        this.raw = ensureEd25519Key(key, crypto.publicKeyLength);
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
        options?.signal?.throwIfAborted();
        const result = crypto.hashAndVerify(this.raw, sig, data);
        if (isPromise(result)) {
            return result.then(res => {
                options?.signal?.throwIfAborted();
                return res;
            });
        }
        return result;
    }
}
export class Ed25519PrivateKey {
    type = 'Ed25519';
    raw;
    publicKey;
    // key       - 64 byte Uint8Array containing private key
    // publicKey - 32 byte Uint8Array containing public key
    constructor(key, publicKey) {
        this.raw = ensureEd25519Key(key, crypto.privateKeyLength);
        this.publicKey = new Ed25519PublicKey(publicKey);
    }
    equals(key) {
        if (key == null || !(key.raw instanceof Uint8Array)) {
            return false;
        }
        return uint8ArrayEquals(this.raw, key.raw);
    }
    sign(message, options) {
        options?.signal?.throwIfAborted();
        const sig = crypto.hashAndSign(this.raw, message);
        if (isPromise(sig)) {
            return sig.then(res => {
                options?.signal?.throwIfAborted();
                return res;
            });
        }
        options?.signal?.throwIfAborted();
        return sig;
    }
}
//# sourceMappingURL=ed25519.js.map