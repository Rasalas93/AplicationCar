/** Etiquetas del coche 3D: cada punto cae a ≤ 4 px de su ancla proyectada, su etiqueta va pegada, no pisa otra y se toca ella, en vertical y apaisado, a tres ángulos. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { build, preview } from 'vite';
import { chromium } from 'playwright-core';

const CHROME = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
const PANTALLAS = [[360, 780], [430, 932], [915, 412]];
const ANGULOS = [[0, 1], [1.9, 0.8], [-1.6, 1.25]];
let servidor, navegador, url;

before(async () => {
  await build({ logLevel: 'silent' });
  servidor = await preview({ logLevel: 'silent', preview: { port: 0, host: '127.0.0.1' } });
  url = servidor.resolvedUrls.local[0];
  navegador = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--mute-audio', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
});

after(async () => { await navegador?.close(); await new Promise(r => servidor ? servidor.httpServer.close(r) : r()); });

/** Gira la cámara (acimut relativo, zoom) y mide punto, etiqueta y ancla proyectada de cada zona visible. */
function medir([giro, zoom]) {
  const c = window.__coche3d, ctl = c.controles, cam = ctl.object;
  ctl.autoRotate = false; ctl.enableDamping = false;
  const off = cam.position.clone().sub(ctl.target), r = off.length() * zoom;
  const az = Math.atan2(off.x, off.z) + giro, pol = Math.acos(off.y / off.length());
  cam.position.set(ctl.target.x + r * Math.sin(pol) * Math.sin(az), ctl.target.y + r * Math.cos(pol), ctl.target.z + r * Math.sin(pol) * Math.cos(az));
  ctl.update(); c.paso(0);
  const lienzo = document.getElementById('lienzo3d').getBoundingClientRect(), nav = document.getElementById('nav')?.getBoundingClientRect();
  return c.anclas().map(({ zona, pos }) => {
    const el = document.querySelector(`.zonas3d .zona[data-zona="${zona}"]`);
    const p = pos.project(cam), x = lienzo.left + (p.x + 1) / 2 * lienzo.width, y = lienzo.top + (1 - p.y) / 2 * lienzo.height;
    const i = el.querySelector('i').getBoundingClientRect(), s = el.querySelector('span').getBoundingClientRect();
    const toca = document.elementFromPoint((s.left + s.right) / 2, (s.top + s.bottom) / 2)?.closest('.zona')?.dataset.zona;
    return { zona, izq: el.classList.contains('izq'), visto: !el.classList.contains('oculta'), x, y, px: i.left + i.width / 2, py: i.top + i.height / 2, s: { l: s.left, r: s.right, t: s.top, b: s.bottom }, toca, navTop: nav ? nav.top : Infinity, alto: innerHeight };
  });
}

for (const [ancho, alto] of PANTALLAS) {
  test(`etiquetas sobre su punto a ${ancho}×${alto} en tres ángulos`, async () => {
    const pagina = await navegador.newPage({ viewport: { width: ancho, height: alto } });
    const errores = []; pagina.on('pageerror', e => errores.push(e.message));
    await pagina.goto(`${url}?hoy=2026-11-11&limpio&sin-sw`);
    await pagina.waitForFunction('window.__listo3d === true', null, { timeout: 90000 });
    const fallos = [];
    let vistas = 0, derecha = 0;
    for (const angulo of ANGULOS) {
      const vistasAngulo = [];
      for (const z of await pagina.evaluate(medir, angulo)) {
        if (z.x < 0 || z.x > ancho || z.y < 0 || z.y > alto) continue;
        const d = Math.hypot(z.px - z.x, z.py - z.y);
        if (d > 4) fallos.push(`${z.zona} ${angulo}: punto a ${d.toFixed(1)} px del ancla`);
        if (!z.visto) continue;
        vistas++; if (z.x > ancho / 2) derecha++;
        const hueco = z.izq ? z.px - z.s.r : z.s.l - z.px;
        if (hueco < 0 || hueco > 16) fallos.push(`${z.zona} ${angulo}: etiqueta a ${hueco.toFixed(1)} px del punto`);
        if (z.toca !== z.zona) fallos.push(`${z.zona} ${angulo}: tocar su etiqueta abre ${z.toca}`);
        if (z.s.b > z.navTop) fallos.push(`${z.zona} ${angulo}: etiqueta bajo la barra`);
        for (const o of vistasAngulo) if (z.s.l < o.s.r && o.s.l < z.s.r && z.s.t < o.s.b && o.s.t < z.s.b) fallos.push(`${z.zona} ${angulo}: etiqueta pisa la de ${o.zona}`);
        vistasAngulo.push(z);
      }
    }
    await pagina.close();
    assert.deepEqual(fallos, []);
    assert.ok(vistas >= 6, `zonas visibles medidas: ${vistas}`);
    assert.ok(derecha >= 1, 'al menos una etiqueta en la mitad derecha');
    assert.deepEqual(errores, []);
  });
}
