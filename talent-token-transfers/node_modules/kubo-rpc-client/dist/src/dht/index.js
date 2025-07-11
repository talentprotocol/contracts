import { createQuery } from './query.js';
export var RoutingEventTypes;
(function (RoutingEventTypes) {
    RoutingEventTypes[RoutingEventTypes["SENDING_QUERY"] = 0] = "SENDING_QUERY";
    RoutingEventTypes[RoutingEventTypes["PEER_RESPONSE"] = 1] = "PEER_RESPONSE";
    RoutingEventTypes[RoutingEventTypes["FINAL_PEER"] = 2] = "FINAL_PEER";
    RoutingEventTypes[RoutingEventTypes["QUERY_ERROR"] = 3] = "QUERY_ERROR";
    RoutingEventTypes[RoutingEventTypes["PROVIDER"] = 4] = "PROVIDER";
    RoutingEventTypes[RoutingEventTypes["VALUE"] = 5] = "VALUE";
    RoutingEventTypes[RoutingEventTypes["ADDING_PEER"] = 6] = "ADDING_PEER";
    RoutingEventTypes[RoutingEventTypes["DIALING_PEER"] = 7] = "DIALING_PEER";
})(RoutingEventTypes || (RoutingEventTypes = {}));
/**
 * The types of messages set/received during DHT queries
 */
export var RoutingMessageType;
(function (RoutingMessageType) {
    RoutingMessageType[RoutingMessageType["PUT_VALUE"] = 0] = "PUT_VALUE";
    RoutingMessageType[RoutingMessageType["GET_VALUE"] = 1] = "GET_VALUE";
    RoutingMessageType[RoutingMessageType["ADD_PROVIDER"] = 2] = "ADD_PROVIDER";
    RoutingMessageType[RoutingMessageType["GET_PROVIDERS"] = 3] = "GET_PROVIDERS";
    RoutingMessageType[RoutingMessageType["FIND_NODE"] = 4] = "FIND_NODE";
    RoutingMessageType[RoutingMessageType["PING"] = 5] = "PING";
})(RoutingMessageType || (RoutingMessageType = {}));
export function createDHT(client) {
    return {
        query: createQuery(client)
    };
}
//# sourceMappingURL=index.js.map