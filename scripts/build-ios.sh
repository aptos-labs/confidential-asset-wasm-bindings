#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUST_DIR="$ROOT_DIR/rust"
CRATE="aptos_confidential_asset_mobile"
LIB="lib${CRATE}.a"
HEADERS_DIR="$ROOT_DIR/ios/Rust/Headers"
OUTPUT_DIR="$ROOT_DIR/ios/Rust/Binaries"
FRAMEWORK_DIR="$OUTPUT_DIR/ConfidentialAsset.xcframework"

DEVICE_TARGET="aarch64-apple-ios"
SIM_TARGETS=("aarch64-apple-ios-sim" "x86_64-apple-ios")
ALL_TARGETS=("$DEVICE_TARGET" "${SIM_TARGETS[@]}")

SIM_OUTPUT_DIR="$(mktemp -d)"
trap 'rm -rf "$SIM_OUTPUT_DIR"' EXIT

rustup target add "${ALL_TARGETS[@]}" >/dev/null

cargo build \
  --manifest-path "$RUST_DIR/Cargo.toml" \
  -p "$CRATE" --release \
  --target "$DEVICE_TARGET" &

for target in "${SIM_TARGETS[@]}"; do
  cargo build \
    --manifest-path "$RUST_DIR/Cargo.toml" \
    -p "$CRATE" --release \
    --target "$target" &
done
wait

lipo -create \
  "$RUST_DIR/target/aarch64-apple-ios-sim/release/$LIB" \
  "$RUST_DIR/target/x86_64-apple-ios/release/$LIB" \
  -output "$SIM_OUTPUT_DIR/$LIB"

rm -rf "$FRAMEWORK_DIR"
mkdir -p "$OUTPUT_DIR"

xcodebuild -create-xcframework \
  -library "$RUST_DIR/target/$DEVICE_TARGET/release/$LIB" -headers "$HEADERS_DIR" \
  -library "$SIM_OUTPUT_DIR/$LIB" -headers "$HEADERS_DIR" \
  -output "$FRAMEWORK_DIR"
