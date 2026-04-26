import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: { tsconfig: 'tsconfig.lib.json' },
  sourcemap: true,
  external: ['gl-matrix'],
  clean: true,
});
