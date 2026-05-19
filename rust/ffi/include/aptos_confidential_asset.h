/**
 * C ABI for Aptos confidential asset (range proofs + discrete log).
 * Canonical header for Go, C++, and other FFI consumers.
 * Keep in sync with rust/ffi/src/abi.rs and rust/ffi/src/ffi.rs.
 */
#ifndef APTOS_CONFIDENTIAL_ASSET_H
#define APTOS_CONFIDENTIAL_ASSET_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
  uint8_t *ptr;
  size_t len;
  size_t capacity;
} ConfidentialAssetByteBuffer;

typedef struct {
  ConfidentialAssetByteBuffer proof;
  ConfidentialAssetByteBuffer comms_flat;
  size_t count;
  ConfidentialAssetByteBuffer error;
} ConfidentialAssetBatchRangeProofResult;

typedef struct {
  bool value;
  ConfidentialAssetByteBuffer error;
} ConfidentialAssetBoolResult;

typedef struct {
  ConfidentialAssetByteBuffer value;
  ConfidentialAssetByteBuffer error;
} ConfidentialAssetBytesResult;

void confidential_asset_free_cstring(char *ptr);
void confidential_asset_free_buffer(ConfidentialAssetByteBuffer buffer);

ConfidentialAssetBatchRangeProofResult confidential_asset_batch_range_proof(
    const uint64_t *values_ptr, size_t values_len,
    const uint8_t *blindings_flat_ptr, size_t blindings_flat_len,
    const uint8_t *val_base_ptr, size_t val_base_len,
    const uint8_t *rand_base_ptr, size_t rand_base_len,
    size_t num_bits);

ConfidentialAssetBoolResult confidential_asset_batch_verify_proof(
    const uint8_t *proof_ptr, size_t proof_len,
    const uint8_t *comms_flat_ptr, size_t comms_flat_len,
    const uint8_t *val_base_ptr, size_t val_base_len,
    const uint8_t *rand_base_ptr, size_t rand_base_len,
    size_t num_bits);

void *confidential_asset_create_solver(void);
void confidential_asset_free_solver(void *ptr);
ConfidentialAssetBytesResult confidential_asset_solver_solve(
    void *ptr,
    const uint8_t *y_ptr, size_t y_len,
    uint8_t max_num_bits);

#ifdef __cplusplus
}
#endif

#endif /* APTOS_CONFIDENTIAL_ASSET_H */
