/** Garaje en 3D (T1656): cada vehículo con su GLB (solo se baja el activo), su color y su matrícula; cambio con fundido sin salto; etiquetas ≤ 4 px de su ancla en los tres modelos. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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

/** Gira la cámara (acimut relativo, zoom) y mide punto y ancla proyectada de cada zona visible. */
function medir([giro, zoom]) {
  const c = window.__coche3d, ctl = c.controles, cam = ctl.object;
  ctl.autoRotate = false; ctl.enableDamping = false;
  const off = cam.position.clone().sub(ctl.target), r = off.length() * zoom;
  const az = Math.atan2(off.x, off.z) + giro, pol = Math.acos(off.y / off.length());
  cam.position.set(ctl.target.x + r * Math.sin(pol) * Math.sin(az), ctl.target.y + r * Math.cos(pol), ctl.target.z + r * Math.sin(pol) * Math.cos(az));
  ctl.update(); c.paso(0);
  const lienzo = document.getElementById('lienzo3d').getBoundingClientRect(), nav = document.getElementById('nav').getBoundingClientRect();
  return c.anclas().map(({ zona, pos }) => {
    const el = document.querySelector(`.escenario>.zonas3d .zona[data-zona="${zona}"]`);
    const p = pos.project(cam), x = lienzo.left + (p.x + 1) / 2 * lienzo.width, y = lienzo.top + (1 - p.y) / 2 * lienzo.height;
    const i = el.querySelector('i').getBoundingClientRect(), s = el.querySelector('span').getBoundingClientRect();
    const toca = document.elementFromPoint((s.left + s.right) / 2, (s.top + s.bottom) / 2)?.closest('.zona')?.dataset.zona;
    return { zona, izq: el.classList.contains('izq'), visto: !el.classList.contains('oculta'), x, y, px: i.left + i.width / 2, py: i.top + i.height / 2, s: { l: s.left, r: s.right, t: s.top, b: s.bottom }, toca, navTop: nav.top };
  });
}

async function alta(pagina, tipo, nombre, extra = {}) {
  await pagina.click('#btnGaraje');
  await pagina.click(`#hoja .tipos [data-tipo="${tipo}"]`);
  await pagina.fill('#gNombre', nombre); await pagina.fill('#gKm', '21000');
  if (extra.matricula) await pagina.fill('#gMatricula', extra.matricula);
  if (extra.color) await pagina.click(`#hoja [data-color="${extra.color}"]`);
  await pagina.click('#gGuardar');
}
/** Espera al modelo `m` ya fundido y a que la hoja del Garaje haya salido de la pantalla. */
const enModelo = (pagina, m) => pagina.waitForFunction(m => { const h = document.getElementById('hoja'); return window.__listo3d === true && window.__coche3d.modelo === m && !document.querySelector('.escenario.cambiando') && !h.classList.contains('on') && h.getBoundingClientRect().top >= innerHeight - 1; }, m, { timeout: 90000 });

test('moto y coche en 3D con su color y su matrícula; solo se baja el GLB del activo; el cambio funde sin mover el escenario', async () => {
  const pagina = await navegador.newPage({ viewport: { width: 390, height: 844 } });
  const errores = [], glb = [];
  pagina.on('pageerror', e => errores.push(e.message));
  pagina.on('request', r => { if (r.url().endsWith('.glb')) glb.push(r.url().split('/').pop()); });
  await pagina.goto(`${url}?hoy=2026-11-11&limpio&sin-sw`);
  await enModelo(pagina, 'focus');
  assert.deepEqual(glb, ['focus.glb']);
  const caja = () => pagina.evaluate(() => { const r = document.getElementById('escenario').getBoundingClientRect(); return [r.top, r.height]; });
  const antes = await caja();
  await pagina.evaluate(() => { window.__fundidos = 0; new MutationObserver(() => { if (document.getElementById('escenario').classList.contains('cambiando')) window.__fundidos++; }).observe(document.getElementById('escenario'), { attributes: true }); });
  await alta(pagina, 'moto', 'La moto', { matricula: '0000 aaa' }); await enModelo(pagina, 'moto');
  const moto = await pagina.evaluate(() => ({ c: window.__coche3d.color, p: window.__coche3d.placa, plano: document.querySelector('.escenario').classList.contains('plano'), fundido: window.__fundidos > 0 }));
  assert.deepEqual(moto, { c: '#d4d4cf', p: '0000 AAA', plano: false, fundido: true });
  assert.deepEqual(glb, ['focus.glb', 'moto.glb']);
  await alta(pagina, 'coche', 'El coche', { color: '#8E0A14' }); await enModelo(pagina, 'coche');
  assert.deepEqual(await pagina.evaluate(() => [window.__coche3d.color, window.__coche3d.placa]), ['#8e0a14', '']);
  assert.match(await pagina.textContent('#marcaI'), /El coche/);
  await pagina.click('#btnGaraje'); await pagina.click('#hoja [data-veh="focus"]'); await enModelo(pagina, 'focus');
  assert.equal(await pagina.evaluate(() => window.__coche3d.placa), JSON.parse(readFileSync(new URL('../datos/semilla.json', import.meta.url))).vehiculos[0].matricula);
  await pagina.click('#btnGaraje'); await pagina.click('#hoja [data-veh="la-moto"]'); await enModelo(pagina, 'moto');
  assert.deepEqual(glb, ['focus.glb', 'moto.glb', 'coche.glb'], 'volver a un modelo no lo baja otra vez');
  assert.deepEqual(await caja(), antes, 'el escenario no se mueve');
  await pagina.close();
  assert.deepEqual(errores, []);
  const lista = JSON.parse(readFileSync(new URL('../dist/precache.json', import.meta.url)));
  assert.ok(lista.includes('modelo/focus.glb') && !lista.includes('modelo/moto.glb') && !lista.includes('modelo/coche.glb'), lista.filter(f => f.endsWith('.glb')).join());
});

for (const [ancho, alto] of PANTALLAS) {
  test(`etiquetas de moto, coche y Focus sobre su punto a ${ancho}×${alto} en tres ángulos`, async () => {
    const pagina = await navegador.newPage({ viewport: { width: ancho, height: alto } });
    await pagina.goto(`${url}?hoy=2026-11-11&limpio&sin-sw`);
    await enModelo(pagina, 'focus');
    const fallos = [], cuenta = {};
    for (const [modelo, ir] of [['moto', () => alta(pagina, 'moto', 'La moto')], ['coche', () => alta(pagina, 'coche', 'El coche')], ['focus', async () => { await pagina.click('#btnGaraje'); await pagina.click('#hoja [data-veh="focus"]'); }]]) {
      await ir(); await enModelo(pagina, modelo);
      let vistas = 0, medidas = 0, bien = 0;
      for (const angulo of ANGULOS) {
        const vistasAngulo = [];
        for (const z of await pagina.evaluate(medir, angulo)) {
          if (z.x < 0 || z.x > ancho || z.y < 0 || z.y > alto) continue;
          const d = Math.hypot(z.px - z.x, z.py - z.y);
          medidas++; if (d <= 4) bien++; else fallos.push(`${modelo} ${z.zona} ${angulo}: punto a ${d.toFixed(1)} px del ancla`);
          if (!z.visto) continue;
          vistas++;
          const hueco = z.izq ? z.px - z.s.r : z.s.l - z.px;
          if (hueco < 0 || hueco > 16) fallos.push(`${modelo} ${z.zona} ${angulo}: etiqueta a ${hueco.toFixed(1)} px del punto`);
          if (z.toca !== z.zona) fallos.push(`${modelo} ${z.zona} ${angulo}: tocar su etiqueta abre ${z.toca}`);
          if (z.s.b > z.navTop) fallos.push(`${modelo} ${z.zona} ${angulo}: etiqueta bajo la barra`);
          for (const o of vistasAngulo) if (z.s.l < o.s.r && o.s.l < z.s.r && z.s.t < o.s.b && o.s.t < z.s.b) fallos.push(`${modelo} ${z.zona} ${angulo}: etiqueta pisa la de ${o.zona}`);
          vistasAngulo.push(z);
        }
      }
      cuenta[modelo] = `${bien}/${medidas}`;
      if (vistas < 6) fallos.push(`${modelo}: solo ${vistas} zonas visibles`);
    }
    await pagina.close();
    console.log(`# anclas ≤ 4 px a ${ancho}×${alto}: ${JSON.stringify(cuenta)}`);
    assert.deepEqual(fallos, []);
  });
}
