import { CID } from 'multiformats/cid';
import type { PinRemoteAddOptions, RemotePin, RemotePinQuery } from './index.js';
export declare const decodePin: ({ Name: name, Status: status, Cid: cid }: any) => RemotePin;
export declare const encodeService: (service: any) => string;
export declare const encodeCID: (cid: any) => string;
export declare const encodeQuery: ({ service, cid, name, status, all }: RemotePinQuery) => URLSearchParams;
export declare const encodeAddParams: (cid: CID, { service, background, name, origins }: PinRemoteAddOptions) => URLSearchParams;
//# sourceMappingURL=utils.d.ts.map