import { multiaddr } from '@multiformats/multiaddr';
import { multiaddrToUri } from '@multiformats/multiaddr-to-uri';
export function toUrlString(url) {
    try {
        // @ts-expect-error cannot pass URL
        url = multiaddrToUri(multiaddr(url));
    }
    catch { }
    url = url.toString();
    return url;
}
//# sourceMappingURL=to-url-string.js.map