package com.aptoslabs.confidentialassetbindings

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

class ConfidentialAssetBindingsModule : Module() {
  private val batchElementBytes = 32
  private val nextSolverHandle = AtomicInteger(1)
  private val solverPointers = ConcurrentHashMap<Int, Long>()

  private fun requirePointer(handle: Int): Long =
    solverPointers[handle] ?: throw IllegalArgumentException("No solver found for handle $handle")

  private val rustLoadError: String? by lazy {
    try {
      System.loadLibrary("aptos_confidential_asset_mobile")
      null
    } catch (error: UnsatisfiedLinkError) {
      error.message ?: "Failed to load libaptos_confidential_asset_mobile"
    }
  }

  private fun ensureRustLoaded() {
    rustLoadError?.let { throw IllegalStateException(it) }
  }

  private fun requireByteArrayPair(label: String, payload: Array<ByteArray>): Pair<ByteArray, ByteArray> {
    require(payload.size == 2) {
      "$label must return exactly 2 byte arrays, received ${payload.size}"
    }
    return payload[0] to payload[1]
  }

  private fun requireCommitmentCount(commsFlat: ByteArray): Int {
    require(commsFlat.size % batchElementBytes == 0) {
      "batchRangeProof returned ${commsFlat.size} commitment bytes, which is not divisible by $batchElementBytes"
    }
    return commsFlat.size / batchElementBytes
  }

  private external fun batchRangeProof(
    valuesFlat: ByteArray,
    blindingsFlat: ByteArray,
    valueCount: Int,
    valBase: ByteArray,
    randBase: ByteArray,
    numBits: Int,
  ): Array<ByteArray>
  private external fun batchVerifyProof(
    proof: ByteArray,
    commsFlat: ByteArray,
    commCount: Int,
    valBase: ByteArray,
    randBase: ByteArray,
    numBits: Int,
  ): Boolean
  private external fun createSolver(): Long
  private external fun freeSolver(pointer: Long)
  private external fun solverSolve(pointer: Long, y: ByteArray, maxNumBits: Int): String

  override fun definition() = ModuleDefinition {
    Name("ConfidentialAssetBindings")

    OnDestroy {
      for ((_, pointer) in solverPointers) {
        freeSolver(pointer)
      }
      solverPointers.clear()
    }

    AsyncFunction("batchRangeProof") { valuesFlat: ByteArray, blindingsFlat: ByteArray, valueCount: Int, valBase: ByteArray, randBase: ByteArray, numBits: Int ->
      ensureRustLoaded()
      val (proof, commsFlat) = requireByteArrayPair(
        "batchRangeProof",
        batchRangeProof(valuesFlat, blindingsFlat, valueCount, valBase, randBase, numBits)
      )
      val count = requireCommitmentCount(commsFlat)
      mapOf(
        "proof" to proof,
        "commsFlat" to commsFlat,
        "count" to count,
      )
    }

    AsyncFunction("batchVerifyProof") { proof: ByteArray, commsFlat: ByteArray, commCount: Int, valBase: ByteArray, randBase: ByteArray, numBits: Int ->
      ensureRustLoaded()
      batchVerifyProof(proof, commsFlat, commCount, valBase, randBase, numBits)
    }

    AsyncFunction("createSolver") {
      ensureRustLoaded()
      val pointer = createSolver()
      val handle = nextSolverHandle.getAndIncrement()
      solverPointers[handle] = pointer
      handle
    }

    AsyncFunction("freeSolver") { handle: Int ->
      val pointer = solverPointers.remove(handle) ?: return@AsyncFunction
      freeSolver(pointer)
    }

    AsyncFunction("solverSolve") { handle: Int, y: ByteArray, maxNumBits: Int ->
      ensureRustLoaded()
      val pointer = requirePointer(handle)
      solverSolve(pointer, y, maxNumBits)
    }
  }
}
