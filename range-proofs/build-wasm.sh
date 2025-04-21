#!/bin/bash

# Set variables
IMAGE_NAME="range-proofs-aptos-wasm-builder"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTAINER_WORKDIR="/usr/src/app"
LOCAL_PKG_DIR="$SCRIPT_DIR/pkg"

# Ensure the local pkg directory exists
mkdir -p "$LOCAL_PKG_DIR"

# Step 1: Build the Docker image
echo "Building Docker image: $IMAGE_NAME..."
docker build -t "$IMAGE_NAME" "$SCRIPT_DIR"

# Step 2: Run the Docker container to build WASM
echo "Running Docker container to build WASM..."
docker run --rm \
  -v "$LOCAL_PKG_DIR:$CONTAINER_WORKDIR/pkg" \
  -w "$CONTAINER_WORKDIR" \
  "$IMAGE_NAME"

# Step 3: Verify the output
if [ "$(ls -A $LOCAL_PKG_DIR)" ]; then
  echo "WASM build complete. Files are available in the $LOCAL_PKG_DIR directory:"
  ls "$LOCAL_PKG_DIR"
else
  echo "Error: The pkg directory is empty. Something went wrong with the build."
  exit 1
fi
