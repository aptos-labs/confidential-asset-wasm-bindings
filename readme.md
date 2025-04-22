# confidential-asset-wasm-bindings

## Generating WASM Bindings

To generate WASM bindings, follow these steps:

1. Inside the `pollard-kangaroo` and `range-proofs` directories, locate the `build-wasm.sh` script for WASM generation.
2. Ensure Docker is installed on your machine, then execute `build-wasm.sh` in each subdirectory.
3. Once WASM bindings have been generated in all subdirectories, you can create a unified package by running the `gen-npm-pkg.sh` script at the root of the project:

These steps will generate the npm package with necessary WASM bindings.

One-liner for convenience from the root folder
```bash
chmod +x ./range-proofs/build-wasm.sh && ./range-proofs/build-wasm.sh && chmod +x ./pollard-kangaroo/build-wasm.sh && ./pollard-kangaroo/build-wasm.sh && ./gen-npm-pkg.sh
```
