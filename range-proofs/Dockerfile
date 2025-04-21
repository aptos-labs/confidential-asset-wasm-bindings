# Use the Rust image with wasm-pack
FROM rust:latest

# Install wasm-pack and clang (for building dependencies)
RUN apt-get update && \
    apt-get install -y clang && \
    cargo install wasm-pack

# Set up the working directory
WORKDIR /usr/src/app

# Copy only the range-proofs folder into the container
COPY ../.. .

# Change the working directory to the current crate
WORKDIR /usr/src/app

# Ensure the output directory exists
RUN mkdir -p pkg

# Build the WASM module
CMD ["wasm-pack", "build", "--release", "--target", "web", "-d", "pkg"]
