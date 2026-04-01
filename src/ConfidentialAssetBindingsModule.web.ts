import { registerWebModule, NativeModule } from 'expo';

import { ConfidentialAssetBindingsModuleEvents } from './ConfidentialAssetBindings.types';

class ConfidentialAssetBindingsModule extends NativeModule<ConfidentialAssetBindingsModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
}

export default registerWebModule(ConfidentialAssetBindingsModule, 'ConfidentialAssetBindingsModule');
