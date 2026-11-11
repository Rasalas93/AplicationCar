/** Graba la demo fotograma a fotograma (tiempo virtual) y escribe fotogramas + sonidos.json: node herramientas/demo/grabar.mjs <carpeta> */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const SALIDA = process.argv[2] || '/tmp/demo', FPS = 30, ESCALA = +(process.env.ESCALA || 2);
mkdirSync(SALIDA, { recursive: true });
const CHROME = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
const servidor = await createServer({ logLevel: 'silent', server: { port: 0, host: '127.0.0.1' } });
await servidor.listen();
const base = servidor.resolvedUrls.local[0];
const nav = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--mute-audio', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pag = await nav.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: ESCALA });
pag.on('pageerror', e => console.error('ERR', e.message));
await pag.goto(base + 'herramientas/demo/escenario.html');
await pag.evaluate(u => { document.getElementById('app').src = u; }, base + '?hoy=2026-11-11&limpio&sin-sw');
await pag.waitForFunction(() => { const w = document.getElementById('app').contentWindow; return w.__app && w.__listo3d; }, null, { timeout: 120000 });
const marco = pag.frames().find(f => f.url().includes('hoy=2026'));
const caja = await pag.evaluate(() => { const r = document.getElementById('pantalla').getBoundingClientRect(); return { x: r.left, y: r.top }; });

await marco.evaluate(() => {
  window.__sonidos = [];
  window.__app.sonido.tocar = n => window.__sonidos.push([window.__vt || 0, n]);
  window.__coche3d.paso(0);
});
const fuera = [];
let vt = 0, n = 0;

/** Congela las animaciones CSS de ambos documentos y las lleva al tiempo virtual. */
const animaciones = `(vt => { for (const d of [document, document.getElementById('app').contentDocument]) for (const a of d.getAnimations()) { if (a.__t0 == null) { a.__t0 = vt - (a.currentTime || 0); a.pause(); } a.currentTime = vt - a.__t0; } })`;

async function fotograma() {
  await marco.evaluate(t => { window.__vt = t; if (!document.getElementById('inicio').hidden) window.__coche3d.paso(1 / 30); }, vt);
  await pag.evaluate(`${animaciones}(${vt * 1000})`);
  await pag.screenshot({ path: `${SALIDA}/f${String(n).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 });
  n++; vt = n / FPS;
}
const durante = async (seg, cada) => { const t0 = vt, fin = vt + seg; while (vt < fin - 1e-6) { if (cada) await cada((vt - t0) / seg); await fotograma(); } };
const paso = i => pag.evaluate(i => document.querySelectorAll('#pasos li').forEach((l, k) => { l.classList.toggle('on', k === i); l.classList.toggle('hecho', k < i); }), i);
const dedo = (x, y, ve) => pag.evaluate(([x, y, ve]) => { const d = document.getElementById('dedo'); d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.opacity = ve ? 1 : 0; }, [x, y, ve]);
const onda = (x, y) => pag.evaluate(([x, y]) => { const o = document.createElement('div'); o.className = 'onda'; o.style.left = x + 'px'; o.style.top = y + 'px'; document.getElementById('capa').appendChild(o); }, [x, y]);
async function tocar(el) {
  const r = await el.boundingBox(), x = r.x + r.width / 2, y = r.y + r.height / 2;
  await onda(x - caja.x, y - caja.y);
  await pag.mouse.click(x, y);
}

// 1. Abrir la app
await paso(0);
fuera.push([0.1, 'ambiente']);
await durante(1.0);
await pag.evaluate(() => { document.getElementById('splash').style.opacity = 0; });
fuera.push([vt, 'abrir']);
await durante(1.6);
// 2. Girar el coche con el dedo
await paso(1);
const rc = await (await marco.$('#inicio canvas')).boundingBox();
const x0 = rc.x + rc.width * 0.72, y0 = rc.y + rc.height * 0.55;
await dedo(x0 - caja.x, y0 - caja.y, true); await pag.mouse.move(x0, y0); await pag.mouse.down();
fuera.push([vt, 'tic']);
await durante(1.7, async u => {
  const e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2, x = x0 - 320 * e, y = y0 + 18 * Math.sin(u * Math.PI);
  await pag.mouse.move(x, y); await dedo(x - caja.x, y - caja.y, true);
});
await pag.mouse.up(); await dedo(0, 0, false);
await durante(0.9);
// 3. Tocar una zona roja
await paso(2);
let zona = null;
for (const z of await marco.$$('.zonas3d .zona[data-nivel="rojo"]:not(.oculta)')) if (!zona || (await z.getAttribute('data-zona')) === 'motor') zona = z;
await tocar(zona);
await durante(2.8);
// 4. Ir a Gastos
await paso(3);
await tocar(await marco.$('#hoja [data-ir="gastos"]'));
await durante(3.0);
await pag.evaluate(() => { document.getElementById('negro').style.opacity = 1; });
await durante(0.5);

const eventos = [...fuera, ...await marco.evaluate(() => window.__sonidos)].sort((a, b) => a[0] - b[0]);
writeFileSync(`${SALIDA}/sonidos.json`, JSON.stringify({ fps: FPS, total: vt, tema: 'atardecer', eventos }));
console.log(n, 'fotogramas', vt.toFixed(2), 's', JSON.stringify(eventos));
await nav.close(); await servidor.close();
