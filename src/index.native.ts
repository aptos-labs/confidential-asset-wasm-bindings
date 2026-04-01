// Reexport the native module. On web, it will be resolved to ConfidentialAssetBindingsModule.web.ts
// and on native platforms to ConfidentialAssetBindingsModule.ts
export { default } from './ConfidentialAssetBindingsModule';
export { default as ConfidentialAssetBindingsView } from './ConfidentialAssetBindingsView';
export * from  './ConfidentialAssetBindings.types';
