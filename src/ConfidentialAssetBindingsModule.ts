import { NativeModule, requireNativeModule } from 'expo';

import { ConfidentialAssetsBindingsModuleEvents } from './ConfidentialAssetsBindings.types';

declare class ConfidentialAssetBindingsModule extends NativeModule<ConfidentialAssetsBindingsModuleEvents> {
  batchRangeProof(
    valuesFlat: Uint8Array,
    blindingsFlat: Uint8Array,
    valueCount: number,
    valBase: Uint8Array,
    randBase: Uint8Array,
    numBits: number,
  ): Promise<{ proof: Uint8Array; commsFlat: Uint8Array; count: number }>;
  batchVerifyProof(
    proof: Uint8Array,
    commsFlat: Uint8Array,
    commCount: number,
    valBase: Uint8Array,
    randBase: Uint8Array,
    numBits: number,
  ): Promise<boolean>;
  createSolver(): Promise<number>;
  freeSolver(handle: number): Promise<void>;
  solverSolve(handle: number, y: Uint8Array, maxNumBits: number): Promise<string>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ConfidentialAssetBindingsModule>('ConfidentialAssetsBindings');
