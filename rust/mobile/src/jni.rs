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
use jni::{
    objects::{JByteArray, JClass, JObject},
    sys::{jboolean, jbyteArray, jint, jlong, jobjectArray, jstring, JNI_FALSE, JNI_TRUE},
    JNIEnv,
};

const U64_LE_BYTES: usize = 8;

fn throw_java(env: &mut JNIEnv, message: impl AsRef<str>) {
    let _ = env.throw_new("java/lang/Exception", message.as_ref());
}

fn new_byte_array_pair(
    env: &mut JNIEnv,
    first: &[u8],
    second: &[u8],
) -> Result<jobjectArray, String> {
    let array_class = env
        .find_class("[B")
        .map_err(|error| format!("failed to find byte[] class: {error}"))?;
    let result = env
        .new_object_array(2, array_class, JObject::null())
        .map_err(|error| format!("failed to allocate byte[][] result: {error}"))?;

    let first_array = env
        .byte_array_from_slice(first)
        .map_err(|error| format!("failed to allocate first byte[] result: {error}"))?;
    env.set_object_array_element(&result, 0, first_array)
        .map_err(|error| format!("failed to set first byte[] result: {error}"))?;

    let second_array = env
        .byte_array_from_slice(second)
        .map_err(|error| format!("failed to allocate second byte[] result: {error}"))?;
    env.set_object_array_element(&result, 1, second_array)
        .map_err(|error| format!("failed to set second byte[] result: {error}"))?;

    Ok(result.into_raw())
}

fn parse_jbyte_array(env: &mut JNIEnv, input: jbyteArray) -> Result<Vec<u8>, String> {
    let input = unsafe { JByteArray::from_raw(input) };
    env.convert_byte_array(input)
        .map_err(|error| format!("failed to read byte array: {error}"))
}

fn parse_u64_le_array(
    values_flat: &[u8],
    expected_count: usize,
    label: &str,
) -> Result<Vec<u64>, String> {
    validate_flat_buffer_len(values_flat.len(), expected_count, U64_LE_BYTES, label)?;

    values_flat
        .chunks_exact(U64_LE_BYTES)
        .map(|chunk| {
            let bytes: [u8; U64_LE_BYTES] = chunk
                .try_into()
                .map_err(|_| format!("failed to parse {label} chunk as u64"))?;
            Ok(u64::from_le_bytes(bytes))
        })
        .collect()
}

#[no_mangle]
pub extern "system" fn Java_com_aptoslabs_confidentialassetbindings_ConfidentialAssetBindingsModule_batchRangeProof(
    mut env: JNIEnv,
    _class: JClass,
    values_flat: jbyteArray,
    blindings_flat: jbyteArray,
    value_count: jint,
    val_base: jbyteArray,
    rand_base: jbyteArray,
    num_bits: jint,
) -> jobjectArray {
    let value_count = match usize::try_from(value_count) {
        Ok(value) => value,
        Err(_) => {
            throw_java(&mut env, "valueCount must be non-negative");
            return std::ptr::null_mut();
        }
    };
    let num_bits = match usize::try_from(num_bits) {
        Ok(value) => value,
        Err(_) => {
            throw_java(&mut env, "num_bits must be non-negative");
            return std::ptr::null_mut();
        }
    };
    if let Err(error) = validate_range_num_bits(num_bits) {
        throw_java(&mut env, error);
        return std::ptr::null_mut();
    }

    let values_flat = match parse_jbyte_array(&mut env, values_flat) {
        Ok(values) => values,
        Err(error) => {
            throw_java(&mut env, error);
            return std::ptr::null_mut();
        }
    };
    let numeric_values = match parse_u64_le_array(&values_flat, value_count, "values_flat") {
        Ok(values) => values,
        Err(error) => {
            throw_java(&mut env, error);
            return std::ptr::null_mut();
        }
    };
    if numeric_values.len() != value_count {
        throw_java(
            &mut env,
            format!(
                "valueCount mismatch: expected {}, received {} values",
                value_count,
                numeric_values.len()
            ),
        );
        return std::ptr::null_mut();
    }
    let blindings_flat = match parse_jbyte_array(&mut env, blindings_flat) {
        Ok(value) => value,
        Err(error) => {
            throw_java(&mut env, error);
            return std::ptr::null_mut();
        }
    };
    let val_base = match parse_jbyte_array(&mut env, val_base) {
        Ok(value) => value,
        Err(error) => {
            throw_java(&mut env, error);
            return std::ptr::null_mut();
        }
    };
    let rand_base = match parse_jbyte_array(&mut env, rand_base) {
        Ok(value) => value,
        Err(error) => {
            throw_java(&mut env, error);
            return std::ptr::null_mut();
        }
    };
    if let Err(error) = validate_flat_buffer_len(
        blindings_flat.len(),
        value_count,
        RANGE_PROOF_BATCH_ELEMENT_BYTES,
        "blindings_flat",
    ) {
        throw_java(&mut env, error);
        return std::ptr::null_mut();
    }

    let rs = match split_exact_chunks(
        &blindings_flat,
        value_count,
        RANGE_PROOF_BATCH_ELEMENT_BYTES,
        "blindings_flat",
    ) {
        Ok(chunks) => chunks,
        Err(error) => {
            throw_java(&mut env, error);
            return std::ptr::null_mut();
        }
    };

    match core_batch_range_proof(numeric_values, rs, val_base, rand_base, num_bits) {
        Ok(result) => {
            let comms_flat: Vec<u8> = result.comms.into_iter().flatten().collect();
            match new_byte_array_pair(&mut env, &result.proof, &comms_flat) {
                Ok(value) => value,
                Err(error) => {
                    throw_java(&mut env, error);
                    std::ptr::null_mut()
                }
            }
        }
        Err(error) => {
            throw_java(&mut env, sanitize_external_error(error));
            std::ptr::null_mut()
        }
    }
}

#[no_mangle]
pub extern "system" fn Java_com_aptoslabs_confidentialassetbindings_ConfidentialAssetBindingsModule_batchVerifyProof(
    mut env: JNIEnv,
    _class: JClass,
    proof: jbyteArray,
    comms_flat: jbyteArray,
    comm_count: jint,
    val_base: jbyteArray,
    rand_base: jbyteArray,
    num_bits: jint,
) -> jboolean {
    let comm_count = match usize::try_from(comm_count) {
        Ok(value) => value,
        Err(_) => {
            throw_java(&mut env, "commCount must be non-negative");
            return JNI_FALSE;
        }
    };
    let num_bits = match usize::try_from(num_bits) {
        Ok(value) => value,
        Err(_) => {
            throw_java(&mut env, "num_bits must be non-negative");
            return JNI_FALSE;
        }
    };
    if let Err(error) = validate_range_num_bits(num_bits) {
        throw_java(&mut env, error);
        return JNI_FALSE;
    }

    let proof = match parse_jbyte_array(&mut env, proof) {
        Ok(value) => value,
        Err(error) => {
            throw_java(&mut env, error);
            return JNI_FALSE;
        }
    };
    let comms_flat = match parse_jbyte_array(&mut env, comms_flat) {
        Ok(value) => value,
        Err(error) => {
            throw_java(&mut env, error);
            return JNI_FALSE;
        }
    };
    if let Err(error) = validate_flat_buffer_len(
        comms_flat.len(),
        comm_count,
        RANGE_PROOF_BATCH_ELEMENT_BYTES,
        "comms_flat",
    ) {
        throw_java(&mut env, error);
        return JNI_FALSE;
    }
    let val_base = match parse_jbyte_array(&mut env, val_base) {
        Ok(value) => value,
        Err(error) => {
            throw_java(&mut env, error);
            return JNI_FALSE;
        }
    };
    let rand_base = match parse_jbyte_array(&mut env, rand_base) {
        Ok(value) => value,
        Err(error) => {
            throw_java(&mut env, error);
            return JNI_FALSE;
        }
    };

    let comms = match split_exact_chunks(
        &comms_flat,
        comm_count,
        RANGE_PROOF_BATCH_ELEMENT_BYTES,
        "comms_flat",
    ) {
        Ok(chunks) => chunks,
        Err(error) => {
            throw_java(&mut env, error);
            return JNI_FALSE;
        }
    };

    match core_batch_verify_proof(proof, comms, val_base, rand_base, num_bits) {
        Ok(true) => JNI_TRUE,
        Ok(false) => JNI_FALSE,
        Err(error) => {
            throw_java(&mut env, sanitize_external_error(error));
            JNI_FALSE
        }
    }
}

#[no_mangle]
pub extern "system" fn Java_com_aptoslabs_confidentialassetbindings_ConfidentialAssetBindingsModule_createSolver(
    _env: JNIEnv,
    _class: JClass,
) -> jlong {
    Box::into_raw(Box::new(DiscreteLogSolver::new())) as jlong
}

#[no_mangle]
pub extern "system" fn Java_com_aptoslabs_confidentialassetbindings_ConfidentialAssetBindingsModule_freeSolver(
    _env: JNIEnv,
    _class: JClass,
    pointer: jlong,
) {
    if pointer != 0 {
        unsafe { drop(Box::from_raw(pointer as *mut DiscreteLogSolver)) };
    }
}

#[no_mangle]
pub extern "system" fn Java_com_aptoslabs_confidentialassetbindings_ConfidentialAssetBindingsModule_solverSolve(
    mut env: JNIEnv,
    _class: JClass,
    pointer: jlong,
    y: jbyteArray,
    max_num_bits: jint,
) -> jstring {
    let max_num_bits = match usize::try_from(max_num_bits) {
        Ok(value) => value,
        Err(_) => {
            throw_java(&mut env, "maxNumBits must be non-negative");
            return std::ptr::null_mut();
        }
    };
    let max_num_bits = match validate_discrete_log_max_num_bits(max_num_bits) {
        Ok(value) => value,
        Err(error) => {
            throw_java(&mut env, error);
            return std::ptr::null_mut();
        }
    };
    if pointer == 0 {
        throw_java(&mut env, "received null solver pointer");
        return std::ptr::null_mut();
    }
    let solver = unsafe { &*(pointer as *const DiscreteLogSolver) };

    let y = match parse_jbyte_array(&mut env, y) {
        Ok(value) => value,
        Err(error) => {
            throw_java(&mut env, error);
            return std::ptr::null_mut();
        }
    };

    match solver.solve(y, max_num_bits) {
        Ok(result) => match env.new_string(result.to_string()) {
            Ok(value) => value.into_raw(),
            Err(error) => {
                throw_java(&mut env, error.to_string());
                std::ptr::null_mut()
            }
        },
        Err(error) => {
            throw_java(&mut env, sanitize_external_error(error));
            std::ptr::null_mut()
        }
    }
}
