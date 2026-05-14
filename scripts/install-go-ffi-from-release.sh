#!/usr/bin/env bash
# Install prebuilt FFI library for Go/cgo from GitHub Releases.
# By default it downloads the latest release asset matching the local GOOS/GOARCH/libc.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

REPO="${APTOS_FFI_REPO:-aptos-labs/confidential-asset-bindings}"
VERSION="${1:-latest}" # "latest" or explicit tag like "v1.2.3"
GOOS_VAL="${GOOS:-$(go env GOOS)}"
GOARCH_VAL="${GOARCH:-$(go env GOARCH)}"
LIBC_HINT="${APTOS_GO_LIBC:-auto}" # auto | gnu | musl (Linux only)

detect_linux_libc() {
  if [[ "${LIBC_HINT}" == "gnu" || "${LIBC_HINT}" == "musl" ]]; then
    echo "${LIBC_HINT}"
    return
  fi
  if command -v ldd >/dev/null 2>&1 && ldd --version 2>&1 | grep -qi musl; then
    echo "musl"
  else
    echo "gnu"
  fi
}

target_triple=""
lib_name=""
case "${GOOS_VAL}/${GOARCH_VAL}" in
  linux/amd64)
    case "$(detect_linux_libc)" in
      musl) target_triple="x86_64-unknown-linux-musl" ;;
      *) target_triple="x86_64-unknown-linux-gnu" ;;
    esac
    lib_name="libaptos_confidential_asset_ffi.a"
    ;;
  linux/arm64)
    case "$(detect_linux_libc)" in
      musl) target_triple="aarch64-unknown-linux-musl" ;;
      *) target_triple="aarch64-unknown-linux-gnu" ;;
    esac
    lib_name="libaptos_confidential_asset_ffi.a"
    ;;
  darwin/amd64)
    target_triple="x86_64-apple-darwin"
    lib_name="libaptos_confidential_asset_ffi.a"
    ;;
  darwin/arm64)
    target_triple="aarch64-apple-darwin"
    lib_name="libaptos_confidential_asset_ffi.a"
    ;;
  windows/amd64)
    target_triple="x86_64-pc-windows-msvc"
    lib_name="aptos_confidential_asset_ffi.lib"
    ;;
  windows/arm64)
    target_triple="aarch64-pc-windows-msvc"
    lib_name="aptos_confidential_asset_ffi.lib"
    ;;
  *)
    echo "unsupported GOOS/GOARCH: ${GOOS_VAL}/${GOARCH_VAL}" >&2
    exit 1
    ;;
esac

archive_ext="tar.gz"
if [[ "${target_triple}" == *"windows-msvc" ]]; then
  archive_ext="zip"
fi
asset_name="aptos_confidential_asset_ffi-${target_triple}.${archive_ext}"

if [[ "${VERSION}" == "latest" ]]; then
  asset_url="https://github.com/${REPO}/releases/latest/download/${asset_name}"
  sums_url="https://github.com/${REPO}/releases/latest/download/SHA256SUMS"
else
  asset_url="https://github.com/${REPO}/releases/download/${VERSION}/${asset_name}"
  sums_url="https://github.com/${REPO}/releases/download/${VERSION}/SHA256SUMS"
fi

tmp_dir="$(mktemp -d)"
cleanup() { rm -rf "${tmp_dir}"; }
trap cleanup EXIT

echo "repo:    ${REPO}"
echo "version: ${VERSION}"
echo "target:  ${target_triple}"
echo "asset:   ${asset_name}"
echo "downloading release assets..."

curl -fL --retry 3 --retry-delay 1 -o "${tmp_dir}/${asset_name}" "${asset_url}"
curl -fL --retry 3 --retry-delay 1 -o "${tmp_dir}/SHA256SUMS" "${sums_url}"

(
  cd "${tmp_dir}"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum -c SHA256SUMS --ignore-missing "${asset_name}"
  elif command -v shasum >/dev/null 2>&1; then
    expected="$(awk -v f="${asset_name}" '$2 == f {print $1}' SHA256SUMS)"
    actual="$(shasum -a 256 "${asset_name}" | awk '{print $1}')"
    [[ -n "${expected}" && "${expected}" == "${actual}" ]]
  else
    echo "warning: no sha256 tool found; skip checksum verification" >&2
  fi
)

echo "extracting ${asset_name}..."
if [[ "${archive_ext}" == "zip" ]]; then
  unzip -q "${tmp_dir}/${asset_name}" -d "${tmp_dir}/extract"
else
  tar -xzf "${tmp_dir}/${asset_name}" -C "${tmp_dir}/extract"
fi

src_lib="${tmp_dir}/extract/${target_triple}/${lib_name}"
src_header="${tmp_dir}/extract/${target_triple}/aptos_confidential_asset.h"
if [[ ! -f "${src_lib}" ]]; then
  echo "library not found in archive: ${src_lib}" >&2
  exit 1
fi
if [[ ! -f "${src_header}" ]]; then
  echo "header not found in archive: ${src_header}" >&2
  exit 1
fi

mkdir -p "${ROOT}/rust/target/${target_triple}/release"
mkdir -p "${ROOT}/rust/target/release"
mkdir -p "${ROOT}/rust/ffi/include"

cp "${src_lib}" "${ROOT}/rust/target/${target_triple}/release/${lib_name}"
cp "${src_header}" "${ROOT}/rust/ffi/include/aptos_confidential_asset.h"

# Non-musl cgo files in this repo link rust/target/release/.
if [[ "${target_triple}" == *"unknown-linux-gnu" || "${target_triple}" == *"apple-darwin" || "${target_triple}" == *"windows-msvc" ]]; then
  cp "${src_lib}" "${ROOT}/rust/target/release/${lib_name}"
fi

echo "installed:"
echo "  ${ROOT}/rust/target/${target_triple}/release/${lib_name}"
if [[ "${target_triple}" == *"unknown-linux-gnu" || "${target_triple}" == *"apple-darwin" || "${target_triple}" == *"windows-msvc" ]]; then
  echo "  ${ROOT}/rust/target/release/${lib_name}"
fi
echo "next:"
echo "  cd bindings/go && go test ./aptosconfidential/..."
