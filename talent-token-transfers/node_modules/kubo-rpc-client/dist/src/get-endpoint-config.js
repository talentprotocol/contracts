export function createGetEndpointConfig(client) {
    return function getEndpointConfig() {
        const url = new URL(client.opts.base ?? '');
        return {
            host: url.hostname,
            port: url.port,
            protocol: url.protocol,
            pathname: url.pathname,
            'api-path': url.pathname
        };
    };
}
//# sourceMappingURL=get-endpoint-config.js.map