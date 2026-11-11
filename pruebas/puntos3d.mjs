/** Puntos y etiquetas en Inicio (T1659): ningún punto cae sobre la caja de otra etiqueta y cada punto sigue a ≤ 4 px de su ancla, en los tres modelos, en vertical y apaisado, a tres ángulos. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { build, preview } from 'vite';
import { chromium } from 'playwright-core';

const CHROME = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
const PANTALLAS = [[390, 844], [915, 412]];
const ANGULOS = [[0, 1], [1.9, 0.8], [-1.6, 1.25]];
let servidor, navegador, url;

before(async () => {
  await build({ logLevel: 'silent' });
  servidor = await preview({ logLevel: 'silent', preview: { port: 0, host: '127.0.0.1' } });
  url = servidor.resolvedUrls.local[0];
  navegador = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--mute-audio', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
});

after(async () => { await navegador?.close(); await new Promise(r => servidor ? servidor.httpServer.close(r) : r()); });

/** Gira la cámara y devuelve los puntos que pisan una etiqueta ajena y la distancia de cada punto a su ancla. */
function medir([giro, zoom]) {
  const c = window.__coche3d, ctl = c.controles, cam = ctl.object;
  ctl.autoRotate = false; ctl.enableDamping = false;
  const off = cam.position.clone().sub(ctl.target), r = off.length() * zoom;
  const az = Math.atan2(off.x, off.z) + giro, pol = Math.acos(off.y / off.length());
  cam.position.set(ctl.target.x + r * Math.sin(pol) * Math.sin(az), ctl.target.y + r * Math.cos(pol), ctl.target.z + r * Math.sin(pol) * Math.cos(az));
  ctl.update(); c.paso(0);
  const lienzo = document.getElementById('lienzo3d').getBoundingClientRect();
  const anclas = new Map(c.anclas().map(({ zona, pos }) => { const p = pos.project(cam); return [zona, [lienzo.left + (p.x + 1) / 2 * lienzo.width, lienzo.top + (1 - p.y) / 2 * lienzo.height]]; }));
  const zonas = [...document.querySelectorAll('.escenario>.zonas3d .zona')].filter(el => anclas.has(el.dataset.zona) && getComputedStyle(el).opacity !== '0');
  const puntos = zonas.map(el => ({ zona: el.dataset.zona, r: el.querySelector('i').getBoundingClientRect() })).filter(p => p.r.right > 0 && p.r.left < innerWidth && p.r.bottom > 0 && p.r.top < innerHeight);
  const cajas = zonas.filter(el => !el.classList.contains('oculta')).map(el => ({ zona: el.dataset.zona, r: el.querySelector('span').getBoundingClientRect() }));
  const pisan = [];
  for (const p of puntos) for (const e of cajas) if (e.zona !== p.zona && p.r.left < e.r.right && e.r.left < p.r.right && p.r.top < e.r.bottom && e.r.top < p.r.bottom) pisan.push(`punto ${p.zona} sobre ${e.zona}`);
  const anclasPx = puntos.map(p => { const [x, y] = anclas.get(p.zona); return { zona: p.zona, d: Math.hypot(p.r.left + p.r.width / 2 - x, p.r.top + p.r.height / 2 - y) }; });
  return { pisan, anclasPx };
}

async function alta(pagina, tipo, nombre) {
  await pagina.click('#btnGaraje');
  await pagina.click(`#hoja .tipos [data-tipo="${tipo}"]`);
  await pagina.fill('#gNombre', nombre); await pagina.fill('#gKm', '21000');
  await pagina.click('#gGuardar');
}
const enModelo = (pagina, m) => pagina.waitForFunction(m => { const h = document.getElementById('hoja'); return window.__listo3d === true && window.__coche3d.modelo === m && !document.querySelector('.escenario.cambiando') && !h.classList.contains('on') && h.getBoundingClientRect().top >= innerHeight - 1; }, m, { timeout: 90000 });

test('ningún punto pisa la etiqueta de otra zona; anclas ≤ 4 px (3 modelos × vertical y apaisado × 3 ángulos)', async () => {
  const fallos = [];
  let casos = 0, limpios = 0, anclas = 0, bien = 0;
  for (const [ancho, alto] of PANTALLAS) {
    const pagina = await navegador.newPage({ viewport: { width: ancho, height: alto } });
    pagina.setDefaultTimeout(90000);
    await pagina.goto(`${url}?hoy=2026-11-11&limpio&sin-sw`);
    await enModelo(pagina, 'focus');
    for (const [modelo, ir] of [['moto', () => alta(pagina, 'moto', 'La moto')], ['coche', () => alta(pagina, 'coche', 'El coche')], ['focus', async () => { await pagina.click('#btnGaraje'); await pagina.click('#hoja [data-veh="focus"]'); }]]) {
      await ir(); await enModelo(pagina, modelo);
      for (const angulo of ANGULOS) {
        const m = await pagina.evaluate(medir, angulo);
        casos++; if (!m.pisan.length) limpios++;
        for (const s of m.pisan) fallos.push(`${ancho}×${alto} ${modelo} ${angulo}: ${s}`);
        for (const a of m.anclasPx) { anclas++; if (a.d <= 4) bien++; else fallos.push(`${ancho}×${alto} ${modelo} ${a.zona} ${angulo}: punto a ${a.d.toFixed(1)} px del ancla`); }
      }
    }
    await pagina.close();
  }
  console.log(`# sin puntos sobre etiquetas: ${limpios}/${casos} · anclas ≤ 4 px: ${bien}/${anclas}`);
  assert.deepEqual(fallos, []);
  assert.equal(casos, 18);
});
