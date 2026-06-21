import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@/': path.resolve(__dirname, './src/'),
      '@rove-hire/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  esbuild: {
    target: 'node18',
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
    },
  },
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.{test,spec}.ts', 'test/**/*.{test,spec}.ts'],
    exclude: ['test/**/*.integration.spec.ts'],
  },
});
