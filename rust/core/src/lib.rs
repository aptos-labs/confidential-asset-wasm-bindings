//! Pure Rust core logic for Aptos confidential asset.
//!
//! This crate contains all crypto/computation logic without any WASM or JS dependencies.
//! It is intended to be wrapped by `aptos_confidential_asset_wasm` for browser use.
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

pub mod discrete_log;
pub mod range_proof;
