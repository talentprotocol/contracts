export function encodeEndpoint(url) {
    const href = String(url);
    if (href === 'undefined') {
        throw Error('endpoint is required');
    }
    // Workaround trailing `/` issue in go-ipfs
    // @see https://github.com/ipfs/go-ipfs/issues/7826
    return href[href.length - 1] === '/' ? href.slice(0, -1) : href;
}
export function decodeRemoteService(json) {
    const service = {
        service: json.Service,
        endpoint: new URL(json.ApiEndpoint)
    };
    if (json.Stat != null) {
        service.stat = decodeStat(json.Stat);
    }
    return service;
}
export function decodeStat(json) {
    switch (json.Status) {
        case 'valid': {
            const { Pinning, Pinned, Queued, Failed } = json.PinCount;
            return {
                status: 'valid',
                pinCount: {
                    queued: Queued,
                    pinning: Pinning,
                    pinned: Pinned,
                    failed: Failed
                }
            };
        }
        case 'invalid': {
            return { status: 'invalid' };
        }
        default: {
            return { status: json.Status };
        }
    }
}
//# sourceMappingURL=utils.js.map