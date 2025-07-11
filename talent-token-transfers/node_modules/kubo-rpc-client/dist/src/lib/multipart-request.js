import { nanoid } from 'nanoid';
import { isElectronRenderer } from 'wherearewe';
import { multipartRequest as multipartRequestBrowser } from './multipart-request.browser.js';
import { multipartRequest as multipartRequestNode } from './multipart-request.node.js';
export async function multipartRequest(source, abortController, headers = {}, boundary = `-----------------------------${nanoid()}`) {
    let req = multipartRequestNode;
    // In electron-renderer we use native fetch and should encode body using native
    // form data.
    if (isElectronRenderer) {
        req = multipartRequestBrowser;
    }
    return req(source, abortController, headers, boundary);
}
//# sourceMappingURL=multipart-request.js.map