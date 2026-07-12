import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

const external = ['commander', 'mysql2', 'node-sql-parser']

export default defineConfig(({ mode }) => {
  if (mode === 'cli') {
    return {
      build: {
        lib: {
          entry: resolve(__dirname, 'src/cli.ts'),
          formats: ['cjs'],
          fileName: () => 'cli.js',
        },
        rollupOptions: {
          external: [...external, 'mysql2/promise', 'fs', 'path', 'os'],
        },
        outDir: 'dist',
        emptyOutDir: false,
      },
    }
  }

  if (mode === 'iife') {
    return {
      build: {
        lib: {
          entry: resolve(__dirname, 'src/index.ts'),
          formats: ['iife'],
          name: 'sqlQuicktype',
          fileName: () => 'index.global.js',
        },
        rollupOptions: {
          external: ['commander', 'mysql2'],
          treeshake: false,
        },
        outDir: 'dist',
        emptyOutDir: false,
        minify: true,
      },
    }
  }

  return {
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        formats: ['es', 'cjs'],
        fileName: (format) => `index.${format === 'es' ? 'mjs' : 'js'}`,
      },
      rollupOptions: { external },
      outDir: 'dist',
      emptyOutDir: false,
    },
    plugins: [
      dts({
        rollupTypes: true,
        include: ['src/**/*.ts'],
        exclude: ['src/cli/**', 'src/cli.ts'],
      }),
    ],
    test: {
      globals: true,
      environment: 'node',
      include: ['__tests__/**/*.test.ts'],
      exclude: ['node_modules', 'dist'],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.ts'],
        reporter: ['text', 'lcov'],
        reportsDirectory: 'coverage',
      },
    },
  }
})
