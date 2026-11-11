/** Saca las láminas de la entrega: node herramientas/demo/laminas.mjs <carpeta> → inicio-3d.png y app.png */
import { existsSync } from 'node:fs';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const SALIDA = process.argv[2] || '/tmp';
const CHROME = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
const servidor = await createServer({ logLevel: 'silent', server: { port: 0, host: '127.0.0.1' } });
await servidor.listen();
const base = servidor.resolvedUrls.local[0];
const nav = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--mute-audio', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

const CSS = `@font-face{font-family:Chakra;src:url(${base}fuentes/chakra-petch-latin-700-normal.woff2)}
*{margin:0;box-sizing:border-box}body{background:radial-gradient(1400px 800px at 50% 0%,#2a1a10,#0a0a10 60%,#050508);display:flex;gap:70px;justify-content:center;align-items:flex-start;padding:70px 70px 60px;font-family:Chakra;color:#f3ede6}
figure{display:flex;flex-direction:column;align-items:center;gap:26px}figcaption{font-size:30px;letter-spacing:.16em;color:#ffb347}
.tel{width:438px;height:941px;border-radius:58px;padding:13px;background:#0b0b0f;box-shadow:0 0 0 2px #2c2a30,0 0 0 9px #141318,0 40px 120px #000c,0 0 160px #f08a1c22}
iframe{width:412px;height:915px;border:0;border-radius:46px;display:block;background:#07080c}`;
const telefono = (hash, titulo) => `<figure><div class="tel"><iframe src="${base}?hoy=2026-11-11&limpio&sin-sw#${hash}"></iframe></div>${titulo ? `<figcaption>${titulo}</figcaption>` : ''}</figure>`;

async function lamina(html, ancho, alto, ruta) {
  const p = await nav.newPage({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 2 });
  await p.goto(base + 'herramientas/demo/escenario.html');
  await p.setContent(`<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${html}</body></html>`);
  await p.waitForFunction(() => [...document.querySelectorAll('iframe')].every(f => f.contentWindow.__app && f.contentWindow.__listo3d), null, { timeout: 180000 });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: ruta });
  await p.close();
}

await lamina(telefono('inicio'), 578, 1081, `${SALIDA}/inicio-3d.png`);
await lamina([['inicio', 'Inicio'], ['guantera', 'Guantera'], ['gastos', 'Gastos']].map(([h, t]) => telefono(h, t)).join(''), 1594, 1150, `${SALIDA}/app.png`);
console.log('láminas en', SALIDA);
await nav.close(); await servidor.close();
