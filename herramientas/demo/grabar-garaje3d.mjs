/** Demo T1656 fotograma a fotograma: Garaje → la moto, el coche y el Focus en 3D en Inicio. node herramientas/demo/grabar-garaje3d.mjs <carpeta> */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const SALIDA = process.argv[2] || '/tmp/demo-garaje3d', FPS = 30, ESCALA = +(process.env.ESCALA || 1);
mkdirSync(SALIDA, { recursive: true });
const CHROME = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
const servidor = await createServer({ logLevel: 'silent', server: { port: 0, host: '127.0.0.1' } });
await servidor.listen();
const base = servidor.resolvedUrls.local[0];
const nav = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--mute-audio', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pag = await nav.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: ESCALA });
pag.on('pageerror', e => console.error('ERR', e.message));
await pag.goto(base + 'herramientas/demo/escenario.html');
await pag.evaluate(() => {
  document.querySelector('.titulo small').textContent = 'Cada vehículo del Garaje, en 3D';
  document.getElementById('pasos').innerHTML = ['Abre el Garaje', 'La moto, con su cadena', 'El coche, en su color', 'Vuelta al Focus'].map((t, i) => `<li><i>${i + 1}</i>${t}</li>`).join('');
  document.querySelector('.der').innerHTML = '<p><b>Un modelo por tipo</b>Moto naked, crossover y el Focus: mismo estudio, mismas luces.</p><p><b>Sus datos</b>Color y matrícula del vehículo; zonas propias de cada modelo.</p><p><b>Ligero</b>Solo se descarga el modelo del vehículo que usas.</p>';
});
await pag.evaluate(u => { document.getElementById('app').src = u; }, base + '?hoy=2026-11-11&limpio&sin-sw');
await pag.waitForFunction(() => { const w = document.getElementById('app').contentWindow; return w.__app && w.__listo3d === true; }, null, { timeout: 120000 });
const marco = pag.frames().find(f => f.url().includes('hoy=2026'));
const caja = await pag.evaluate(() => { const r = document.getElementById('pantalla').getBoundingClientRect(); return { x: r.left, y: r.top }; });

await marco.evaluate(async () => {
  const c = window.__app.cliente;
  await c.crearVehiculo({ tipo: 'moto', etiqueta: 'La moto', marca: 'Naked', modelo: '700', anio: 2021, km: 9800, matricula: '0000 AAA' });
  await c.crearVehiculo({ tipo: 'coche', etiqueta: 'El crossover', marca: 'Crossover', modelo: '1.5', anio: 2023, km: 21000, matricula: '0000 AAA' });
  await c.usar('focus');
  window.__sonidos = [];
  window.__app.sonido.tocar = n => window.__sonidos.push([window.__vt || 0, n]);
});
await marco.waitForFunction(() => window.__listo3d === true && window.__coche3d.modelo === 'focus');
await marco.evaluate(() => window.__coche3d.paso(0));
const fuera = [];
let vt = 0, n = 0;
const animaciones = `(vt => { for (const d of [document, document.getElementById('app').contentDocument]) for (const a of d.getAnimations()) { if (a.__t0 == null) { a.__t0 = vt - (a.currentTime || 0); a.pause(); } a.currentTime = vt - a.__t0; } })`;
async function fotograma() {
  await marco.evaluate(t => { window.__vt = t; if (!document.getElementById('inicio').hidden) window.__coche3d.paso(1 / 30); }, vt);
  await pag.evaluate(`${animaciones}(${vt * 1000})`);
  await pag.screenshot({ path: `${SALIDA}/f${String(n).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 });
  n++; vt = n / FPS;
}
const durante = async seg => { const fin = vt + seg; while (vt < fin - 1e-6) await fotograma(); };
/** Graba mientras el visor cambia al modelo `m` (la descarga es real; el fundido, en tiempo virtual) y un poco más. */
const hasta = async (m, seg) => { while (!(await marco.evaluate(m => window.__coche3d.modelo === m && !document.querySelector('.escenario.cambiando'), m))) await fotograma(); await durante(seg); };
const paso = i => pag.evaluate(i => document.querySelectorAll('#pasos li').forEach((l, k) => { l.classList.toggle('on', k === i); l.classList.toggle('hecho', k < i); }), i);
const onda = (x, y) => pag.evaluate(([x, y]) => { const o = document.createElement('div'); o.className = 'onda'; o.style.left = x + 'px'; o.style.top = y + 'px'; document.getElementById('capa').appendChild(o); }, [x, y]);
async function tocar(sel) {
  const el = await marco.$(sel), r = await el.boundingBox(), x = r.x + r.width / 2, y = r.y + r.height / 2;
  await onda(x - caja.x, y - caja.y);
  await pag.mouse.click(x, y);
}

fuera.push([0.05, 'ambiente']);
await durante(0.4);
await pag.evaluate(() => { document.getElementById('splash').style.opacity = 0; });
fuera.push([vt, 'abrir']);
await durante(1.1);
await paso(0);
await tocar('#btnGaraje'); await durante(0.9);
await paso(1);
await tocar('#hoja [data-veh="la-moto"]'); await hasta('moto', 2.0);
await tocar('#btnGaraje'); await durante(0.8);
await paso(2);
await tocar('#hoja [data-veh="el-crossover"]'); await hasta('coche', 2.0);
await tocar('#btnGaraje'); await durante(0.7);
await paso(3);
await tocar('#hoja [data-veh="focus"]'); await hasta('focus', 1.3);
await pag.evaluate(() => { document.getElementById('negro').style.opacity = 1; });
await durante(0.45);

const eventos = [...fuera, ...await marco.evaluate(() => window.__sonidos)].sort((a, b) => a[0] - b[0]);
writeFileSync(`${SALIDA}/sonidos.json`, JSON.stringify({ fps: FPS, total: vt, tema: 'atardecer', eventos }));
console.log(n, 'fotogramas', vt.toFixed(2), 's', JSON.stringify(eventos));
await nav.close(); await servidor.close();
