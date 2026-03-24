import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: {
      'server/index': 'src/server/index.ts',
      'types/index': 'src/types/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    external: ['express'],
  },
  {
    entry: {
      'react/index': 'src/react/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    splitting: false,
    external: ['react', 'react/jsx-runtime'],
  },
])
