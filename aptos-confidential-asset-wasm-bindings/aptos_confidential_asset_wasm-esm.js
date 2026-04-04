/* @ts-self-types="./aptos_confidential_asset_wasm.d.ts" */

/**
 * Result of a batch range proof generation
 */
export class BatchRangeProof {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(BatchRangeProof.prototype);
        obj.__wbg_ptr = ptr;
        BatchRangeProofFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BatchRangeProofFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_batchrangeproof_free(ptr, 0);
    }
    /**
     * Returns the serialized commitments (each 32 bytes)
     * @returns {Uint8Array[]}
     */
    comms() {
        const ret = wasm.batchrangeproof_comms(this.__wbg_ptr);
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Returns the serialized proof bytes
     * @returns {Uint8Array}
     */
    proof() {
        const ret = wasm.batchrangeproof_proof(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}
if (Symbol.dispose) BatchRangeProof.prototype[Symbol.dispose] = BatchRangeProof.prototype.free;

/**
 * Discrete log solver supporting 16-bit and 32-bit secrets.
 */
export class DiscreteLogSolver {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        DiscreteLogSolverFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_discretelogsolver_free(ptr, 0);
    }
    /**
     * Returns the algorithm name.
     * @returns {string}
     */
    algorithm() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.discretelogsolver_algorithm(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Returns the supported bit sizes as an array [16, 32].
     * @returns {Uint8Array}
     */
    max_num_bits() {
        const ret = wasm.discretelogsolver_max_num_bits(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Creates a new solver with precomputed tables.
     */
    constructor() {
        const ret = wasm.discretelogsolver_new();
        this.__wbg_ptr = ret >>> 0;
        DiscreteLogSolverFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Solves the discrete log problem.
     *
     * Given a compressed Ristretto point y = g^x (32 bytes), finds x.
     *
     * # Arguments
     * * `y` - The compressed Ristretto point (32 bytes)
     * * `max_num_bits` - Maximum bits of the secret: 16 or 32
     *
     * # Returns
     * The discrete log x, or an error if not found or invalid input.
     * @param {Uint8Array} y
     * @param {number} max_num_bits
     * @returns {bigint}
     */
    solve(y, max_num_bits) {
        const ptr0 = passArray8ToWasm0(y, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.discretelogsolver_solve(this.__wbg_ptr, ptr0, len0, max_num_bits);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return BigInt.asUintN(64, ret[0]);
    }
}
if (Symbol.dispose) DiscreteLogSolver.prototype[Symbol.dispose] = DiscreteLogSolver.prototype.free;

/**
 * Result of a single range proof generation
 */
export class SingleRangeProof {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(SingleRangeProof.prototype);
        obj.__wbg_ptr = ptr;
        SingleRangeProofFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SingleRangeProofFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_singlerangeproof_free(ptr, 0);
    }
    /**
     * Returns the serialized commitment (32 bytes)
     * @returns {Uint8Array}
     */
    comm() {
        const ret = wasm.singlerangeproof_comm(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Returns the serialized proof bytes
     * @returns {Uint8Array}
     */
    proof() {
        const ret = wasm.singlerangeproof_proof(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
}
if (Symbol.dispose) SingleRangeProof.prototype[Symbol.dispose] = SingleRangeProof.prototype.free;

/**
 * Generate a batch range proof for multiple values.
 *
 * # Arguments
 * * `v` - The secret values to prove are in range [0, 2^num_bits)
 * * `rs` - The blinding factors (each 32-byte scalar)
 * * `val_base` - Value base point for Pedersen commitment (32-byte compressed point)
 * * `rand_base` - Randomness base point for Pedersen commitment (32-byte compressed point)
 * * `num_bits` - Bit length for range proof (8, 16, 32, or 64)
 * @param {BigUint64Array} v
 * @param {Uint8Array[]} rs
 * @param {Uint8Array} val_base
 * @param {Uint8Array} rand_base
 * @param {number} num_bits
 * @returns {BatchRangeProof}
 */
export function batch_range_proof(v, rs, val_base, rand_base, num_bits) {
    const ptr0 = passArray64ToWasm0(v, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayJsValueToWasm0(rs, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(val_base, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passArray8ToWasm0(rand_base, wasm.__wbindgen_malloc);
    const len3 = WASM_VECTOR_LEN;
    const ret = wasm.batch_range_proof(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, num_bits);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return BatchRangeProof.__wrap(ret[0]);
}

/**
 * Verify a batch range proof.
 * @param {Uint8Array} proof
 * @param {Uint8Array[]} comms
 * @param {Uint8Array} val_base
 * @param {Uint8Array} rand_base
 * @param {number} num_bits
 * @returns {boolean}
 */
export function batch_verify_proof(proof, comms, val_base, rand_base, num_bits) {
    const ptr0 = passArray8ToWasm0(proof, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArrayJsValueToWasm0(comms, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(val_base, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passArray8ToWasm0(rand_base, wasm.__wbindgen_malloc);
    const len3 = WASM_VECTOR_LEN;
    const ret = wasm.batch_verify_proof(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, num_bits);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] !== 0;
}

/**
 * Installs a panic hook that forwards Rust panic messages to `console.error`.
 * Called automatically on WASM init. Without this, panics surface as an
 * opaque `RuntimeError: unreachable` with no message.
 */
export function init() {
    wasm.init();
}

/**
 * Generate a single range proof.
 *
 * # Arguments
 * * `v` - The secret value to prove is in range [0, 2^num_bits)
 * * `r` - The blinding factor (32-byte scalar)
 * * `val_base` - Value base point for Pedersen commitment (32-byte compressed point)
 * * `rand_base` - Randomness base point for Pedersen commitment (32-byte compressed point)
 * * `num_bits` - Bit length for range proof (8, 16, 32, or 64)
 * @param {bigint} v
 * @param {Uint8Array} r
 * @param {Uint8Array} val_base
 * @param {Uint8Array} rand_base
 * @param {number} num_bits
 * @returns {SingleRangeProof}
 */
export function range_proof(v, r, val_base, rand_base, num_bits) {
    const ptr0 = passArray8ToWasm0(r, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(val_base, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(rand_base, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.range_proof(v, ptr0, len0, ptr1, len1, ptr2, len2, num_bits);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return SingleRangeProof.__wrap(ret[0]);
}

/**
 * Verify a single range proof.
 * @param {Uint8Array} proof
 * @param {Uint8Array} comm
 * @param {Uint8Array} val_base
 * @param {Uint8Array} rand_base
 * @param {number} num_bits
 * @returns {boolean}
 */
export function verify_proof(proof, comm, val_base, rand_base, num_bits) {
    const ptr0 = passArray8ToWasm0(proof, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(comm, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(val_base, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passArray8ToWasm0(rand_base, wasm.__wbindgen_malloc);
    const len3 = WASM_VECTOR_LEN;
    const ret = wasm.verify_proof(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, num_bits);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] !== 0;
}

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_2e59b1b37a9a34c3: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg___wbindgen_is_function_49868bde5eb1e745: function(arg0) {
            const ret = typeof(arg0) === 'function';
            return ret;
        },
        __wbg___wbindgen_is_object_40c5a80572e8f9d3: function(arg0) {
            const val = arg0;
            const ret = typeof(val) === 'object' && val !== null;
            return ret;
        },
        __wbg___wbindgen_is_string_b29b5c5a8065ba1a: function(arg0) {
            const ret = typeof(arg0) === 'string';
            return ret;
        },
        __wbg___wbindgen_is_undefined_c0cca72b82b86f4d: function(arg0) {
            const ret = arg0 === undefined;
            return ret;
        },
        __wbg___wbindgen_throw_81fc77679af83bc6: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_call_d578befcc3145dee: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.call(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_crypto_38df2bab126b63dc: function(arg0) {
            const ret = arg0.crypto;
            return ret;
        },
        __wbg_error_38bec0a78dd8ded8: function(arg0) {
            console.error(arg0);
        },
        __wbg_getRandomValues_c44a50d8cfdaebeb: function() { return handleError(function (arg0, arg1) {
            arg0.getRandomValues(arg1);
        }, arguments); },
        __wbg_length_0c32cb8543c8e4c8: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_msCrypto_bd5a034af96bcba6: function(arg0) {
            const ret = arg0.msCrypto;
            return ret;
        },
        __wbg_new_from_slice_2580ff33d0d10520: function(arg0, arg1) {
            const ret = new Uint8Array(getArrayU8FromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_new_with_length_9cedd08484b73942: function(arg0) {
            const ret = new Uint8Array(arg0 >>> 0);
            return ret;
        },
        __wbg_node_84ea875411254db1: function(arg0) {
            const ret = arg0.node;
            return ret;
        },
        __wbg_process_44c7a14e11e9f69e: function(arg0) {
            const ret = arg0.process;
            return ret;
        },
        __wbg_prototypesetcall_3e05eb9545565046: function(arg0, arg1, arg2) {
            Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
        },
        __wbg_randomFillSync_6c25eac9869eb53c: function() { return handleError(function (arg0, arg1) {
            arg0.randomFillSync(arg1);
        }, arguments); },
        __wbg_require_b4edbdcf3e2a1ef0: function() { return handleError(function () {
            const ret = module.require;
            return ret;
        }, arguments); },
        __wbg_static_accessor_GLOBAL_THIS_a1248013d790bf5f: function() {
            const ret = typeof globalThis === 'undefined' ? null : globalThis;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_GLOBAL_f2e0f995a21329ff: function() {
            const ret = typeof global === 'undefined' ? null : global;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_SELF_24f78b6d23f286ea: function() {
            const ret = typeof self === 'undefined' ? null : self;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_WINDOW_59fd959c540fe405: function() {
            const ret = typeof window === 'undefined' ? null : window;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_subarray_0f98d3fb634508ad: function(arg0, arg1, arg2) {
            const ret = arg0.subarray(arg1 >>> 0, arg2 >>> 0);
            return ret;
        },
        __wbg_versions_276b2795b1c6a219: function(arg0) {
            const ret = arg0.versions;
            return ret;
        },
        __wbindgen_cast_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Ref(Slice(U8)) -> NamedExternref("Uint8Array")`.
            const ret = getArrayU8FromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_cast_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./aptos_confidential_asset_wasm_bg.js": import0,
    };
}

const BatchRangeProofFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_batchrangeproof_free(ptr >>> 0, 1));
const DiscreteLogSolverFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_discretelogsolver_free(ptr >>> 0, 1));
const SingleRangeProofFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_singlerangeproof_free(ptr >>> 0, 1));

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(wasm.__wbindgen_externrefs.get(mem.getUint32(i, true)));
    }
    wasm.__externref_drop_slice(ptr, len);
    return result;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedBigUint64ArrayMemory0 = null;
function getBigUint64ArrayMemory0() {
    if (cachedBigUint64ArrayMemory0 === null || cachedBigUint64ArrayMemory0.byteLength === 0) {
        cachedBigUint64ArrayMemory0 = new BigUint64Array(wasm.memory.buffer);
    }
    return cachedBigUint64ArrayMemory0;
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function passArray64ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 8, 8) >>> 0;
    getBigUint64ArrayMemory0().set(arg, ptr / 8);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayJsValueToWasm0(array, malloc) {
    const ptr = malloc(array.length * 4, 4) >>> 0;
    for (let i = 0; i < array.length; i++) {
        const add = addToExternrefTable0(array[i]);
        getDataViewMemory0().setUint32(ptr + 4 * i, add, true);
    }
    WASM_VECTOR_LEN = array.length;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedBigUint64ArrayMemory0 = null;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('aptos_confidential_asset_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
