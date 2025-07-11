# stream-to-it

[![codecov](https://img.shields.io/codecov/c/github/alanshaw/stream-to-it.svg?style=flat-square)](https://codecov.io/gh/alanshaw/stream-to-it)
[![CI](https://img.shields.io/github/actions/workflow/status/alanshaw/stream-to-it/js-test-and-release.yml?branch=master\&style=flat-square)](https://github.com/alanshaw/stream-to-it/actions/workflows/js-test-and-release.yml?query=branch%3Amaster)

> Convert Node.js streams to streaming iterables

# About

<!--

!IMPORTANT!

Everything in this README between "# About" and "# Install" is automatically
generated and will be overwritten the next time the doc generator is run.

To make changes to this section, please update the @packageDocumentation section
of src/index.js or src/index.ts

To experiment with formatting, please run "npm run docs" from the root of this
repo and examine the changes made.

-->

Seamlessly use Node.js streams with `it-pipe` and friends.

## Example - Convert readable stream to source iterable

```TypeScript
import fs from 'node:fs'
import * as toIterable from 'stream-to-it'

const readable = fs.createReadStream('/path/to/file')
// Node.js streams are already async iterable so this is just s => s
const source = toIterable.source<Buffer>(readable)

for await (const chunk of source) {
  console.log(chunk.toString())
}
```

Also works with browser [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream):

```TypeScript
import * as toIterable from 'stream-to-it'

const res = await fetch('http://example.org/file.jpg')

if (res.body == null) {
  throw new Error('Body was not set')
}

for await (const chunk of toIterable.source(res.body)) {
  console.log(chunk.toString())
}
```

## Example - Convert writable stream to sink iterable

```TypeScript
import fs from 'node:fs'
import { pipe } from 'it-pipe'
import * as toIterable from 'stream-to-it'

const source = [Buffer.from('Hello '), Buffer.from('World!')]
const sink = toIterable.sink(fs.createWriteStream('/path/to/file'))

await pipe(source, sink)
```

## Example - Convert transform stream to transform iterable

```TypeScript
import fs from 'node:fs'
import { Transform } from 'node:stream'
import { pipe } from 'it-pipe'
import * as toIterable from 'stream-to-it'

const output = await pipe(
  [true, false, true, true],
  toIterable.transform(new Transform({ // Inverter transform :)
    transform (chunk, enc, cb) {
      cb(null, !chunk)
    }
  })),
  // Collect and return the chunks
  async source => {
    const chunks = []
    for await (const chunk of source) chunks.push(chunk)
    return chunks
  }
)

console.log(output) // [ false, true, false, false ]
```

## Related

- [`it-to-stream`](https://www.npmjs.com/package/it-to-stream) Convert streaming iterables to Node.js streams
- [`it-pipe`](https://www.npmjs.com/package/it-pipe) Utility to "pipe" async iterables together

# Install

```console
$ npm i stream-to-it
```

# API Docs

- <https://alanshaw.github.io/stream-to-it>

# License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

# Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
