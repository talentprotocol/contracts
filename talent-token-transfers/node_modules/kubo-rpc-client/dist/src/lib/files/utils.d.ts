import type { ImportCandidate } from '../../index.js';
import type { Mtime, MtimeLike } from 'ipfs-unixfs';
export declare function isBytes(obj: any): obj is ArrayBufferView | ArrayBuffer;
export declare function isBlob(obj: any): obj is Blob;
/**
 * An object with a path or content property
 */
export declare function isFileObject(obj: any): obj is ImportCandidate;
export declare function isReadableStream(value: any): value is ReadableStream;
export declare function parseMode(mode?: string | number | undefined): number | undefined;
export declare function parseMtime(mtime?: MtimeLike): Mtime | undefined;
//# sourceMappingURL=utils.d.ts.map