#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUST_DIR="$ROOT_DIR/rust"
CRATE="aptos_confidential_asset_mobile"
OUTPUT_DIR="$ROOT_DIR/android/src/main/jniLibs"

ANDROID_TARGETS=("aarch64-linux-android" "armv7-linux-androideabi" "x86_64-linux-android")

if ! command -v cargo-ndk >/dev/null 2>&1; then
  cargo install cargo-ndk --locked
fi

mkdir -p "$OUTPUT_DIR"

rustup target add "${ANDROID_TARGETS[@]}" >/dev/null

cd "$RUST_DIR"

cargo ndk \
  -t armeabi-v7a \
  -t arm64-v8a \
  -t x86_64 \
  -o "$OUTPUT_DIR" \
  build -p "$CRATE" --release
