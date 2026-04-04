//! Discrete log solver WASM bindings.
//!
//! Thin wrapper around `aptos_confidential_asset_core::discrete_log`.
//! Handles serialization/deserialization and maps errors into JS-friendly format.

use aptos_confidential_asset_core::discrete_log as core_dl;
use wasm_bindgen::prelude::*;

/// Discrete log solver supporting 16-bit and 32-bit secrets.
#[wasm_bindgen]
pub struct DiscreteLogSolver {
    inner: core_dl::DiscreteLogSolver,
}

#[wasm_bindgen]
impl DiscreteLogSolver {
    /// Creates a new solver with precomputed tables.
    #[wasm_bindgen(constructor)]
    pub fn new() -> DiscreteLogSolver {
        DiscreteLogSolver {
            inner: core_dl::DiscreteLogSolver::new(),
        }
    }

    /// Solves the discrete log problem.
    ///
    /// Given a compressed Ristretto point y = g^x (32 bytes), finds x.
    ///
    /// # Arguments
    /// * `y` - The compressed Ristretto point (32 bytes)
    /// * `max_num_bits` - Maximum bits of the secret: 16 or 32
    ///
    /// # Returns
    /// The discrete log x, or an error if not found or invalid input.
    pub fn solve(&self, y: Vec<u8>, max_num_bits: u8) -> Result<u64, JsError> {
        self.inner.solve(y, max_num_bits).map_err(|e| JsError::new(&e))
    }

    /// Returns the supported bit sizes as an array [16, 32].
    pub fn max_num_bits(&self) -> Vec<u8> {
        self.inner.max_num_bits()
    }

    /// Returns the algorithm name.
    pub fn algorithm(&self) -> String {
        self.inner.algorithm()
    }
}
