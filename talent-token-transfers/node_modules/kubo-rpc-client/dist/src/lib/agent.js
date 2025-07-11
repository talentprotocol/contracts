import http from 'node:http';
import https from 'node:https';
export default (url) => {
    if (url == null) {
        throw new Error('URL required');
    }
    return url.protocol.startsWith('https') ? https.Agent : http.Agent;
};
//# sourceMappingURL=agent.js.map