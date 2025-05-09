pub mod rp;

use wasm_bindgen::prelude::*;
use bulletproofs::{BulletproofGens, PedersenGens};
use curve25519_dalek_ng::ristretto::{CompressedRistretto};
use curve25519_dalek_ng::scalar::Scalar;
use merlin::Transcript;
use once_cell::sync::Lazy;
use zerocopy::AsBytes;

const MAX_RANGE_BITS: usize = 64;

static BULLETPROOF_DST: &[u8] = b"AptosConfidentialAsset/BulletproofRangeProof";
static BULLETPROOF_GENERATORS: Lazy<BulletproofGens> = Lazy::new(|| BulletproofGens::new(MAX_RANGE_BITS, 16));

#[wasm_bindgen]
pub struct RangeProof {
    proof: Vec<u8>,
    comm: Vec<u8>,
}

#[wasm_bindgen]
impl RangeProof {
    pub fn proof(&self) -> Vec<u8> {
        self.proof.clone()
    }

    pub fn comm(&self) -> Vec<u8> {
        self.comm.clone()
    }
}

#[wasm_bindgen]
pub fn range_proof(
    v: u64,
    r: Vec<u8>,
    val_base: Vec<u8>,
    rand_base: Vec<u8>,
    num_bits: usize,
) -> Result<RangeProof, JsError> {
    let val_base: [u8; 32] = val_base
        .try_into()
        .map_err(|e| JsError::new(&format!("`val_base` must be exactly 32 bytes: {:?}", e)))?;
    let rand_base: [u8; 32] = rand_base
        .try_into()
        .map_err(|e| JsError::new(&format!("`rand_base` must be exactly 32 bytes: {:?}", e)))?;
    let r: [u8; 32] = r
        .try_into()
        .map_err(|e| JsError::new(&format!("`r` must be exactly 32 bytes: {:?}", e)))?;

    let pg = PedersenGens {
        B: CompressedRistretto(val_base).decompress().ok_or_else(|| JsError::new("failed to decompress `val_base`"))?,
        B_blinding: CompressedRistretto(rand_base).decompress().ok_or_else(|| JsError::new("failed to decompress `rand_base`"))?,
    };

    let (proof, comm) = bulletproofs::RangeProof::prove_single(
        &BULLETPROOF_GENERATORS,
        &pg,
        &mut Transcript::new(BULLETPROOF_DST),
        v,
        &Scalar::from_bytes_mod_order(r),
        num_bits,
    )?;

    Ok(RangeProof {
        proof: proof.to_bytes(),
        comm: Vec::from(comm.to_bytes()),
    })
}

#[wasm_bindgen]
pub struct BatchRangeProof {
    proof: Vec<u8>,
    comms: Vec<js_sys::Uint8Array>,
}

#[wasm_bindgen]
impl BatchRangeProof {
    pub fn proof(&self) -> Vec<u8> {
        self.proof.clone()
    }

    pub fn comms(&self) -> Vec<js_sys::Uint8Array> {
        self.comms.clone()
    }
}

#[wasm_bindgen]
pub fn batch_range_proof(
    v: Vec<u64>,
    rs: Vec<js_sys::Uint8Array>,
    val_base: Vec<u8>,
    rand_base: Vec<u8>,
    num_bits: usize,
) -> Result<BatchRangeProof, JsError> {
    let r: Vec<Vec<u8>> = rs
        .iter()
        .map(|arr| arr.to_vec())
        .collect();

    let proof_result = rp::_batch_range_proof(v, r, val_base, rand_base, num_bits)
        .map_err(|e| JsError::new(&format!("failed to generate range proof: {:?}", e)))?;

    let serialized_comms: Vec<js_sys::Uint8Array> = proof_result
        .comms
        .iter()
        .map(|comm| js_sys::Uint8Array::from(&comm.as_bytes()[..]))
        .collect();

    Ok(BatchRangeProof {
        proof: proof_result.proof.clone(),
        comms: serialized_comms,
    })
}

#[wasm_bindgen]
pub fn batch_verify_proof(
    proof: Vec<u8>,
    comm: Vec<js_sys::Uint8Array>,
    val_base: Vec<u8>,
    rand_base: Vec<u8>,
    num_bits: usize,
) -> Result<bool, JsError> {
    let val_base: [u8; 32] = val_base
        .try_into()
        .map_err(|e| JsError::new(&format!("`val_base` must be exactly 32 bytes: {:?}", e)))?;
    let rand_base: [u8; 32] = rand_base
        .try_into()
        .map_err(|e| JsError::new(&format!("`rand_base` must be exactly 32 bytes: {:?}", e)))?;
    let comm: Vec<CompressedRistretto> = comm
        .iter()
        .map(|arr| {
            CompressedRistretto::from_slice(&arr.to_vec())
        })
        .collect();

    if comm.is_empty() {
        return Err(JsError::new("`comm` cannot be empty"));
    }

    let pg = PedersenGens {
        B: CompressedRistretto(val_base).decompress().ok_or_else(|| JsError::new("failed to decompress `val_base`"))?,
        B_blinding: CompressedRistretto(rand_base).decompress().ok_or_else(|| JsError::new("failed to decompress `rand_base`"))?,
    };

    let proof = bulletproofs::RangeProof::from_bytes(proof.as_slice())
        .map_err(|e| JsError::new(&format!("error deserializing range proof: {:?}", e)))?;
    let ok = proof.verify_multiple(
        &BULLETPROOF_GENERATORS,
        &pg,
        &mut Transcript::new(BULLETPROOF_DST),
        &comm,
        num_bits,
    ).is_ok();

    Ok(ok)
}

#[wasm_bindgen]
pub fn verify_proof(
    proof: Vec<u8>,
    comm: Vec<u8>,
    val_base: Vec<u8>,
    rand_base: Vec<u8>,
    num_bits: usize,
) -> Result<bool, JsError> {
    let val_base: [u8; 32] = val_base
        .try_into()
        .map_err(|e| JsError::new(&format!("`val_base` must be exactly 32 bytes: {:?}", e)))?;
    let rand_base: [u8; 32] = rand_base
        .try_into()
        .map_err(|e| JsError::new(&format!("`rand_base` must be exactly 32 bytes: {:?}", e)))?;
    let comm: [u8; 32] = comm
        .try_into()
        .map_err(|e| JsError::new(&format!("`comm` must be exactly 32 bytes: {:?}", e)))?;

    let pg = PedersenGens {
        B: CompressedRistretto(val_base).decompress().ok_or_else(|| JsError::new("failed to decompress `val_base`"))?,
        B_blinding: CompressedRistretto(rand_base).decompress().ok_or_else(|| JsError::new("failed to decompress `rand_base`"))?,
    };

    let proof = bulletproofs::RangeProof::from_bytes(proof.as_slice())
        .map_err(|e| JsError::new(&format!("error deserializing range proof: {:?}", e)))?;
    let ok = proof.verify_single(
        &BULLETPROOF_GENERATORS,
        &pg,
        &mut Transcript::new(BULLETPROOF_DST),
        &CompressedRistretto(comm),
        num_bits,
    ).is_ok();

    Ok(ok)
}
