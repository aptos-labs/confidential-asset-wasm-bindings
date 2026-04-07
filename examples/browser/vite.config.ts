import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Prevent Vite's pre-bundler from wrapping the package, which would
    // interfere with its dynamic WASM fetch at runtime.
    exclude: ['@aptos-labs/confidential-asset-bindings'],
  },
});
