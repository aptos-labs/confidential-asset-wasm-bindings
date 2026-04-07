//! Range proof WASM bindings.
//!
//! Thin wrapper around `aptos_confidential_asset_core::range_proof`.
//! Handles serialization/deserialization and maps errors into JS-friendly format.

use aptos_confidential_asset_core::range_proof as core_rp;
use wasm_bindgen::prelude::*;

/// Result of a batch range proof generation
#[wasm_bindgen]
pub struct BatchRangeProof {
    inner: core_rp::BatchRangeProof,
}

#[wasm_bindgen]
impl BatchRangeProof {
    /// Returns the serialized proof bytes
    pub fn proof(&self) -> Vec<u8> {
        self.inner.proof()
    }

    /// Returns the serialized commitments (each 32 bytes)
    pub fn comms(&self) -> Vec<js_sys::Uint8Array> {
        self.inner
            .comms()
            .iter()
            .map(|c| js_sys::Uint8Array::from(c.as_slice()))
            .collect()
    }
}

/// Generate a batch range proof for multiple values.
///
/// # Arguments
/// * `v` - The secret values to prove are in range [0, 2^num_bits)
/// * `rs` - The blinding factors (each 32-byte scalar)
/// * `val_base` - Value base point for Pedersen commitment (32-byte compressed point)
/// * `rand_base` - Randomness base point for Pedersen commitment (32-byte compressed point)
/// * `num_bits` - Bit length for range proof (8, 16, 32, or 64)
#[wasm_bindgen]
pub fn batch_range_proof(
    v: Vec<u64>,
    rs: Vec<js_sys::Uint8Array>,
    val_base: Vec<u8>,
    rand_base: Vec<u8>,
    num_bits: usize,
) -> Result<BatchRangeProof, JsError> {
    let rs: Vec<Vec<u8>> = rs.iter().map(|arr| arr.to_vec()).collect();
    core_rp::batch_range_proof(v, rs, val_base, rand_base, num_bits)
        .map(|inner| BatchRangeProof { inner })
        .map_err(|e| JsError::new(&e))
}

/// Verify a batch range proof.
#[wasm_bindgen]
pub fn batch_verify_proof(
    proof: Vec<u8>,
    comms: Vec<js_sys::Uint8Array>,
    val_base: Vec<u8>,
    rand_base: Vec<u8>,
    num_bits: usize,
) -> Result<bool, JsError> {
    let comms: Vec<Vec<u8>> = comms.iter().map(|arr| arr.to_vec()).collect();
    core_rp::batch_verify_proof(proof, comms, val_base, rand_base, num_bits)
        .map_err(|e| JsError::new(&e))
}
