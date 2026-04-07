import { requireNativeView } from 'expo';
import type * as React from 'react';

import type { ConfidentialAssetBindingsViewProps } from './ConfidentialAssetBindings.types';

const NativeView: React.ComponentType<ConfidentialAssetBindingsViewProps> =
  requireNativeView('ConfidentialAssetBindings');

export default function ConfidentialAssetBindingsView(
  props: ConfidentialAssetBindingsViewProps,
) {
  return <NativeView {...props} />;
}
