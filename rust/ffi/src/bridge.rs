//! Shared Rust API used by the C ABI (`ffi`) and Android JNI (`jni`).

use crate::shared::{
    sanitize_external_error, split_exact_chunks, validate_discrete_log_max_num_bits,
    validate_flat_buffer_len, validate_range_num_bits, RANGE_PROOF_BATCH_ELEMENT_BYTES,
};
use aptos_confidential_asset_core::{
    discrete_log::DiscreteLogSolver,
    range_proof::{
        batch_range_proof as core_batch_range_proof, batch_verify_proof as core_batch_verify_proof,
    },
};

pub struct BatchRangeProofOutput {
    pub proof: Vec<u8>,
    pub comms_flat: Vec<u8>,
    pub count: usize,
}

pub fn batch_range_proof(
    values: &[u64],
    blindings_flat: &[u8],
    val_base: Vec<u8>,
    rand_base: Vec<u8>,
    num_bits: usize,
) -> Result<BatchRangeProofOutput, String> {
    validate_range_num_bits(num_bits)?;
    validate_flat_buffer_len(
        blindings_flat.len(),
        values.len(),
        RANGE_PROOF_BATCH_ELEMENT_BYTES,
        "blindings_flat",
    )?;

    let rs = split_exact_chunks(
        blindings_flat,
        values.len(),
        RANGE_PROOF_BATCH_ELEMENT_BYTES,
        "blindings_flat",
    )?;

    match core_batch_range_proof(values, rs, val_base, rand_base, num_bits) {
        Ok(result) => {
            let count = result.comms.len();
            let comms_flat: Vec<u8> = result.comms.into_iter().flatten().collect();
            Ok(BatchRangeProofOutput {
                proof: result.proof,
                comms_flat,
                count,
            })
        }
        Err(error) => Err(sanitize_external_error(error)),
    }
}

pub fn batch_verify_proof(
    proof: Vec<u8>,
    comms_flat: &[u8],
    val_base: Vec<u8>,
    rand_base: Vec<u8>,
    num_bits: usize,
) -> Result<bool, String> {
    validate_range_num_bits(num_bits)?;

    let comm_count = comms_flat.len() / RANGE_PROOF_BATCH_ELEMENT_BYTES;
    let comms = split_exact_chunks(
        comms_flat,
        comm_count,
        RANGE_PROOF_BATCH_ELEMENT_BYTES,
        "comms_flat",
    )?;

    match core_batch_verify_proof(proof, comms, val_base, rand_base, num_bits) {
        Ok(result) => Ok(result),
        Err(error) => Err(sanitize_external_error(error)),
    }
}

pub fn create_solver() -> DiscreteLogSolver {
    DiscreteLogSolver::new()
}

pub fn solver_solve(solver: &DiscreteLogSolver, y: Vec<u8>, max_num_bits: u8) -> Result<u64, String> {
    validate_discrete_log_max_num_bits(usize::from(max_num_bits))?;
    match solver.solve(y, max_num_bits) {
        Ok(result) => Ok(result),
        Err(error) => Err(sanitize_external_error(error)),
    }
}
