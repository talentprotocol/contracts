# any-signal <!-- omit in toc -->

[![codecov](https://img.shields.io/codecov/c/github/jacobheun/any-signal.svg?style=flat-square)](https://codecov.io/gh/jacobheun/any-signal)
[![CI](https://img.shields.io/github/actions/workflow/status/jacobheun/any-signal/js-test-and-release.yml?branch=master\&style=flat-square)](https://github.com/jacobheun/any-signal/actions/workflows/js-test-and-release.yml?query=branch%3Amaster)

> Combines an array of AbortSignals into a single signal that is aborted when any signal is

## Table of contents <!-- omit in toc -->

- [Install](#install)
  - [Browser `<script>` tag](#browser-script-tag)
- [Usage](#usage)
- [API](#api)
  - [`anySignal(signals)`](#anysignalsignals)
    - [Parameters](#parameters)
    - [Returns](#returns)
  - [`ClearableSignal.clear()`](#clearablesignalclear)
- [Acknowledgements](#acknowledgements)
- [API Docs](#api-docs)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i any-signal
```

### Browser `<script>` tag

Loading this module through a script tag will make it's exports available as `AnySignal` in the global namespace.

```html
<script src="https://unpkg.com/any-signal/dist/index.min.js"></script>
```

## Usage

```js
import { anySignal } from 'any-signal'

const userController = new AbortController()
const timeoutController = new AbortController()

const combinedSignal = anySignal([userController.signal, timeoutController.signal])
combinedSignal.addEventListener('abort', () => console.log('Abort!'))

// Abort after 1 second
const timeoutId = setTimeout(() => timeoutController.abort(), 1000)

// The user or the timeout can now abort the action
await performSomeAction({ signal: combinedSignal })
clearTimeout(timeoutId)

// Clear will clean up internal event handlers
combinedSignal.clear()
```

## API

### `anySignal(signals)`

#### Parameters

| Name    | Type                                                                                 | Description                                                         |
| ------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| signals | Array<[`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal)> | The Signals that will be observed and mapped to the returned Signal |

#### Returns

| Type                                                                              | Description                                                                                                                                   |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [`ClearableSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) | A Signal that will be aborted as soon as any one of its parent signals are aborted. Extends AbortSignal with the `clear` function for cleanup |

The returned [`ClearableSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) will only be aborted once, and as soon as one of its parent signals is aborted.

### `ClearableSignal.clear()`

Removes all internal event handlers. This **must** be called after abort has been called, or the signals have successfully executed, otherwise there is a risk of leaking event handlers.

## Acknowledgements

The anySignal function is taken from a [comment by jakearchibald](https://github.com/whatwg/fetch/issues/905#issuecomment-491970649)

## API Docs

- <https://jacobheun.github.io/any-signal>

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
