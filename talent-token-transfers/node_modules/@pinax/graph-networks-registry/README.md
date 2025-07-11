# The Graph Networks Registry Typescript Library

[![npm version](https://badge.fury.io/js/%40pinax%2Fgraph-networks-registry.svg)](https://www.npmjs.com/package/@pinax/graph-networks-registry) [![Documentation](https://img.shields.io/badge/docs-TypeDoc-blue)](https://pinax-network.github.io/graph-networks-libs/) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TypeScript types and helpers for [The Graph Networks Registry](https://github.com/graphprotocol/networks-registry).

Documentation available [here](https://pinax-network.github.io/graph-networks-libs/).

## Installation

```bash
npm install @pinax/graph-networks-registry
```

## Usage

### Loading the Registry

```typescript
import { NetworksRegistry } from '@pinax/graph-networks-registry';

// Load from the latest compatible registry JSON at networks-registry.thegraph.com
const registry = await NetworksRegistry.fromLatestVersion();

// Load from specific version tag at networks-registry.thegraph.com
const registry = await NetworksRegistry.fromExactVersion('0.6.0');
const registry = await NetworksRegistry.fromExactVersion('0.6.x');

// Load from URL
const registry = await NetworksRegistry.fromUrl('https://networks-registry.thegraph.com/TheGraphNetworksRegistry.json');

// Load from local file
const registry = NetworksRegistry.fromFile('./TheGraphNetworksRegistry.json');

// Load from JSON string
const registry = NetworksRegistry.fromJson(jsonString);
```

### Working with Networks

```typescript
// Find network by ID
const mainnet = registry.getNetworkById('mainnet');
if (mainnet) {
    console.log(mainnet.fullName); // "Ethereum Mainnet"
    console.log(mainnet.caip2Id); // "eip155:1"
}
// Find network by alias
const mainnet = registry.getNetworkByAlias('eth');
if (mainnet) {
    console.log(mainnet.fullName); // "Ethereum Mainnet"
}
```
