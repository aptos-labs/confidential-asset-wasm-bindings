import ExpoModulesCore
import Foundation

public class ConfidentialAssetBindingsModule: Module {
  private let rangeProofNumBits: Set<Int> = [8, 16, 32, 64]
  private let discreteLogMaxNumBits: Set<Int> = [16, 32]
  private let batchElementBytes = 32
  private let valueElementBytes = MemoryLayout<UInt64>.size
  private let solverStateQueue = DispatchQueue(label: "com.aptoslabs.confidentialassetbindings.solverState")
  private var nextSolverHandle = 1
  private var solverPointers: [Int: UnsafeMutableRawPointer] = [:]

  private func freeBuffer(_ buffer: ConfidentialAssetByteBuffer) {
    guard buffer.ptr != nil else {
      return
    }
    confidential_asset_free_buffer(buffer)
  }

  private func errorString(from buffer: ConfidentialAssetByteBuffer) -> String? {
    guard buffer.len > 0, let ptr = buffer.ptr else {
      return nil
    }

    let data = Data(bytes: ptr, count: buffer.len)
    return String(data: data, encoding: .utf8) ?? "Unknown native error"
  }

  private func data(from buffer: ConfidentialAssetByteBuffer) -> Data {
    guard buffer.len > 0, let ptr = buffer.ptr else {
      return Data()
    }

    return Data(bytes: ptr, count: buffer.len)
  }

  private func validateRangeProofNumBits(_ numBits: Int) throws {
    guard rangeProofNumBits.contains(numBits) else {
      throw Exception(
        name: "ERR_INVALID_NUM_BITS",
        description: "numBits must be one of 8, 16, 32, or 64. Received \(numBits)."
      )
    }
  }

  private func validateDiscreteLogMaxNumBits(_ maxNumBits: Int) throws {
    guard discreteLogMaxNumBits.contains(maxNumBits) else {
      throw Exception(
        name: "ERR_INVALID_MAX_NUM_BITS",
        description: "maxNumBits must be one of 16 or 32. Received \(maxNumBits)."
      )
    }
  }

  private func expectedFlatByteCount(count: Int) throws -> Int {
    guard count >= 0 else {
      throw Exception(
        name: "ERR_INVALID_BATCH_COUNT",
        description: "Batch element count must be non-negative. Received \(count)."
      )
    }

    let (expectedBytes, didOverflow) = count.multipliedReportingOverflow(by: batchElementBytes)
    guard !didOverflow else {
      throw Exception(
        name: "ERR_INVALID_BATCH_COUNT",
        description: "Batch element count is too large to validate."
      )
    }

    return expectedBytes
  }

  private func expectedValueByteCount(count: Int) throws -> Int {
    guard count >= 0 else {
      throw Exception(
        name: "ERR_INVALID_VALUE_COUNT",
        description: "Batch value count must be non-negative. Received \(count)."
      )
    }

    let (expectedBytes, didOverflow) = count.multipliedReportingOverflow(by: valueElementBytes)
    guard !didOverflow else {
      throw Exception(
        name: "ERR_INVALID_VALUE_COUNT",
        description: "Batch value count is too large to validate."
      )
    }

    return expectedBytes
  }

  private func validateFlatBufferCount(_ byteCount: Int, count: Int, label: String, errorName: String) throws {
    let expectedBytes = try expectedFlatByteCount(count: count)
    guard byteCount == expectedBytes else {
      throw Exception(
        name: errorName,
        description: "\(label) must contain exactly \(expectedBytes) bytes for \(count) elements. Received \(byteCount)."
      )
    }
  }

  private func decodeUInt64Values(from valuesFlat: Data, count: Int) throws -> [UInt64] {
    let expectedBytes = try expectedValueByteCount(count: count)
    guard valuesFlat.count == expectedBytes else {
      throw Exception(
        name: "ERR_INVALID_VALUES",
        description: "valuesFlat must contain exactly \(expectedBytes) bytes for \(count) values. Received \(valuesFlat.count)."
      )
    }

    var values: [UInt64] = []
    values.reserveCapacity(count)

    for index in 0..<count {
      let start = index * valueElementBytes
      let end = start + valueElementBytes
      let valueBytes = valuesFlat[start..<end]
      var value: UInt64 = 0
      for (byteIndex, byte) in valueBytes.enumerated() {
        value |= UInt64(byte) << UInt64(byteIndex * 8)
      }
      values.append(value)
    }

    return values
  }

  private func withSolverPointer<T>(_ handle: Int, _ body: (UnsafeMutableRawPointer) throws -> T) throws -> T {
    try solverStateQueue.sync {
      guard let pointer = solverPointers[handle] else {
        throw Exception(name: "ERR_INVALID_HANDLE", description: "No solver found for handle \(handle)")
      }
      return try body(pointer)
    }
  }

  private func registerSolverPointer(_ pointer: UnsafeMutableRawPointer) -> Int {
    solverStateQueue.sync {
      let handle = nextSolverHandle
      nextSolverHandle += 1
      solverPointers[handle] = pointer
      return handle
    }
  }

  private func removeSolverPointer(_ handle: Int) -> UnsafeMutableRawPointer? {
    solverStateQueue.sync {
      solverPointers.removeValue(forKey: handle)
    }
  }

  private func drainSolverPointers() -> [UnsafeMutableRawPointer] {
    solverStateQueue.sync {
      let pointers = Array(solverPointers.values)
      solverPointers.removeAll()
      return pointers
    }
  }

  private func makeBatchRangeProof(
    values: [UInt64],
    blindingsFlat: Data,
    valueCount: Int,
    valBase: Data,
    randBase: Data,
    numBits: Int
  ) throws -> [String: Any] {
    try validateRangeProofNumBits(numBits)
    guard values.count == valueCount else {
      throw Exception(
        name: "ERR_INVALID_VALUE_COUNT",
        description: "valueCount mismatch: expected \(valueCount), received \(values.count) values."
      )
    }
    try validateFlatBufferCount(
      blindingsFlat.count,
      count: valueCount,
      label: "blindingsFlat",
      errorName: "ERR_INVALID_BLINDINGS"
    )

    let result = values.withUnsafeBufferPointer { valuesPtr in
      blindingsFlat.withUnsafeBytes { blindingsBytes in
        valBase.withUnsafeBytes { valBytes in
          randBase.withUnsafeBytes { randBytes in
            confidential_asset_batch_range_proof(
              valuesPtr.baseAddress,
              valuesPtr.count,
              blindingsBytes.bindMemory(to: UInt8.self).baseAddress,
              blindingsFlat.count,
              valBytes.bindMemory(to: UInt8.self).baseAddress,
              valBase.count,
              randBytes.bindMemory(to: UInt8.self).baseAddress,
              randBase.count,
              numBits
            )
          }
        }
      }
    }
    defer {
      freeBuffer(result.error)
      freeBuffer(result.proof)
      freeBuffer(result.comms_flat)
    }

    if let message = errorString(from: result.error) {
      throw Exception(name: "ERR_BATCH_RANGE_PROOF", description: message)
    }

    return [
      "proof": data(from: result.proof),
      "commsFlat": data(from: result.comms_flat),
      "count": Int(result.count),
    ]
  }

  public func definition() -> ModuleDefinition {
    Name("ConfidentialAssetBindings")

    OnDestroy {
      for pointer in self.drainSolverPointers() {
        confidential_asset_free_solver(pointer)
      }
    }

    AsyncFunction("batchRangeProof") { (valuesFlat: Data, blindingsFlat: Data, valueCount: Int, valBase: Data, randBase: Data, numBits: Int) throws -> [String: Any] in
      let numericValues = try self.decodeUInt64Values(from: valuesFlat, count: valueCount)
      return try self.makeBatchRangeProof(
        values: numericValues,
        blindingsFlat: blindingsFlat,
        valueCount: valueCount,
        valBase: valBase,
        randBase: randBase,
        numBits: numBits
      )
    }

    AsyncFunction("batchVerifyProof") { (proof: Data, commsFlat: Data, commCount: Int, valBase: Data, randBase: Data, numBits: Int) throws -> Bool in
      try self.validateRangeProofNumBits(numBits)
      try self.validateFlatBufferCount(
        commsFlat.count,
        count: commCount,
        label: "commsFlat",
        errorName: "ERR_INVALID_COMMS"
      )
      let result = proof.withUnsafeBytes { proofBytes in
        commsFlat.withUnsafeBytes { commsBytes in
          valBase.withUnsafeBytes { valBytes in
            randBase.withUnsafeBytes { randBytes in
              confidential_asset_batch_verify_proof(
                proofBytes.bindMemory(to: UInt8.self).baseAddress,
                proof.count,
                commsBytes.bindMemory(to: UInt8.self).baseAddress,
                commsFlat.count,
                valBytes.bindMemory(to: UInt8.self).baseAddress,
                valBase.count,
                randBytes.bindMemory(to: UInt8.self).baseAddress,
                randBase.count,
                numBits
              )
            }
          }
        }
      }
      defer {
        self.freeBuffer(result.error)
      }

      if let message = errorString(from: result.error) {
        throw Exception(name: "ERR_BATCH_VERIFY_PROOF", description: message)
      }

      return result.value
    }

    AsyncFunction("createSolver") { () -> Int in
      let pointer = confidential_asset_create_solver()!
      return self.registerSolverPointer(pointer)
    }

    AsyncFunction("freeSolver") { (handle: Int) in
      guard let pointer = self.removeSolverPointer(handle) else { return }
      confidential_asset_free_solver(pointer)
    }

    AsyncFunction("solverSolve") { (handle: Int, y: Data, maxNumBits: Int) throws -> String in
      try self.validateDiscreteLogMaxNumBits(maxNumBits)
      return try self.withSolverPointer(handle) { pointer in
        let result = y.withUnsafeBytes { yBytes in
          confidential_asset_solver_solve(
            pointer,
            yBytes.bindMemory(to: UInt8.self).baseAddress,
            y.count,
            UInt8(maxNumBits)
          )
        }
        defer {
          self.freeBuffer(result.error)
          self.freeBuffer(result.value)
        }

        if let message = self.errorString(from: result.error) {
          throw Exception(name: "ERR_SOLVER_SOLVE", description: message)
        }
        let valueData = self.data(from: result.value)
        return String(data: valueData, encoding: .utf8) ?? ""
      }
    }
  }
}
