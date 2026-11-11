/** Humo: build real, Chromium headless 412×915, coche 3D con píxeles y las tres pantallas. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { build, preview } from 'vite';
import { chromium } from 'playwright-core';

const CHROME = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
let servidor, navegador, pagina, url;
const errores = [];

before(async () => {
  await build({ logLevel: 'silent' });
  servidor = await preview({ logLevel: 'silent', preview: { port: 0, host: '127.0.0.1' } });
  url = servidor.resolvedUrls.local[0];
  navegador = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--mute-audio', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  pagina = await navegador.newPage({ viewport: { width: 412, height: 915 } });
  pagina.on('pageerror', e => errores.push(e.message));
  await pagina.goto(`${url}?hoy=2026-11-11&limpio&sin-sw`);
  await pagina.waitForFunction('window.__app && window.__app.listo', null, { timeout: 30000 });
});

after(async () => { await navegador?.close(); await new Promise(r => servidor ? servidor.httpServer.close(r) : r()); });

test('Inicio pinta el coche 3D en el lienzo (píxeles no vacíos)', async () => {
  await pagina.waitForFunction('window.__listo3d === true', null, { timeout: 90000 });
  await pagina.waitForTimeout(800);
  const m = await pagina.evaluate(() => {
    const l = document.querySelector('#inicio canvas'), c = document.createElement('canvas');
    c.width = l.width; c.height = l.height;
    const g = c.getContext('2d'); g.drawImage(l, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data, colores = new Set();
    let vivos = 0, total = 0;
    for (let i = 0; i < d.length; i += 4 * 7) {
      total++;
      if (d[i + 3] > 0 && d[i] + d[i + 1] + d[i + 2] > 90) vivos++;
      colores.add((d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | d[i + 2] >> 4);
    }
    return { vivos: vivos / total, colores: colores.size, ancho: l.width };
  });
  assert.ok(m.ancho > 0, 'el lienzo tiene tamaño');
  assert.ok(m.vivos > 0.05, `píxeles vivos ${(m.vivos * 100).toFixed(1)} %`);
  assert.ok(m.colores > 60, `colores distintos ${m.colores}`);
});

test('tocar una zona roja abre su tarea', async () => {
  const zona = pagina.locator('.zonas3d .zona[data-nivel="rojo"]:not(.oculta)').first();
  await zona.click({ force: true });
  await pagina.waitForSelector('#hoja.on');
  assert.ok((await pagina.textContent('#hoja')).trim().length > 10);
  await pagina.click('#sombra', { position: { x: 200, y: 40 } });
  await pagina.waitForFunction(() => !document.getElementById('hoja').classList.contains('on'));
});

test('«Ver en Gastos» desde una tarea deja abierta la pantalla Gastos', async () => {
  await pagina.click('#nav [data-nav="inicio"]');
  await pagina.locator('.zonas3d .zona[data-zona="motor"]').click({ force: true });
  await pagina.waitForSelector('#hoja.on [data-ir="gastos"]');
  await pagina.click('#hoja [data-ir="gastos"]');
  await pagina.waitForTimeout(600);
  assert.equal(await pagina.evaluate(() => document.getElementById('gastos').hidden), false);
  assert.equal(await pagina.evaluate(() => location.hash), '#gastos');
});

for (const [clave, texto] of [['gastos', 'Gastado'], ['guantera', 'documentos'], ['inicio', 'Odómetro']]) {
  test(`la pantalla ${clave} abre desde la barra`, async () => {
    await pagina.click(`#nav [data-nav="${clave}"]`);
    await pagina.waitForFunction(k => !document.getElementById(k).hidden, clave);
    const visible = await pagina.evaluate(k => { const r = document.getElementById(k).getBoundingClientRect(); return r.width > 0 && r.height > 0; }, clave);
    assert.ok(visible);
    assert.match(await pagina.textContent(`#${clave}`), new RegExp(texto, 'i'));
  });
}

test('sin errores de página', () => assert.deepEqual(errores, []));
