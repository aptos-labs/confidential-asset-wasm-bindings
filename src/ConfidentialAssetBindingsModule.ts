import { NativeModule, requireNativeModule } from 'expo';

import { ConfidentialAssetBindingsModuleEvents } from './ConfidentialAssetBindings.types';

declare class ConfidentialAssetBindingsModule extends NativeModule<ConfidentialAssetBindingsModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ConfidentialAssetBindingsModule>('ConfidentialAssetBindings');
