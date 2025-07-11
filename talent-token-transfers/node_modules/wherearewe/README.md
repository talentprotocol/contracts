# wherearewe <!-- omit in toc -->

[![codecov](https://img.shields.io/codecov/c/github/achingbrain/wherearewe.svg?style=flat-square)](https://codecov.io/gh/achingbrain/wherearewe)
[![CI](https://img.shields.io/github/workflow/status/achingbrain/wherearewe/test%20&%20maybe%20release/master?style=flat-square)](https://github.com/achingbrain/wherearewe/actions/workflows/js-test-and-release.yml)

> Detect the current environment

## Table of contents <!-- omit in toc -->

- [Install](#install)
- [Usage](#usage)
- [License](#license)
- [Contribution](#contribution)

## Install

```console
$ npm i wherearewe
```

## Usage

```javascript
import * as where from 'wherearewe'

console.info(where)
// {
//  isTest: boolean,
//  isElectron: boolean,
//  isElectronMain: boolean,
//  isElectronRenderer: boolean,
//  isNode: boolean,
//  isBrowser: boolean, // Detects browser main thread  **NOT** web worker or service worker
//  isWebWorker: boolean,
//  isEnvWithDom: boolean
//}
```

## License

Licensed under either of

- Apache 2.0, ([LICENSE-APACHE](LICENSE-APACHE) / <http://www.apache.org/licenses/LICENSE-2.0>)
- MIT ([LICENSE-MIT](LICENSE-MIT) / <http://opensource.org/licenses/MIT>)

## Contribution

Unless you explicitly state otherwise, any contribution intentionally submitted for inclusion in the work by you, as defined in the Apache-2.0 license, shall be dual licensed as above, without any additional terms or conditions.
