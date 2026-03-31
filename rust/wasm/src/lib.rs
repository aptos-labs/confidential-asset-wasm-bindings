//! Unified WASM bindings for Aptos confidential asset.
//!
//! This crate combines discrete log solving and range proof functionality
//! into a single WASM module, reducing overall binary size by sharing
//! the curve25519-dalek elliptic curve library.
//!
//! ## Features
//!
//! - **Range Proofs**: Generate and verify Bulletproof range proofs
//! - **Discrete Log**: Solve discrete log problems for 16-bit and 32-bit values
//!
//! ## Algorithm Selection (compile-time)
//!
//! The discrete log algorithm can be selected via feature flags:
//! - `tbsgs_k` (default): Truncated Baby-Step Giant-Step with batch size 32
//! - `bsgs_k`: Baby-Step Giant-Step with batch size 32
//! - `bsgs`: Standard Baby-Step Giant-Step
//! - `bl12`: Bernstein-Lange 2012 (smallest table, slower)

use wasm_bindgen::prelude::*;

/// Installs a panic hook that forwards Rust panic messages to `console.error`.
/// Called automatically on WASM init. Without this, panics surface as an
/// opaque `RuntimeError: unreachable` with no message.
#[wasm_bindgen(start)]
pub fn init() {
    std::panic::set_hook(Box::new(|info| {
        web_sys::console::error_1(&format!("{info}").into());
    }));
}

pub mod discrete_log;
pub mod range_proof;
