import { requireNativeView } from 'expo';
import * as React from 'react';

import { ConfidentialAssetBindingsViewProps } from './ConfidentialAssetBindings.types';

const NativeView: React.ComponentType<ConfidentialAssetBindingsViewProps> =
  requireNativeView('ConfidentialAssetBindings');

export default function ConfidentialAssetBindingsView(props: ConfidentialAssetBindingsViewProps) {
  return <NativeView {...props} />;
}
