const mockNativeModule = {
  rangeProof: jest.fn(),
  batchRangeProof: jest.fn(),
  verifyProof: jest.fn(),
  batchVerifyProof: jest.fn(),
  createSolver: jest.fn(),
  freeSolver: jest.fn(),
  solverSolve: jest.fn(),
};

const fs = require("fs");
const path = require("path");
const ts = require("typescript");

function loadIndexNativeModule() {
  const sourcePath = path.join(__dirname, "..", "index.native.ts");
  const source = fs.readFileSync(sourcePath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: sourcePath,
  });

  const module = { exports: {} };
  const localRequire = (request) => {
    if (request === "./ConfidentialAssetsBindingsModule") {
      return { __esModule: true, default: mockNativeModule };
    }
    return require(request);
  };

  // eslint-disable-next-line no-new-func
  const evaluate = new Function("require", "module", "exports", outputText);
  evaluate(localRequire, module, module.exports);
  return module.exports;
}

const {
  batchRangeProof,
  batchVerifyProof,
  disposeSolver,
  rangeProof,
  solveDiscreteLog,
  verifyProof,
} = loadIndexNativeModule();

const makeBytes = (length, value = 1) => new Uint8Array(length).fill(value);

describe("index.native range proof validation", () => {
  const singleInputs = {
    v: 1n,
    r: makeBytes(32, 1),
    valBase: makeBytes(32, 2),
    randBase: makeBytes(32, 3),
  };
  const verifyInputs = {
    proof: makeBytes(64, 4),
    comm: makeBytes(32, 5),
    valBase: makeBytes(32, 6),
    randBase: makeBytes(32, 7),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockNativeModule.rangeProof.mockResolvedValue({
      proof: makeBytes(64, 8),
      comm: makeBytes(32, 9),
    });
    mockNativeModule.batchRangeProof.mockResolvedValue({
      proof: makeBytes(96, 10),
      commsFlat: new Uint8Array([...makeBytes(32, 11), ...makeBytes(32, 12)]),
      count: 2,
    });
    mockNativeModule.verifyProof.mockResolvedValue(true);
    mockNativeModule.batchVerifyProof.mockResolvedValue(true);
  });

  it.each([8, 16, 32, 64])(
    "accepts supported numBits %i for rangeProof",
    async (numBits) => {
      await expect(rangeProof({ ...singleInputs, numBits })).resolves.toEqual({
        proof: makeBytes(64, 8),
        commitment: makeBytes(32, 9),
        comm: makeBytes(32, 9),
      });

      expect(mockNativeModule.rangeProof).toHaveBeenCalledWith(
        "1",
        singleInputs.r,
        singleInputs.valBase,
        singleInputs.randBase,
        numBits
      );
    }
  );

  it.each([-1, 0, 7, 24, 65, 1.5, Number.NaN])(
    "rejects unsupported numBits %p for all range proof entrypoints",
    async (numBits) => {
      await expect(rangeProof({ ...singleInputs, numBits })).rejects.toThrow(
        "numBits must be one of 8, 16, 32, or 64"
      );
      await expect(
        batchRangeProof({
          v: [1n],
          rs: [makeBytes(32, 13)],
          valBase: makeBytes(32, 14),
          randBase: makeBytes(32, 15),
          numBits,
        })
      ).rejects.toThrow("numBits must be one of 8, 16, 32, or 64");
      await expect(verifyProof({ ...verifyInputs, numBits })).rejects.toThrow(
        "numBits must be one of 8, 16, 32, or 64"
      );
      await expect(
        batchVerifyProof({
          proof: makeBytes(64, 16),
          comms: [makeBytes(32, 17)],
          valBase: makeBytes(32, 18),
          randBase: makeBytes(32, 19),
          numBits,
        })
      ).rejects.toThrow("numBits must be one of 8, 16, 32, or 64");

      expect(mockNativeModule.rangeProof).not.toHaveBeenCalled();
      expect(mockNativeModule.batchRangeProof).not.toHaveBeenCalled();
      expect(mockNativeModule.verifyProof).not.toHaveBeenCalled();
      expect(mockNativeModule.batchVerifyProof).not.toHaveBeenCalled();
    }
  );

  it("packs bigint batch values as little-endian u64 bytes", async () => {
    await batchRangeProof({
      v: [1n, 256n],
      rs: [makeBytes(32, 20), makeBytes(32, 21)],
      valBase: makeBytes(32, 22),
      randBase: makeBytes(32, 23),
      numBits: 32,
    });

    expect(mockNativeModule.batchRangeProof).toHaveBeenCalledWith(
      Uint8Array.from([
        1, 0, 0, 0, 0, 0, 0, 0,
        0, 1, 0, 0, 0, 0, 0, 0,
      ]),
      expect.any(Uint8Array),
      2,
      makeBytes(32, 22),
      makeBytes(32, 23),
      32
    );
  });

  it("rejects batchRangeProof when blinding count does not match value count", async () => {
    await expect(
      batchRangeProof({
        v: [1n, 2n],
        rs: [makeBytes(32, 20)],
        valBase: makeBytes(32, 21),
        randBase: makeBytes(32, 22),
        numBits: 32,
      })
    ).rejects.toThrow("rs must contain exactly one blinding per value");

    expect(mockNativeModule.batchRangeProof).not.toHaveBeenCalled();
  });

  it("rejects batchRangeProof when a blinding is not 32 bytes", async () => {
    await expect(
      batchRangeProof({
        v: [1n, 2n],
        rs: [makeBytes(31, 23), makeBytes(32, 24)],
        valBase: makeBytes(32, 25),
        randBase: makeBytes(32, 26),
        numBits: 32,
      })
    ).rejects.toThrow("rs[0] must be exactly 32 bytes");

    expect(mockNativeModule.batchRangeProof).not.toHaveBeenCalled();
  });

  it("rejects batchVerifyProof when a commitment is not 32 bytes", async () => {
    await expect(
      batchVerifyProof({
        proof: makeBytes(64, 27),
        comms: [makeBytes(31, 28)],
        valBase: makeBytes(32, 29),
        randBase: makeBytes(32, 30),
        numBits: 32,
      })
    ).rejects.toThrow("commitments[0] must be exactly 32 bytes");

    expect(mockNativeModule.batchVerifyProof).not.toHaveBeenCalled();
  });

  it("rejects inconsistent native batchRangeProof commitment payloads", async () => {
    mockNativeModule.batchRangeProof.mockResolvedValueOnce({
      proof: makeBytes(96, 31),
      commsFlat: makeBytes(33, 32),
      count: 2,
    });

    await expect(
      batchRangeProof({
        v: [1n, 2n],
        rs: [makeBytes(32, 33), makeBytes(32, 34)],
        valBase: makeBytes(32, 35),
        randBase: makeBytes(32, 36),
        numBits: 32,
      })
    ).rejects.toThrow(
      "Native batchRangeProof returned 33 commitment bytes for 2 commitments."
    );
  });

  it("accepts commitment aliases for verification helpers", async () => {
    await expect(
      verifyProof({
        proof: makeBytes(64, 37),
        commitment: makeBytes(32, 38),
        valBase: makeBytes(32, 39),
        randBase: makeBytes(32, 40),
      })
    ).resolves.toBe(true);

    await expect(
      batchVerifyProof({
        proof: makeBytes(64, 41),
        commitments: [makeBytes(32, 42)],
        valBase: makeBytes(32, 43),
        randBase: makeBytes(32, 44),
      })
    ).resolves.toBe(true);

    expect(mockNativeModule.verifyProof).toHaveBeenCalledWith(
      makeBytes(64, 37),
      makeBytes(32, 38),
      makeBytes(32, 39),
      makeBytes(32, 40),
      32
    );
    expect(mockNativeModule.batchVerifyProof).toHaveBeenCalledWith(
      makeBytes(64, 41),
      makeBytes(32, 42),
      1,
      makeBytes(32, 43),
      makeBytes(32, 44),
      32
    );
  });

  it.each([-1, 0, 8, 24, 64, 1.5, Number.NaN])(
    "rejects unsupported maxNumBits %p for solveDiscreteLog",
    async (maxNumBits) => {
      await expect(
        solveDiscreteLog(makeBytes(32, 45), maxNumBits)
      ).rejects.toThrow("maxNumBits must be one of 16 or 32");

      await expect(
        solveDiscreteLog({ y: makeBytes(32, 46), maxNumBits })
      ).rejects.toThrow("maxNumBits must be one of 16 or 32");

      expect(mockNativeModule.createSolver).not.toHaveBeenCalled();
      expect(mockNativeModule.solverSolve).not.toHaveBeenCalled();
    }
  );

  it("supports both solveDiscreteLog call shapes and disposing the cached solver", async () => {
    mockNativeModule.createSolver.mockResolvedValue(123);
    mockNativeModule.solverSolve.mockResolvedValue("42");

    await expect(solveDiscreteLog(makeBytes(32, 47), 16)).resolves.toBe(42n);
    await expect(
      solveDiscreteLog({ y: makeBytes(32, 48), maxNumBits: 32 })
    ).resolves.toBe(42n);

    expect(mockNativeModule.createSolver).toHaveBeenCalledTimes(1);
    expect(mockNativeModule.solverSolve).toHaveBeenNthCalledWith(
      1,
      123,
      makeBytes(32, 47),
      16
    );
    expect(mockNativeModule.solverSolve).toHaveBeenNthCalledWith(
      2,
      123,
      makeBytes(32, 48),
      32
    );

    await disposeSolver();
    expect(mockNativeModule.freeSolver).toHaveBeenCalledWith(123);

    mockNativeModule.createSolver.mockResolvedValue(456);
    await expect(
      solveDiscreteLog({ y: makeBytes(32, 49), maxNumBits: 16 })
    ).resolves.toBe(42n);
    expect(mockNativeModule.createSolver).toHaveBeenCalledTimes(2);
    expect(mockNativeModule.solverSolve).toHaveBeenLastCalledWith(
      456,
      makeBytes(32, 49),
      16
    );
  });
});
