/** Lámina de T1642: Taller, archivo abierto, datos útiles y garaje con la moto. node herramientas/demo/lamina-archivos.mjs <archivo.png> */
import { existsSync } from 'node:fs';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { ticketJpg } from './ticket.mjs';

const RUTA = process.argv[2] || '/tmp/archivos.png', ESCALA = +(process.env.ESCALA || 1.5);
const CHROME = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
const servidor = await createServer({ logLevel: 'silent', server: { port: 0, host: '127.0.0.1' } });
await servidor.listen();
const base = servidor.resolvedUrls.local[0];
const nav = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--mute-audio', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ticket = (await ticketJpg(nav)).buffer.toString('base64');

const CSS = `@font-face{font-family:Chakra;src:url(${base}fuentes/chakra-petch-latin-700-normal.woff2)}@font-face{font-family:Inter;src:url(${base}fuentes/inter-latin-500-normal.woff2)}
*{margin:0;box-sizing:border-box}body{background:radial-gradient(1600px 900px at 50% 0%,#2a1a10,#0a0a10 60%,#050508);display:flex;gap:64px;justify-content:center;align-items:flex-start;padding:64px 64px 54px;font-family:Chakra;color:#f3ede6}
figure{display:flex;flex-direction:column;align-items:center;gap:20px}figcaption{font-size:30px;letter-spacing:.16em;color:#ffb347;text-align:center}figcaption small{display:block;margin-top:6px;font:500 17px Inter;letter-spacing:0;color:#bdb3a8}
.tel{width:438px;height:941px;border-radius:58px;padding:13px;background:#0b0b0f;box-shadow:0 0 0 2px #2c2a30,0 0 0 9px #141318,0 40px 120px #000c,0 0 160px #f08a1c22}
iframe{width:412px;height:915px;border:0;border-radius:46px;display:block;background:#07080c}`;
const PANTALLAS = [['taller', 'TALLER', 'Visitas con su ticket; el importe va a Gastos'], ['archivo', 'ARCHIVOS', 'Foto o PDF guardado en el móvil'], ['datos', 'DATOS ÚTILES', 'Cada valor con su fuente, editable'], ['garaje', 'GARAJE', 'Coche o moto, cada uno con su plan']];

const p = await nav.newPage({ viewport: { width: 2134, height: 1170 }, deviceScaleFactor: ESCALA });
p.on('pageerror', e => console.error('ERR', e.message));
await p.goto(base + 'herramientas/demo/escenario.html');
await p.setContent(`<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${PANTALLAS.map(([id, t, s]) => `<figure><div class="tel"><iframe id="${id}" src="${base}?hoy=2026-11-11&limpio&sin-sw"></iframe></div><figcaption>${t}<small>${s}</small></figcaption></figure>`).join('')}</body></html>`);
await p.waitForFunction(() => [...document.querySelectorAll('iframe')].every(f => f.contentWindow.__app && f.contentWindow.__listo3d), null, { timeout: 180000 });
const marco = async id => (await p.$(`#${id}`)).contentFrame();

const visita = `async b64 => { const c = window.__app.cliente, f = new File([Uint8Array.from(atob(b64), x => x.charCodeAt(0))], 'ticket-taller.jpg', { type: 'image/jpeg' });
  await c.anotarVisita({ fecha: '2026-11-11', km: 165500, taller: 'Taller de ejemplo', trabajos: ['aceite'], importe: 129.9, archivo: f, nombre: f.name }); }`;
const [mT, mA, mD, mG] = await Promise.all(PANTALLAS.map(x => marco(x[0])));
await mT.evaluate(`(${visita})('${ticket}')`); await mT.evaluate(() => window.__app.ir('taller'));
await mA.evaluate(`(${visita})('${ticket}')`); await mA.evaluate(() => window.__app.ir('taller'));
await mA.waitForSelector('.visitaT'); await mA.click('.visitaT'); await mA.waitForSelector('#hoja.on [data-archivo]'); await mA.click('#hoja [data-archivo]');
await mD.evaluate(async () => {
  const c = window.__app.cliente, b = await (await fetch('modelo/poster.jpg')).blob();
  await c.adjuntarVehiculo(new File([b], 'foto-del-coche.jpg', { type: 'image/jpeg' }));
  await c.editarFicha({ clave: 'taller', valor: 'Taller de ejemplo', fuente: 'verbal' });
  window.__app.ir('guantera');
});
await mD.waitForTimeout(600);
await mD.evaluate(() => { const g = document.getElementById('guantera'), l = [...g.querySelectorAll('.grupo .lbl')].find(x => /Archivos/.test(x.textContent)); g.scrollTop = l.parentElement.offsetTop - 8; });
await mG.evaluate(async () => { const c = window.__app.cliente; await c.crearVehiculo({ tipo: 'moto', etiqueta: 'La moto', marca: 'Trail', modelo: '700', anio: 2019, km: 21000 }); await c.usar('la-moto'); });
await mG.waitForTimeout(500); await mG.evaluate(() => window.__app.abrirGaraje());
await p.waitForTimeout(2500);
await p.screenshot({ path: RUTA });
console.log('lámina', RUTA);
await nav.close(); await servidor.close();
