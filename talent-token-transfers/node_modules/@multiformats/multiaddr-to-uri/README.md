# @multiformats/multiaddr-to-uri

[![multiformats.io](https://img.shields.io/badge/project-IPFS-blue.svg?style=flat-square)](http://multiformats.io)
[![codecov](https://img.shields.io/codecov/c/github/multiformats/js-multiaddr-to-uri.svg?style=flat-square)](https://codecov.io/gh/multiformats/js-multiaddr-to-uri)
[![CI](https://img.shields.io/github/actions/workflow/status/multiformats/js-multiaddr-to-uri/js-test-and-release.yml?branch=main\&style=flat-square)](https://github.com/multiformats/js-multiaddr-to-uri/actions/workflows/js-test-and-release.yml?query=branch%3Amain)

> Convert a Multiaddr to a URI

# About

This module allows easy conversion of Multiaddrs to string URIs.

## Example - Converting multiaddrs to string URIs

```js
import { multiaddrToUri } from '@multiformats/multiaddr-to-uri'

console.log(multiaddrToUri('/dnsaddr/protocol.ai/https'))
// -> https://protocol.ai

console.log(multiaddrToUri('/ip4/127.0.0.1/tcp/8080'))
// -> http://127.0.0.1:8080

console.log(multiaddrToUri('/ip4/127.0.0.1/tcp/8080', { assumeHttp: false }))
// -> tcp://127.0.0.1:8080
```

Note:

- When `/tcp` is the last (terminating) protocol HTTP is assumed by default (implicit `assumeHttp: true`)
  - this means produced URIs will start with `http://` instead of `tcp://`
  - passing `{ assumeHttp: false }` disables this behavior
- Might be lossy - e.g. a DNSv6 multiaddr
- Can throw if the passed multiaddr:
  - is not a valid multiaddr
  - is not supported as a URI e.g. circuit

# Install

```console
$ npm i @multiformats/multiaddr-to-uri
```

## Browser `<script>` tag

Loading this module through a script tag will make its exports available as `MultiformatsMultiaddrToUri` in the global namespace.

```html
<script src="https://unpkg.com/@multiformats/multiaddr-to-uri/dist/index.min.js"></script>
```

# API Docs

- <https://multiformats.github.io/js-multiaddr-to-uri>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](https://github.com/multiformats/js-multiaddr-to-uri/LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](https://github.com/multiformats/js-multiaddr-to-uri/LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
