/** Demo T1642 fotograma a fotograma: ticket a una visita → la zona pasa a verde → cambio a la moto. node herramientas/demo/grabar-archivos.mjs <carpeta> */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import { ticketJpg } from './ticket.mjs';

const SALIDA = process.argv[2] || '/tmp/demo-archivos', FPS = 30, ESCALA = +(process.env.ESCALA || 2);
mkdirSync(SALIDA, { recursive: true });
const CHROME = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
const servidor = await createServer({ logLevel: 'silent', server: { port: 0, host: '127.0.0.1' } });
await servidor.listen();
const base = servidor.resolvedUrls.local[0];
const nav = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--mute-audio', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ticket = await ticketJpg(nav);
const pag = await nav.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: ESCALA });
pag.on('pageerror', e => console.error('ERR', e.message));
await pag.goto(base + 'herramientas/demo/escenario.html');
await pag.evaluate(() => {
  document.querySelector('.titulo small').textContent = 'Taller, archivos y varios vehículos · sin conexión';
  document.getElementById('pasos').innerHTML = ['Anota la visita con su ticket', 'La zona del motor, en verde', 'Cambia a la moto'].map((t, i) => `<li><i>${i + 1}</i>${t}</li>`).join('');
  document.querySelector('.der').innerHTML = '<p><b>Ticket en el móvil</b>Foto o PDF, guardado sin servidor.</p><p><b>El núcleo recalcula</b>Aceite al día: próxima en 1 año o 20.000 km. El importe entra en Gastos.</p><p><b>Garaje</b>Coche o moto: cada tipo trae su plan.</p>';
});
await pag.evaluate(u => { document.getElementById('app').src = u; }, base + '?hoy=2026-11-11&limpio&sin-sw');
await pag.waitForFunction(() => { const w = document.getElementById('app').contentWindow; return w.__app && w.__listo3d; }, null, { timeout: 120000 });
const marco = pag.frames().find(f => f.url().includes('hoy=2026'));
const caja = await pag.evaluate(() => { const r = document.getElementById('pantalla').getBoundingClientRect(); return { x: r.left, y: r.top }; });

await marco.evaluate(async () => {
  const c = window.__app.cliente;
  await c.crearVehiculo({ tipo: 'moto', etiqueta: 'La moto', marca: 'Trail', modelo: '700', anio: 2019, km: 21000 });
  await c.usar('focus');
  window.__sonidos = [];
  window.__app.sonido.tocar = n => window.__sonidos.push([window.__vt || 0, n]);
  window.__coche3d.paso(0);
});
await pag.waitForTimeout(600);
const fuera = [];
let vt = 0, n = 0;
const animaciones = `(vt => { for (const d of [document, document.getElementById('app').contentDocument]) for (const a of d.getAnimations()) { if (a.__t0 == null) { a.__t0 = vt - (a.currentTime || 0); a.pause(); } a.currentTime = vt - a.__t0; } })`;
async function fotograma() {
  await marco.evaluate(t => { window.__vt = t; if (!document.getElementById('inicio').hidden && window.__coche3d && !document.querySelector('.escenario').classList.contains('plano')) window.__coche3d.paso(1 / 30); }, vt);
  await pag.evaluate(`${animaciones}(${vt * 1000})`);
  await pag.screenshot({ path: `${SALIDA}/f${String(n).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 });
  n++; vt = n / FPS;
}
const durante = async seg => { const fin = vt + seg; while (vt < fin - 1e-6) await fotograma(); };
const paso = i => pag.evaluate(i => document.querySelectorAll('#pasos li').forEach((l, k) => { l.classList.toggle('on', k === i); l.classList.toggle('hecho', k < i); }), i);
const onda = (x, y) => pag.evaluate(([x, y]) => { const o = document.createElement('div'); o.className = 'onda'; o.style.left = x + 'px'; o.style.top = y + 'px'; document.getElementById('capa').appendChild(o); }, [x, y]);
async function tocar(sel) {
  const el = typeof sel === 'string' ? await marco.$(sel) : sel, r = await el.boundingBox(), x = r.x + r.width / 2, y = r.y + r.height / 2;
  await onda(x - caja.x, y - caja.y);
  await pag.mouse.click(x, y);
}

// 0. Abrir: Inicio con la zona del motor en rojo
fuera.push([0.05, 'ambiente']);
await durante(0.5);
await pag.evaluate(() => { document.getElementById('splash').style.opacity = 0; });
fuera.push([vt, 'abrir']);
await durante(1.3);
// 1. Taller: visita con ticket
await paso(0);
await tocar('#nav [data-nav="taller"]'); await durante(0.7);
await tocar('#nuevaV'); await durante(0.6);
await marco.evaluate(() => { const h = document.getElementById('hoja'); h.querySelector('#vKm').value = '165500'; h.querySelector('#vImp').value = '129,90'; h.querySelector('#vTaller').value = 'Taller de ejemplo'; });
await durante(0.3);
await tocar('#hoja [data-trabajo="aceite"]'); await durante(0.5);
const [fc] = await Promise.all([pag.waitForEvent('filechooser'), tocar('#hoja [data-elegir="archivo"]')]);
await fc.setFiles(ticket); await durante(0.8);
await tocar('#vGuardar'); await durante(1.2);
// 2. Inicio: la zona pasa a verde
await paso(1);
await tocar('#nav [data-nav="inicio"]'); await durante(1.0);
await tocar('.zonas3d .zona[data-zona="motor"]'); await durante(1.7);
await marco.evaluate(() => document.querySelector('#hoja [data-cerrar]').click()); await durante(0.4);
// 3. Garaje: cambio a la moto
await paso(2);
await tocar('#btnGaraje'); await durante(0.9);
await tocar('#hoja [data-veh="la-moto"]'); await durante(2.0);
await pag.evaluate(() => { document.getElementById('negro').style.opacity = 1; });
await durante(0.45);

const eventos = [...fuera, ...await marco.evaluate(() => window.__sonidos)].sort((a, b) => a[0] - b[0]);
writeFileSync(`${SALIDA}/sonidos.json`, JSON.stringify({ fps: FPS, total: vt, tema: 'atardecer', eventos }));
console.log(n, 'fotogramas', vt.toFixed(2), 's', JSON.stringify(eventos));
await nav.close(); await servidor.close();
