/** Voces de la app sintetizadas por código (primitivas de audio.mjs, T1622-T1634): puras, sirven al navegador y al vídeo. */
export const SR = 48000;
const TAU = 6.2832, db = v => Math.pow(10, v / 20);

function lienzo(seg, semilla = 20261111) {
  const N = Math.round(seg * SR), L = new Float32Array(N), R = new Float32Array(N);
  let s = semilla;
  const azar = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 * 2 - 1; };
  const poner = (t0, dur, pan, f) => {
    const i0 = Math.round(t0 * SR), n = Math.round(dur * SR), gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
    for (let i = 0; i < n && i0 + i < N; i++) { const v = f(i / SR, i / n); L[i0 + i] += v * gl; R[i0 + i] += v * gr; }
  };
  const banda = q => { let lp = 0, bp = 0; return (x, fc) => { const f = 2 * Math.sin(Math.PI * Math.min(fc, SR / 6) / SR); lp += f * bp; const hp = x - lp - q * bp; bp += f * hp; return bp; }; };
  return { N, L, R, azar, poner, banda };
}

/** Las voces de un tema (`sonidos` de temas.js). Cada voz devuelve { L, R } a 48 kHz. */
export function voces(S) {
  const tic = (c, t0, pan, nivel) => { const f = c.banda(0.35); c.poner(t0, 0.07, pan, t => (f(c.azar(), 3800) * Math.exp(-t / 0.004) * db(-8) + Math.sin(TAU * S.tic * t) * Math.exp(-t / 0.018) * db(-15)) * nivel); };
  const tono = (c, t0, hz, dur, nivel, pan) => c.poner(t0, dur, pan, t => (Math.sin(TAU * hz * t) + 0.3 * Math.sin(TAU * hz * 2 * t)) * Math.min(1, t / 0.004) * Math.exp(-t / (dur * 0.3)) * nivel);
  const soplo = (c, t0, dur, f0, f1, nivel) => { const fa = c.banda(0.5), fb = c.banda(0.5), i0 = Math.round(t0 * SR), n = Math.round(dur * SR); for (let i = 0; i < n && i0 + i < c.N; i++) { const u = i / n, env = Math.sin(Math.PI * u) ** 1.2 * nivel, fc = f0 * Math.pow(f1 / f0, u), x = c.azar(); c.L[i0 + i] += fa(x, fc) * env; c.R[i0 + i] += fb(x, fc * 1.05) * env; } };
  const hecho = (seg, f) => { const c = lienzo(seg); f(c); return { L: c.L, R: c.R }; };
  return {
    toque: () => hecho(0.12, c => { c.poner(0, 0.09, 0, t => Math.sin(TAU * 170 * t * (1 + 0.6 * Math.exp(-t / 0.012))) * Math.exp(-t / 0.022) * db(-7)); tic(c, 0, 0, 0.8); }),
    abrir: () => hecho(0.45, c => soplo(c, 0, 0.42, 300, 2400, db(-14))),
    cerrar: () => hecho(0.42, c => soplo(c, 0, 0.4, 2400, 280, db(-15))),
    rojo: () => hecho(0.7, c => { tono(c, 0, S.alerta[0], 0.32, db(-10), -0.2); tono(c, 0.16, S.alerta[1], 0.42, db(-10), 0.2); }),
    ambar: () => hecho(0.5, c => tono(c, 0, S.alerta[1], 0.42, db(-12), 0)),
    verde: () => hecho(0.3, c => { tic(c, 0, 0, 0.6); tono(c, 0, S.cierre[2], 0.25, db(-20), 0); }),
    guardado: () => hecho(1.2, c => S.cierre.forEach((hz, k) => tono(c, k * 0.085, hz, 0.9, db(-11 - k * 2), k * 0.3 - 0.3))),
    tic: () => hecho(0.08, c => tic(c, 0, 0, 0.7))
  };
}
