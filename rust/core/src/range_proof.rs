//! Range proof functionality using Bulletproofs v5.0.0.
//!
//! Provides pure Rust functions for generating and verifying range proofs.

use bulletproofs::{BulletproofGens, PedersenGens, RangeProof};
use curve25519_dalek::ristretto::CompressedRistretto;
use curve25519_dalek::scalar::Scalar;
use merlin::Transcript;
use once_cell::sync::Lazy;

const MAX_RANGE_BITS: usize = 64;

/// Domain separation tag for Aptos confidential asset range proofs.
/// This MUST match what aptos-core expects.
pub static BULLETPROOF_DST: &[u8] = b"AptosConfidentialAsset/BulletproofRangeProof";

/// Shared Bulletproof generators (supports up to 64-bit proofs with batch size 16)
pub static BULLETPROOF_GENERATORS: Lazy<BulletproofGens> =
    Lazy::new(|| BulletproofGens::new(MAX_RANGE_BITS, 16));

/// Result of a batch range proof generation
pub struct BatchRangeProof {
    pub proof: Vec<u8>,
    pub comms: Vec<Vec<u8>>,
}

impl BatchRangeProof {
    /// Returns the serialized proof bytes
    pub fn proof(&self) -> Vec<u8> {
        self.proof.clone()
    }

    /// Returns the serialized commitments (each 32 bytes)
    pub fn comms(&self) -> Vec<Vec<u8>> {
        self.comms.clone()
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
pub fn batch_range_proof(
    v: Vec<u64>,
    rs: Vec<Vec<u8>>,
    val_base: Vec<u8>,
    rand_base: Vec<u8>,
    num_bits: usize,
) -> Result<BatchRangeProof, String> {
    let val_base: [u8; 32] = val_base
        .try_into()
        .map_err(|e| format!("`val_base` must be exactly 32 bytes: {:?}", e))?;
    let rand_base: [u8; 32] = rand_base
        .try_into()
        .map_err(|e| format!("`rand_base` must be exactly 32 bytes: {:?}", e))?;

    let pg = PedersenGens {
        B: CompressedRistretto::from_slice(&val_base)
            .map_err(|_| "invalid val_base point".to_string())?
            .decompress()
            .ok_or_else(|| "failed to decompress `val_base`".to_string())?,
        B_blinding: CompressedRistretto::from_slice(&rand_base)
            .map_err(|_| "invalid rand_base point".to_string())?
            .decompress()
            .ok_or_else(|| "failed to decompress `rand_base`".to_string())?,
    };

    let r_scalars: Result<Vec<Scalar>, String> = rs
        .iter()
        .map(|arr| {
            let bytes: [u8; 32] = arr
                .clone()
                .try_into()
                .map_err(|_| "each blinding factor must be 32 bytes".to_string())?;
            Ok(Scalar::from_bytes_mod_order(bytes))
        })
        .collect();
    let r_scalars = r_scalars?;

    let (proof, comms) = RangeProof::prove_multiple(
        &BULLETPROOF_GENERATORS,
        &pg,
        &mut Transcript::new(BULLETPROOF_DST),
        &v,
        &r_scalars,
        num_bits,
    )
    .map_err(|e| e.to_string())?;

    let serialized_comms: Vec<Vec<u8>> = comms
        .iter()
        .map(|comm| comm.to_bytes().to_vec())
        .collect();

    Ok(BatchRangeProof {
        proof: proof.to_bytes(),
        comms: serialized_comms,
    })
}

/// Verify a batch range proof.
pub fn batch_verify_proof(
    proof: Vec<u8>,
    comms: Vec<Vec<u8>>,
    val_base: Vec<u8>,
    rand_base: Vec<u8>,
    num_bits: usize,
) -> Result<bool, String> {
    let val_base: [u8; 32] = val_base
        .try_into()
        .map_err(|e| format!("`val_base` must be exactly 32 bytes: {:?}", e))?;
    let rand_base: [u8; 32] = rand_base
        .try_into()
        .map_err(|e| format!("`rand_base` must be exactly 32 bytes: {:?}", e))?;

    if comms.is_empty() {
        return Err("`comms` cannot be empty".to_string());
    }

    let pg = PedersenGens {
        B: CompressedRistretto::from_slice(&val_base)
            .map_err(|_| "invalid val_base point".to_string())?
            .decompress()
            .ok_or_else(|| "failed to decompress `val_base`".to_string())?,
        B_blinding: CompressedRistretto::from_slice(&rand_base)
            .map_err(|_| "invalid rand_base point".to_string())?
            .decompress()
            .ok_or_else(|| "failed to decompress `rand_base`".to_string())?,
    };

    let comm_points: Result<Vec<CompressedRistretto>, String> = comms
        .iter()
        .map(|bytes| {
            CompressedRistretto::from_slice(bytes)
                .map_err(|_| "invalid commitment point".to_string())
        })
        .collect();
    let comm_points = comm_points?;

    let proof = RangeProof::from_bytes(&proof)
        .map_err(|e| format!("error deserializing range proof: {:?}", e))?;

    let ok = proof
        .verify_multiple(
            &BULLETPROOF_GENERATORS,
            &pg,
            &mut Transcript::new(BULLETPROOF_DST),
            &comm_points,
            num_bits,
        )
        .is_ok();

    Ok(ok)
}
