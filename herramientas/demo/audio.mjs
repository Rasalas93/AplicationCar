/** Mezcla el audio de la demo con las voces de la app y un fondo suave: node herramientas/demo/audio.mjs sonidos.json salida.wav */
import { readFileSync, writeFileSync } from 'node:fs';
import { SR, voces } from '../../src/app/sonido/sintesis.js';

globalThis.window = globalThis.window || {};
await import('../../src/app/skin/temas.js');
const D = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const S = { ...window.TEMA_BASE.sonidos, ...window.TEMAS[D.tema].sonidos }, V = voces(S);
const N = Math.round(D.total * SR), L = new Float32Array(N), R = new Float32Array(N), TAU = 6.2832, db = v => Math.pow(10, v / 20);

function fondo(t0) {
  const [a, b, c] = S.ambiente; let s = 7, bl = 0, br = 0, lp = 0, rp = 0;
  const azar = () => { s = (s * 16807) % 2147483647; return s / 1073741823.5 - 1; };
  for (let i = Math.round(t0 * SR); i < N; i++) {
    const t = i / SR, env = Math.min(1, (t - t0) / 0.8) * Math.min(1, (D.total - t) / 0.8);
    bl = bl * 0.995 + azar() * 0.07; br = br * 0.995 + azar() * 0.07; lp += (bl - lp) * 0.04; rp += (br - rp) * 0.04;
    const z = db(-29) * (Math.sin(TAU * a * t) + 0.55 * Math.sin(TAU * b * t + 0.3) + 0.4 * Math.sin(TAU * c * t)) * (0.82 + 0.18 * Math.sin(t * 2.1));
    L[i] += env * (lp * db(-14) + z); R[i] += env * (rp * db(-14) + z);
  }
}
for (const [t, nombre] of D.eventos) {
  if (nombre === 'ambiente') { fondo(t); continue; }
  if (!V[nombre]) continue;
  const v = V[nombre](), i0 = Math.round(t * SR);
  for (let i = 0; i < v.L.length && i0 + i < N; i++) { L[i0 + i] += v.L[i]; R[i0 + i] += v.R[i]; }
}
let pico = 0; for (let i = 0; i < N; i++) pico = Math.max(pico, Math.abs(L[i]), Math.abs(R[i]));
const g = pico > 0.89 ? 0.89 / pico : 1, buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(L[i] * g * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(R[i] * g * 32767), 46 + i * 4); }
writeFileSync(process.argv[3], buf);
console.log('wav', D.total.toFixed(2), 's, pico', pico.toFixed(2));
