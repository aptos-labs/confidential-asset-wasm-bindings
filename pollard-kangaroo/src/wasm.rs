use curve25519_dalek_ng::ristretto::CompressedRistretto;
use wasm_bindgen::prelude::*;
use pollard_kangaroo::kangaroo::Kangaroo;
use pollard_kangaroo::kangaroo::presets::Presets;

#[wasm_bindgen]
pub struct WASMKangaroo(Kangaroo);

#[wasm_bindgen]
pub fn create_kangaroo(secret_size: u8) -> Result<WASMKangaroo, JsError> {
    let preset = match secret_size {
        16 => Presets::Kangaroo16,
        32 => Presets::Kangaroo32,
        48 => Presets::Kangaroo48,
        _ => return Err(JsError::new("invalid secret size")),
    };

    let kangaroo = Kangaroo::from_preset(preset)
        .map_err(|_| JsError::new("failed to create kangaroo"))?;

    Ok(WASMKangaroo(kangaroo))
}

#[wasm_bindgen]
impl WASMKangaroo {
    pub fn solve_dlp(&self, pk: Vec<u8>, max_time: Option<u64>) -> Result<Option<u64>, JsError> {
        let pk = CompressedRistretto::from_slice(&pk)
            .decompress()
            .ok_or_else(|| JsError::new("invalid point"))?;

        Ok(self.0.solve_dlp(&pk, max_time).map_err(|_| JsError::new("failed to solve dlp"))?)
    }
}
