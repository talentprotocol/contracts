import type { HTTPRPCOptions } from '../index.js';
import type { HTTPRPCClient } from '../lib/core.js';
import type { PeerId, PeerInfo } from '@libp2p/interface';
import type { CID } from 'multiformats/cid';
export declare enum RoutingEventTypes {
    SENDING_QUERY = 0,
    PEER_RESPONSE = 1,
    FINAL_PEER = 2,
    QUERY_ERROR = 3,
    PROVIDER = 4,
    VALUE = 5,
    ADDING_PEER = 6,
    DIALING_PEER = 7
}
/**
 * The types of messages set/received during DHT queries
 */
export declare enum RoutingMessageType {
    PUT_VALUE = 0,
    GET_VALUE = 1,
    ADD_PROVIDER = 2,
    GET_PROVIDERS = 3,
    FIND_NODE = 4,
    PING = 5
}
export type RoutingMessageName = keyof typeof RoutingMessageType;
export interface RoutingRecord {
    key: Uint8Array;
    value: Uint8Array;
    timeReceived?: Date;
}
export interface RoutingSendingQueryEvent {
    type: RoutingEventTypes.SENDING_QUERY;
    name: 'SENDING_QUERY';
}
export interface RoutingPeerResponseEvent {
    from: PeerId;
    type: RoutingEventTypes.PEER_RESPONSE;
    name: 'PEER_RESPONSE';
    messageType: RoutingMessageType;
    messageName: RoutingMessageName;
    providers: PeerInfo[];
    closer: PeerInfo[];
    record?: RoutingRecord;
}
export interface RoutingFinalPeerEvent {
    peer: PeerInfo;
    type: RoutingEventTypes.FINAL_PEER;
    name: 'FINAL_PEER';
}
export interface RoutingQueryErrorEvent {
    type: RoutingEventTypes.QUERY_ERROR;
    name: 'QUERY_ERROR';
    error: Error;
}
export interface RoutingProviderEvent {
    type: RoutingEventTypes.PROVIDER;
    name: 'PROVIDER';
    providers: PeerInfo[];
}
export interface RoutingValueEvent {
    type: RoutingEventTypes.VALUE;
    name: 'VALUE';
    value: Uint8Array;
}
export interface RoutingAddingPeerEvent {
    type: RoutingEventTypes.ADDING_PEER;
    name: 'ADDING_PEER';
    peer: PeerId;
}
export interface RoutingDialingPeerEvent {
    peer: PeerId;
    type: RoutingEventTypes.DIALING_PEER;
    name: 'DIALING_PEER';
}
export type RoutingQueryEvent = RoutingSendingQueryEvent | RoutingPeerResponseEvent | RoutingFinalPeerEvent | RoutingQueryErrorEvent | RoutingProviderEvent | RoutingValueEvent | RoutingAddingPeerEvent | RoutingDialingPeerEvent;
export interface DHTAPI {
    /**
     * Find the closest peers to a given `PeerId` or `CID`, by querying the DHT.
     */
    query(peerId: PeerId | CID, options?: HTTPRPCOptions): AsyncIterable<RoutingQueryEvent>;
}
export declare function createDHT(client: HTTPRPCClient): DHTAPI;
//# sourceMappingURL=index.d.ts.map