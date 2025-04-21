# confidential-asset-wasm-bindings

## Generating WASM Bindings

To generate WASM bindings, follow these steps:

1. Inside the root directory, locate the subdirectories that contain the platform-specific scripts for WASM
   generation.
2. Run the respective scripts for each platform:

    - **macOS**: Ensure Docker is installed on your machine, then execute `build-wasm.sh` in each subdirectory.
      ```bash
      ./build-wasm.sh
      ```

      One-liner for convenience
      ```bash
      chmod +x ./range-proofs/build-wasm.sh && ./range-proofs/build-wasm.sh && chmod +x ./pollard-kangaroo/build-wasm.sh && ./pollard-kangaroo/build-wasm.sh
      ```

    - **Linux**: Use `wasm-pack` to build the bindings in each subdirectory by running the following command:
      ```bash
      wasm-pack build --release --target web -d "$dir/pkg"
      ```

      Replace `$dir` with the name of the specific subdirectory you are working in.

3. Once WASM bindings have been generated in all subdirectories, you can create a unified package by running the
   `gen-npm-pkg.sh` script at the root of the project:
    ```bash
    ./gen-npm-pkg.sh
    ```

These steps will generate the necessary WASM bindings and artifacts for the respective platforms, providing a seamless
integration experience.
