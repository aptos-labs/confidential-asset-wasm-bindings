// Copyright © Aptos Foundation
// SPDX-License-Identifier: Apache-2.0

import initWasm, {
    range_proof as rangeProof,
    verify_proof as verifyProof,
    batch_range_proof as batchRangeProof,
    batch_verify_proof as batchVerifyProof,
} from "./pkg/aptos_rp_wasm";

export interface RangeProofInputs {
    v: bigint;
    r: Uint8Array;
    valBase: Uint8Array;
    randBase: Uint8Array;
    bits?: number;
}

export interface VerifyRangeProofInputs {
    proof: Uint8Array;
    commitment: Uint8Array;
    valBase: Uint8Array;
    randBase: Uint8Array;
    bits?: number;
}

export interface BatchRangeProofInputs {
    v: bigint[];
    rs: Uint8Array[];
    val_base: Uint8Array;
    rand_base: Uint8Array;
    num_bits: number;
}

export interface BatchVerifyRangeProofInputs {
    proof: Uint8Array;
    comm: Uint8Array[];
    val_base: Uint8Array;
    rand_base: Uint8Array;
    num_bits: number;
}

const RANGE_PROOF_WASM_URL =
    "./pkg/aptos_rp_wasm_bg.wasm";

async function init() {
    const wasmBytes = await Deno.readFile(RANGE_PROOF_WASM_URL)
    await initWasm(wasmBytes);
}

/**
 * Generate range Zero Knowledge Proof
 *
 * @param opts.v The value to create the range proof for
 * @param opts.r A vector of bytes representing the blinding scalar used to hide the value.
 * @param opts.valBase A vector of bytes representing the generator point for the value.
 * @param opts.randBase A vector of bytes representing the generator point for the randomness.
 * @param opts.bits Bits size of value to create the range proof
 */
export async function generateRangeZKP(opts: RangeProofInputs): Promise<{ proof: Uint8Array; commitment: Uint8Array }> {
    const proof = rangeProof(opts.v, opts.r, opts.valBase, opts.randBase, opts.bits ?? 32);

    return {
        proof: proof.proof(),
        commitment: proof.comm(),
    };
}

/**
 * Verify range Zero Knowledge Proof
 *
 * @param opts.proof A vector of bytes representing the serialized range proof to be verified.
 * @param opts.commitment A vector of bytes representing the Pedersen commitment the range proof is generated for.
 * @param opts.valBase A vector of bytes representing the generator point for the value.
 * @param opts.randBase A vector of bytes representing the generator point for the randomness.
 * @param opts.bits Bits size of the value for range proof
 */
export async function verifyRangeZKP(opts: VerifyRangeProofInputs) {
    return verifyProof(opts.proof, opts.commitment, opts.valBase, opts.randBase, opts.bits ?? 32);
}

export async function genBatchRangeZKP(
    opts: BatchRangeProofInputs,
): Promise<{ proof: Uint8Array; commitments: Uint8Array[] }> {
    console.log("genBatchRangeZKP");
    try {
        const proof = batchRangeProof(opts.v, opts.rs, opts.val_base, opts.rand_base, opts.num_bits);

        return {
            proof: proof.proof(),
            commitments: proof.comms(),
        };
    } catch (error) {
        console.log({error});
        throw error;
    }
}

export async function verifyBatchRangeZKP(opts: BatchVerifyRangeProofInputs): Promise<boolean> {
    return batchVerifyProof(opts.proof, opts.comm, opts.val_base, opts.rand_base, opts.num_bits);
}

const main = async () => {
    try {
        await init()

        const result = await genBatchRangeZKP({
            v: new BigUint64Array([100n, 65535n, 65535n, 65535n, 0n, 0n, 0n, 0n]),
            rs: [
                new Uint8Array([
                    227, 50, 219, 241, 77, 181, 34, 183,
                    68, 70, 176, 70, 167, 45, 180, 73,
                    32, 199, 64, 165, 163, 20, 161, 67,
                    235, 102, 108, 209, 150, 99, 116, 5
                ]),
                new Uint8Array([
                    32, 164, 186, 154, 97, 76, 83, 22,
                    151, 202, 176, 187, 71, 241, 232, 111,
                    76, 219, 220, 160, 131, 222, 163, 198,
                    54, 162, 71, 253, 41, 139, 245, 3
                ]),
                new Uint8Array([
                    78, 161, 102, 104, 3, 13, 137, 106,
                    199, 254, 101, 53, 139, 148, 10, 81,
                    74, 160, 131, 225, 241, 13, 15, 182,
                    186, 83, 127, 140, 32, 42, 121, 0
                ]),
                new Uint8Array([
                    88, 10, 18, 74, 118, 77, 86, 117,
                    136, 48, 15, 55, 36, 117, 233, 44,
                    255, 169, 251, 167, 235, 187, 63, 236,
                    170, 51, 200, 243, 175, 146, 71, 5
                ]),
                new Uint8Array([
                    90, 239, 138, 92, 12, 108, 172, 145,
                    127, 182, 254, 232, 55, 211, 222, 74,
                    114, 214, 40, 39, 51, 21, 127, 240,
                    63, 111, 73, 3, 220, 25, 50, 15
                ]),
                new Uint8Array([
                    103, 162, 233, 242, 115, 246, 247,
                    136, 172, 129, 164, 91, 80, 3,
                    222, 136, 161, 59, 199, 197, 69,
                    235, 198, 90, 113, 248, 194, 139,
                    200, 166, 104, 11
                ]),
                new Uint8Array([
                    68, 168, 98, 142, 196, 70, 62, 58,
                    164, 86, 147, 59, 128, 185, 224, 93,
                    145, 131, 77, 49, 71, 2, 106, 163,
                    182, 124, 127, 170, 234, 218, 56, 3
                ]),
                new Uint8Array([
                        112, 54, 204, 18, 62, 124, 10, 185,
                        112, 239, 168, 180, 87, 7, 47, 180,
                        184, 176, 42, 172, 133, 94, 221, 17,
                        160, 246, 159, 134, 201, 65, 164, 12
                    ]
                )],
            val_base: new Uint8Array([
                226, 242, 174, 10, 106, 188, 78, 113,
                168, 132, 169, 97, 197, 0, 81, 95,
                88, 227, 11, 106, 165, 130, 221, 141,
                182, 166, 89, 69, 224, 141, 45, 118
            ]),
            rand_base: new Uint8Array([
                140, 146, 64, 180, 86, 169, 230, 220,
                101, 195, 119, 161, 4, 141, 116, 95,
                148, 160, 140, 219, 127, 68, 203, 205,
                123, 70, 243, 64, 72, 135, 17, 52
            ]),
            num_bits: 16
        })

        console.log(result)
    } catch (error) {
        console.log(error)
    }
}

main()
