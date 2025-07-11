export function createUnsubscribe(client, subsTracker) {
    return async function unsubscribe(topic, handler) {
        subsTracker.unsubscribe(topic, handler);
    };
}
//# sourceMappingURL=unsubscribe.js.map