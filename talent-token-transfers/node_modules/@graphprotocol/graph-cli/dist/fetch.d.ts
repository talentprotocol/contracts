import { fetch } from '@whatwg-node/fetch';
export default function fetchWrapper(input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]): Promise<Response>;
