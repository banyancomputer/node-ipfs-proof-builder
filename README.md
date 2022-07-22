<h1>DEPRECATED</h1>
functionality for building and verifying Merkle proofs has moved to `blake3-processing`

<h1>Welcome to ipfs-proof-oracle 👋</h1>
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-(0.0.1)-blue.svg?cacheSeconds=2592000" />
  <a href="#" target="_blank">
    <img alt="License: ISC" src="https://img.shields.io/badge/License-ISC-yellow.svg" />
  </a>
</p>

> This package implements a Merkle Proof Builder over IPFS.
> 
> Given a description of a File Stored on IPFS, it:
>   1. Queries for a Challenge Block
>   2. Builds a proof for that block from an `obao` file
>   3. Returns the built proof to the caller
> 
> `obao` files must be provided by the caller, and accessed through a custom callback

## Install

```sh
npm install
```

## Building

```sh
npm run build
```

## Run tests
Populate `spec/testCases/testFiles/pinned` with files that you know are pinned or available over IPFS. These can be gathered through an IPFS gateway.
Populate `spec/testCases/testFiles/unpinned` with files that you know are not pinned or available over IPFS. Try using personal data you know isn't public, or random generated text files.
Given these files, our test script pre-processes them into `obao` files that can be used to test our proof builder.
```sh
npm test
```

## Author

👤 **Alex Miller and Jonah Kaye**

* Github: [@amiller68](https://github.com/amiller68)

## Show your support

Give a ⭐️ if this project helped you!

***
_This README was generated with ❤️ by [readme-md-generator](https://github.com/kefranabg/readme-md-generator)_
