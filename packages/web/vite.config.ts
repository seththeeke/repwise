import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sharedSrc = path.resolve(__dirname, '../lambdas/shared/src');

/** Prefer shared package .ts over .js so we get ESM; .js there is CJS and breaks named exports (e.g. GoalTimeframe). */
function sharedPreferTs() {
  const sharedSrcNorm = sharedSrc + path.sep;
  const norm = (p: string) => p.replace(/^\/@fs/, '');
  return {
    name: 'shared-prefer-ts',
    enforce: 'pre',
    resolveId(id: string, importer?: string) {
      const idNorm = norm(id);
      if (idNorm.endsWith('.js') && idNorm.startsWith(sharedSrcNorm)) {
        return idNorm.slice(0, -3) + '.ts';
      }
      if (importer) {
        const importerPath = norm(importer);
        const dir = path.dirname(importerPath);
        const resolved = path.resolve(dir, id);
        const resolvedNorm = path.normalize(resolved);
        if (resolvedNorm.startsWith(sharedSrcNorm)) {
          const withExt = path.extname(resolvedNorm) ? resolvedNorm : resolvedNorm + '.ts';
          const tsPath = withExt.endsWith('.js') ? withExt.slice(0, -3) + '.ts' : withExt;
          return tsPath;
        }
      }
      if (idNorm.startsWith(sharedSrcNorm) && (idNorm.endsWith('.js') || !path.extname(idNorm))) {
        const base = idNorm.endsWith('.js') ? idNorm.slice(0, -3) : idNorm;
        return base + (base.endsWith('.ts') ? '' : '.ts');
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [react(), sharedPreferTs()],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: '@shared', replacement: sharedSrc },
      // Request for shared enums.js (CJS) -> serve enums.ts (ESM) so named exports work
      {
        find: /(.*\/lambdas\/shared\/src\/)enums\.js$/,
        replacement: path.join(sharedSrc, 'enums.ts'),
      },
      {
        find: /(.*\/lambdas\/shared\/src\/)models\.js$/,
        replacement: path.join(sharedSrc, 'models.ts'),
      },
    ],
    extensions: ['.ts', '.tsx', '.mjs', '.js', '.jsx', '.json'],
  },
});
