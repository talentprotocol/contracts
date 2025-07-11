import errCode from 'err-code';
import { CID } from 'multiformats/cid';
/**
 * Retrieves IPLD Nodes along the `path` that is rooted at `cid`
 */
export async function* resolve(cid, path, codecs, getBlock, options) {
    const load = async (cid) => {
        const codec = await codecs.getCodec(cid.code);
        const block = await getBlock(cid, options);
        return codec.decode(block);
    };
    const parts = path.split('/').filter(Boolean);
    let value = await load(cid);
    let lastCid = cid;
    // End iteration if there isn't a CID to follow any more
    while (parts.length > 0) {
        const key = parts.shift();
        if (key == null) {
            throw errCode(new Error(`Could not resolve path "${path}"`), 'ERR_INVALID_PATH');
        }
        if (Object.prototype.hasOwnProperty.call(value, key)) {
            value = value[key];
            yield {
                value,
                remainderPath: parts.join('/')
            };
        }
        else {
            throw errCode(new Error(`no link named "${key}" under ${lastCid}`), 'ERR_NO_LINK');
        }
        const cid = CID.asCID(value);
        if (cid != null) {
            lastCid = cid;
            value = await load(value);
        }
    }
    yield {
        value,
        remainderPath: ''
    };
}
//# sourceMappingURL=resolve.js.map