/**
 * On the producing side:
 * - Build messages with the signature, key (from may be enough for certain inlineable public key types), from and seqno fields.
 *
 * On the consuming side:
 * - Enforce the fields to be present, reject otherwise.
 * - Propagate only if the fields are valid and signature can be verified, reject otherwise.
 */
export const StrictSign = 'StrictSign';
/**
 * On the producing side:
 * - Build messages without the signature, key, from and seqno fields.
 * - The corresponding protobuf key-value pairs are absent from the marshaled message, not just empty.
 *
 * On the consuming side:
 * - Enforce the fields to be absent, reject otherwise.
 * - Propagate only if the fields are absent, reject otherwise.
 * - A message_id function will not be able to use the above fields, and should instead rely on the data field. A commonplace strategy is to calculate a hash.
 */
export const StrictNoSign = 'StrictNoSign';
export var TopicValidatorResult;
(function (TopicValidatorResult) {
    /**
     * The message is considered valid, and it should be delivered and forwarded to the network
     */
    TopicValidatorResult["Accept"] = "accept";
    /**
     * The message is neither delivered nor forwarded to the network
     */
    TopicValidatorResult["Ignore"] = "ignore";
    /**
     * The message is considered invalid, and it should be rejected
     */
    TopicValidatorResult["Reject"] = "reject";
})(TopicValidatorResult || (TopicValidatorResult = {}));
/**
 * All Pubsub implementations must use this symbol as the name of a property
 * with a boolean `true` value
 */
export const pubSubSymbol = Symbol.for('@libp2p/pubsub');
/**
 * Returns true if the passed argument is a PubSub implementation
 */
export function isPubSub(obj) {
    return Boolean(obj?.[pubSubSymbol]);
}
//# sourceMappingURL=pubsub.js.map