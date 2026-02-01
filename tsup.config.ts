import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    splitting: false
  },
  {
    entry: ['src/index.ts'],
    format: ['iife'],
    clean: false,
    minify: true,
    globalName: 'sqlQuicktype',
    target: 'es2015'
  },
  {
    entry: ['src/cli.ts'],
    format: ['cjs'],
    clean: false,
    banner: {
      js: '#!/usr/bin/env node'
    }
  }
])
