# aptos-wasm-bindings

## Generating WASM Bindings

To generate WASM bindings, follow these steps:

1. Navigate to the `aptos-wasm` folder.
2. Inside the `aptos-wasm` directory, locate the subdirectories that contain the platform-specific scripts for WASM
   generation.
3. Run the respective scripts for each platform:

    - **macOS**: Ensure Docker is installed on your machine, then execute `build-wasm.sh` in each subdirectory.
      ```bash
      ./build-wasm.sh
      ```

    - **Linux**: Use `wasm-pack` to build the bindings in each subdirectory by running the following command:
      ```bash
      wasm-pack build --release --target web -d "$dir/pkg"
      ```

      Replace `$dir` with the name of the specific subdirectory you are working in.

4. Once WASM bindings have been generated in all subdirectories, you can create a unified package by running the
   `gen-npm-pkg.sh` script at the root of the project:
    ```bash
    ./gen-npm-pkg.sh
    ```

These steps will generate the necessary WASM bindings and artifacts for the respective platforms, providing a seamless
integration experience.
