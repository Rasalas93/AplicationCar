/** Inicio con la moto, el coche y el Focus en 3D (390 px): node herramientas/demo/garaje3d.mjs <carpeta> → moto.png, coche.png, focus.png */
import { mkdirSync, existsSync } from 'node:fs';
import { build, preview } from 'vite';
import { chromium } from 'playwright-core';

const SALIDA = process.argv[2] || '/tmp/garaje3d';
mkdirSync(SALIDA, { recursive: true });
const CHROME = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
await build({ logLevel: 'silent' });
const servidor = await preview({ logLevel: 'silent', preview: { port: 0, host: '127.0.0.1' } });
const nav = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--mute-audio', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pag = await nav.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
pag.on('pageerror', e => console.error('ERR', e.message));
await pag.goto(servidor.resolvedUrls.local[0] + '?hoy=2026-11-11&limpio&sin-sw');
await pag.waitForFunction('window.__listo3d === true', null, { timeout: 90000 });

/** Deja la cámara quieta en la vista de entrada y espera al fundido. */
async function foto(nombre) {
  await pag.waitForFunction(m => window.__listo3d === true && window.__coche3d.modelo === m, nombre, { timeout: 90000 });
  await pag.waitForTimeout(900);
  await pag.evaluate(() => { const c = window.__coche3d; c.activar(false); c.paso(0); });
  await pag.screenshot({ path: `${SALIDA}/${nombre}.png` });
  await pag.evaluate(() => window.__coche3d.activar(true));
}
async function alta(tipo, nombre, matricula) {
  await pag.click('#btnGaraje');
  await pag.click(`#hoja .tipos [data-tipo="${tipo}"]`);
  await pag.fill('#gNombre', nombre); await pag.fill('#gKm', '21000'); await pag.fill('#gMatricula', matricula);
  await pag.click('#gGuardar');
}
await foto('focus');
await alta('moto', 'La moto', '0000 AAA'); await foto('moto');
await alta('coche', 'El crossover', '0000 AAA'); await foto('coche');
await nav.close(); servidor.httpServer.close();
