<!--
Get your module up and running quickly.

Find and replace all on all files (CMD+SHIFT+F):
- Name: hashconnect
- Package name: @bushidoproject/hashconnect
- Description: Hashconnect Interoperability Library for Nuxt
-->

# hashconnect

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Hashconnect is a library to connect Hedera apps to wallets, similar to web3 functionality found in the Ethereum ecosystem.

- [✨ &nbsp;Release Notes](/CHANGELOG.md)
- [📖 Hedera API's and SDK's](https://docs.hedera.com/guides/docs/hedera-api)
- [📖 &nbsp;Hashconnect](https://github.com/Hashpack/hashconnect)

## Features

<!-- Highlight some of the features your module provide here -->
<!-- - ⛰ &nbsp;Foo -->
<!-- - 🚠 &nbsp;Bar -->
<!-- - 🌲 &nbsp;Baz -->

## Quick Setup

1. Add `@bushidoproject/hashconnect` dependency to your project

```bash
# Using pnpm
pnpm add -D @bushidoproject/hashconnect

# Using yarn
yarn add --dev @bushidoproject/hashconnect

# Using npm
npm install --save-dev @bushidoproject/hashconnect
```

2. Add `@bushidoproject/hashconnect` to the `modules` section of `nuxt.config.ts`

```js
export default defineNuxtConfig({
  modules: [
    '@bushidoproject/hashconnect'
  ]
})
```

That's it! You can now use hashconnect in your Nuxt app ✨

## Development

```bash
# Install dependencies
npm install

# Generate type stubs
npm run dev:prepare

# Develop with the playground
npm run dev

# Build the playground
npm run dev:build

# Run ESLint
npm run lint

# Run Vitest
npm run test
npm run test:watch

# Release new version
npm run release
```

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@bushidoproject/hashconnect/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/@bushidoproject/hashconnect

[npm-downloads-src]: https://img.shields.io/npm/dm/@bushidoproject/hashconnect.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/@bushidoproject/hashconnect

[license-src]: https://img.shields.io/npm/l/@bushidoproject/hashconnect.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://npmjs.com/package/@bushidoproject/hashconnect

[nuxt-src]: https://img.shields.io/badge/Nuxt-18181B?logo=nuxt.js
[nuxt-href]: https://nuxt.com
