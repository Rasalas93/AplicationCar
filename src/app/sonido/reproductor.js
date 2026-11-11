/** Reproduce las voces del tema con Web Audio; el contexto nace en el primer toque (regla de los navegadores). */
import { SR, voces } from './sintesis.js';

export function reproductor() {
  let ctx = null, cache = new Map(), V = null, silencio = localStorage.getItem('coche:silencio') === '1';
  return {
    usarTema(t) { V = voces(t.sonidos); cache = new Map(); },
    get silencio() { return silencio; },
    set silencio(v) { silencio = v; localStorage.setItem('coche:silencio', v ? '1' : '0'); },
    tocar(nombre) {
      if (silencio || !V || !V[nombre]) return;
      try {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SR });
        if (ctx.state === 'suspended') ctx.resume();
        let b = cache.get(nombre);
        if (!b) { const { L, R } = V[nombre](); b = ctx.createBuffer(2, L.length, SR); b.copyToChannel(L, 0); b.copyToChannel(R, 1); cache.set(nombre, b); }
        const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start();
      } catch { /* sin audio: la app sigue */ }
    }
  };
}
