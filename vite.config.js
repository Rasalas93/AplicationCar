import { defineConfig } from 'vite';
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

/** Escribe dist/precache.json (sin los GLB de coche y moto: se bajan al usarlos) y versiona la caché de sw.js con el hash del build. */
function precache() {
  return {
    name: 'precache',
    apply: 'build',
    closeBundle() {
      const raiz = 'dist', lista = [];
      const andar = d => readdirSync(d).forEach(n => { const p = join(d, n); statSync(p).isDirectory() ? andar(p) : lista.push(relative(raiz, p)); });
      andar(raiz);
      const recursos = lista.filter(f => !['sw.js', 'precache.json'].includes(f)).sort();
      const h = createHash('sha1');
      recursos.forEach(f => h.update(f).update(readFileSync(join(raiz, f))));
      writeFileSync(join(raiz, 'precache.json'), JSON.stringify(recursos.filter(f => !['modelo/moto.glb', 'modelo/coche.glb'].includes(f))));
      const sw = join(raiz, 'sw.js');
      writeFileSync(sw, readFileSync(sw, 'utf8').replace("'copiloto-v1'", `'copiloto-${h.digest('hex').slice(0, 10)}'`));
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [precache()],
  build: { target: 'es2022', outDir: 'dist', assetsInlineLimit: 0, chunkSizeWarningLimit: 900 },
  server: { host: '127.0.0.1' }
});
