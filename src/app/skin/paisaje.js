/* Paisaje procedural de Copiloto: pinta un `Tema` (datos) en un canvas con la proyección de la carretera del hero T1620. */
(function () {
  const W = 390, H = 452, HZ = 212, F = 430, EYE = 240;
  const ETIQUETAS = [
    { txt: 'IVTM', bottom: 62, size: 92, sy: 1.45 },
    { txt: 'ACEITE', bottom: 318, size: 94, sy: 3.1 },
    { txt: 'ITV', bottom: 1130, size: 168, sy: 4.2 }
  ];

  const cl = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
  const ss = (a, b, x) => { const t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const hex = c => [parseInt(c.slice(1, 3), 16) / 255, parseInt(c.slice(3, 5), 16) / 255, parseInt(c.slice(5, 7), 16) / 255];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const css = (c, a = 1) => `rgba(${Math.round(cl(c[0]) * 255)},${Math.round(cl(c[1]) * 255)},${Math.round(cl(c[2]) * 255)},${a})`;

  function h2(ix, iy, s) {
    let n = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(s | 0, 1274126177);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }
  function vn(x, y, s) {
    const ix = Math.floor(x), iy = Math.floor(y);
    let fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const a = h2(ix, iy, s), b = h2(ix + 1, iy, s), c = h2(ix, iy + 1, s), d = h2(ix + 1, iy + 1, s);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  function fbm(x, y, s, oct) {
    let a = 0.5, sum = 0, norm = 0;
    for (let i = 0; i < oct; i++) { sum += a * vn(x, y, s + i * 17); norm += a; a *= 0.5; x = x * 2.03 + 13.1; y = y * 2.03 + 7.7; }
    return sum / norm;
  }
  function crestas(x, y, s, oct) {
    let a = 0.5, sum = 0, norm = 0;
    for (let i = 0; i < oct; i++) { let v = 1 - Math.abs(2 * vn(x, y, s + i * 17) - 1); sum += a * v * v; norm += a; a *= 0.5; x = x * 2.1 + 5.3; y = y * 2.1 + 9.1; }
    return sum / norm;
  }
  function azar(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function degradado(stops) {
    const p = stops.map(s => [s[0], hex(s[1])]);
    return y => {
      if (y <= p[0][0]) return p[0][1];
      for (let i = 1; i < p.length; i++) if (y <= p[i][0]) return mix(p[i - 1][1], p[i][1], ss(0, 1, (y - p[i - 1][0]) / (p[i][0] - p[i - 1][0])) * 0.5 + (y - p[i - 1][0]) / (p[i][0] - p[i - 1][0]) * 0.5);
      return p[p.length - 1][1];
    };
  }
  const proy = (x, z) => { const s = F / (F + z); return { sx: 195 + x * s, sy: HZ + EYE * s, s }; };

  function texturaEtiquetas() {
    const K = 2, TW = 900 * K, TH = 2200 * K;
    const c = document.createElement('canvas'); c.width = TW; c.height = TH;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    for (const e of ETIQUETAS) {
      g.save(); g.translate(TW / 2, TH - e.bottom * K); g.scale(K, K * e.sy);
      g.font = `700 ${e.size}px "Roboto Condensed"`; g.fillText(e.txt, 0, -0.158 * e.size); g.restore();
    }
    const d = g.getImageData(0, 0, TW, TH).data;
    return (xw, z) => {
      const u = (xw + 450) * K, v = TH - (z / 1.7) * K;
      if (u < 0 || u >= TW - 1 || v < 1 || v >= TH - 1) return 0;
      const iu = u | 0, iv = v | 0, fu = u - iu, fv = v - iv, o = (iv * TW + iu) * 4 + 3;
      return ((d[o] * (1 - fu) + d[o + 4] * fu) * (1 - fv) + (d[o + TW * 4] * (1 - fu) + d[o + TW * 4 + 4] * fu) * fv) / 255;
    };
  }

  function envolvente(L, x) {
    if (L.forma === 'der') return Math.pow(ss(L.inicio, 392, x), 0.62);
    if (L.forma === 'izq') return Math.pow(ss(170, -10, x), 0.7);
    const u = (x - 195) / L.anchoValle;
    return 1 - (L.valle || 0) * Math.exp(-u * u);
  }
  function arbolado(a, x, s) {
    let m = 0;
    for (let k = 0; k < 2; k++) {
      const w = a.ancho * (k ? 0.63 : 1), u = x / w + k * 0.37, c = Math.floor(u), l = u - c;
      const alt = 0.35 + 0.65 * h2(c, k, s + 77);
      const f = a.tipo === 'pino' ? Math.pow(cl(1 - Math.abs(l - 0.5) * 2), 0.85) : Math.sqrt(cl(1 - (2 * l - 1) * (2 * l - 1)));
      m = Math.max(m, alt * f);
    }
    return m * a.alto;
  }
  function perfilSierra(L, x) {
    const e = envolvente(L, x);
    if (e < 0.004) return 0;
    let a = 1, f = L.frec, n = 0, norm = 0;
    for (let o = 0; o < 5; o++) { const v = 1 - Math.abs(2 * vn(x * f + o * 31.7, L.semilla * 3.1, L.semilla + o) - 1); n += a * Math.pow(v, 1.4); norm += a; a *= 0.5; f *= 2.13; }
    let h = L.alto * (0.22 + 0.78 * n / norm) * e;
    if (L.arbol) h += arbolado(L.arbol, x, L.semilla) * Math.min(1, e * 4);
    return h;
  }
  function edificios(L) {
    const r = azar(L.semilla * 977), out = [];
    let x = -12;
    while (x < W + 12) {
      const w = L.ancho[0] + r() * (L.ancho[1] - L.ancho[0]), xc = x + w / 2;
      const h = Math.max(4, L.alto * (0.3 + 0.7 * Math.pow(r(), 1.25)) * envolvente(L, xc));
      out.push({ x0: x, x1: x + w - (r() < 0.3 ? 1.2 : 0), h, i: out.length, corona: r() < 0.45 ? 0.2 + r() * 0.3 : 0, hc: 3 + r() * 9, antena: r() < 0.16 });
      x += w;
    }
    return out;
  }

  function pintar(canvas, tema, dpr) {
    const d = dpr || 3, w = Math.round(W * d), h = Math.round(H * d);
    canvas.width = w; canvas.height = h;
    const g = canvas.getContext('2d');
    const B = new Float32Array(w * h * 3), nubeA = new Float32Array(w * h);
    const C = tema.cielo, T = tema.terreno, R = tema.carretera, sol = C.sol;
    const bruma = hex(tema.bruma), solC = sol ? hex(sol.color) : [0, 0, 0], haloC = sol ? hex(sol.halo) : [0, 0, 0];
    const yHor = tema.mar ? tema.mar.horizonte : HZ;
    const filaCielo = degradado(C.gradiente);
    const set = (o, c) => { B[o] = c[0]; B[o + 1] = c[1]; B[o + 2] = c[2]; };

    /* cielo, sol y nubes */
    const nb = C.nubes, nbL = nb && hex(nb.luz), nbS = nb && hex(nb.sombra);
    const jMaxCielo = Math.min(h, Math.ceil((HZ + 1) * d));
    for (let j = 0; j < jMaxCielo; j++) {
      const y = (j + 0.5) / d, fila = filaCielo(Math.min(y, yHor));
      for (let i = 0; i < w; i++) {
        const x = (i + 0.5) / d;
        let c = fila, brillo = 0;
        if (sol) {
          const dx = x - sol.x, dy = (y - sol.y) * 1.55, ds = Math.sqrt(dx * dx + dy * dy);
          brillo = Math.exp(-ds / (sol.radio * 2.4));
          const g1 = sol.fuerza * (0.75 * Math.exp(-ds / sol.radio) + 0.3 * brillo);
          c = [c[0] + haloC[0] * g1, c[1] + haloC[1] * g1, c[2] + haloC[2] * g1];
          if (sol.disco) { const dd = Math.hypot(x - sol.x, y - sol.y); c = mix(c, [solC[0] * 1.25, solC[1] * 1.2, solC[2] * 1.1], ss(sol.disco + 0.7, sol.disco - 0.7, dd) + 0.5 * Math.exp(-dd / (sol.disco * 1.6))); }
        }
        if (nb && y < yHor) {
          const v = yHor - y + 9, zc = F * nb.altura / v, xc = (x - 195) * zc / F;
          const px = xc * nb.escala, pz = zc * nb.escala * nb.estira;
          const wx = fbm(px * 0.5 + 3.1, pz * 0.5, nb.semilla + 50, 3) - 0.5, wz = fbm(px * 0.5 - 7.7, pz * 0.5 + 2.2, nb.semilla + 60, 3) - 0.5;
          const den = fbm(px + wx * 1.6, pz + wz * 1.6, nb.semilla, 5);
          const lim = 1 - nb.cobertura;
          let a = ss(lim, lim + 0.2, den);
          if (a > 0.002) {
            let lx = 0, ly = -1;
            if (sol) { const m = Math.hypot(sol.x - x, sol.y - y) || 1; lx = (sol.x - x) / m; ly = (sol.y - y) / m; }
            const v2 = yHor - (y + ly * 3.5) + 9, zc2 = F * nb.altura / Math.max(2, v2), xc2 = (x + lx * 3.5 - 195) * zc2 / F;
            const den2 = fbm(xc2 * nb.escala + wx * 1.6, zc2 * nb.escala * nb.estira + wz * 1.6, nb.semilla, 4);
            const borde = cl(0.42 + (den - den2) * 5.5 + brillo * 0.75 - (den - lim) * 1.1);
            let nc = mix(nbS, nbL, borde);
            if (sol) nc = [nc[0] + haloC[0] * brillo * 0.5, nc[1] + haloC[1] * brillo * 0.42, nc[2] + haloC[2] * brillo * 0.3];
            const lej = Math.exp(-(yHor - y) / 20);
            nc = mix(nc, c, lej * 0.75);
            a *= nb.opacidad * ss(0, 14, yHor - y) * (0.55 + 0.45 * ss(0, 60, y));
            c = mix(c, nc, a); nubeA[j * w + i] = a;
          }
        }
        set((j * w + i) * 3, c);
      }
    }

    /* mar */
    if (tema.mar) {
      const M = tema.mar, lejos = hex(M.lejos), cerca = hex(M.cerca), horiz = filaCielo(yHor);
      for (let j = Math.floor(yHor * d); j < Math.ceil(HZ * d); j++) {
        const y = (j + 0.5) / d, s = cl((y - yHor) / (HZ - yHor), 0.0005, 1);
        for (let i = 0; i < w; i++) {
          const x = (i + 0.5) / d, xm = (x - 195) / (s + 0.03), zm = 1 / (s + 0.03);
          let c = mix(lejos, cerca, Math.pow(s, 0.55));
          const ola = fbm(xm * 0.02, zm * 3.2, 71, 4), riz = vn(xm * 0.16, zm * 26, 72);
          const k = 0.86 + 0.34 * ola + 0.1 * (riz - 0.5) * s;
          c = [c[0] * k, c[1] * k, c[2] * k];
          if (sol) {
            const an = 7 + s * 46, gl = Math.exp(-Math.abs(x - sol.x - (y - yHor) * 0.1) / an);
            const ch = Math.pow(vn(xm * 0.5, zm * 60, 73), 5) * 7 + Math.pow(riz, 3) * 0.6;
            const q = M.destello * gl * (0.2 + ch) * (0.35 + 0.65 * (1 - s));
            c = [c[0] + solC[0] * q, c[1] + solC[1] * q, c[2] + solC[2] * q * 0.9];
          }
          c = mix(c, horiz, Math.exp(-s * 9) * 0.85);
          const cov = cl((y - yHor) * d + 0.5), o = (j * w + i) * 3;
          B[o] += (c[0] - B[o]) * cov; B[o + 1] += (c[1] - B[o + 1]) * cov; B[o + 2] += (c[2] - B[o + 2]) * cov;
        }
      }
    }

    /* capas de terreno, de lejos a cerca */
    const luces = [];
    for (const L of T.capas) {
      const baseY = HZ - L.pie, som = hex(L.sombra), luz = L.luz ? hex(L.luz) : som;
      if (L.tipo === 'ciudad') {
        const eds = edificios(L); let k = 0;
        const calidas = [hex('#FFD08A'), hex('#FFE9BF'), hex('#BFE2FF'), hex('#FF9E6B'), hex('#FF7AB8')];
        for (const e of eds) if (e.antena && e.h > L.alto * 0.45) luces.push({ sx: (e.x0 + e.x1) / 2, sy: baseY - e.h - e.hc - 5, color: hex('#FF3344'), i: 0.9, r: 1.3, fijo: true });
        for (let i = 0; i < w; i++) {
          const x = (i + 0.5) / d;
          while (k < eds.length - 1 && x >= eds[k].x1 + (eds[k + 1].x0 - eds[k].x1)) k++;
          const e = eds[k]; if (x < e.x0 || x > e.x1) continue;
          const u = (x - e.x0) / (e.x1 - e.x0), enCorona = e.corona && Math.abs(u - 0.5) < e.corona;
          const xa = (e.x0 + e.x1) / 2;
          let top = baseY - e.h - (enCorona ? e.hc : 0);
          if (e.antena && Math.abs(x - xa) < 0.3) top -= 5;
          for (let j = Math.max(0, Math.floor(top * d)); j < Math.ceil(baseY * d); j++) {
            const y = (j + 0.5) / d, t = (y - top) / (baseY - top);
            let c = mix(som, bruma, L.bruma + 0.38 * t * t);
            const cw = 2.5, ch = 3.3, vx = (x - e.x0) / cw, vy = (y - (baseY - e.h)) / ch;
            const ix = Math.floor(vx), iy = Math.floor(vy), fx = vx - ix, fy = vy - iy;
            if (y > baseY - e.h + 1 && fx > 0.22 && fx < 0.8 && fy > 0.25 && fy < 0.78 && x - e.x0 > 0.8 && e.x1 - x > 0.8) {
              const r = h2(ix + e.i * 131, iy, L.semilla), piso = h2(e.i, iy, L.semilla + 3) < 0.08;
              if (r < L.ventanas || piso) { const wc = calidas[Math.floor(h2(ix, iy + e.i * 7, L.semilla + 9) * (h2(e.i, 0, 5) < 0.3 ? 5 : 3))]; c = mix(c, wc, (0.55 + 0.45 * h2(iy, ix, e.i)) * (1 - L.bruma * 0.7)); }
            }
            const cov = cl((y - top) * d + 0.5), o = (j * w + i) * 3;
            B[o] += (c[0] - B[o]) * cov; B[o + 1] += (c[1] - B[o + 1]) * cov; B[o + 2] += (c[2] - B[o + 2]) * cov;
            nubeA[j * w + i] = 1;
          }
        }
        continue;
      }
      const tx = 0.03 + L.frec * 1.3;
      for (let i = 0; i < w; i++) {
        const x = (i + 0.5) / d, alt = perfilSierra(L, x);
        if (alt < 0.25) continue;
        const cima = baseY - alt;
        let rim = 0;
        if (sol) rim = sol.fuerza * Math.exp(-Math.hypot(x - sol.x, (cima - sol.y) * 1.4) / (sol.radio * 1.5));
        for (let j = Math.max(0, Math.floor(cima * d)); j < Math.ceil(baseY * d); j++) {
          const y = (j + 0.5) / d, t = (y - cima) / alt;
          let lx = 0, ly = -1;
          if (sol) { const m = Math.hypot(sol.x - x, sol.y - 40 - y) || 1; lx = (sol.x - x) / m; ly = (sol.y - 40 - y) / m; }
          const r1 = crestas(x * tx, y * tx * 1.9, L.semilla + 200, 3), r2 = crestas((x - lx * 1.6) * tx, (y - ly * 1.6) * tx * 1.9, L.semilla + 200, 3);
          const lit = cl(0.42 + (r1 - r2) * 7 * L.relieve + (fbm(x * 0.09, y * 0.2, L.semilla + 300, 3) - 0.5) * 0.5 * L.relieve);
          let c = mix(som, luz, lit * (0.35 + 0.65 * Math.exp(-t * 1.6)));
          if (L.arbol && y - cima < L.arbol.alto * 1.3) c = mix(c, som, 0.6);
          const niebla = L.pie ? 0 : 0.6 * ss(0.3, 1, t);
          c = mix(c, bruma, cl(L.bruma + (1 - L.bruma) * niebla * (L.bruma > 0.05 ? 1 : 0.55)));
          if (rim > 0.01) { const q = rim * Math.exp(-(y - cima) / 2.2) * 0.9; c = [c[0] + haloC[0] * q, c[1] + haloC[1] * q, c[2] + haloC[2] * q]; }
          if (L.orilla && baseY - y < 1.1) c = mix(c, hex(L.orilla), 0.75 * vn(x * 0.7, 3, 9));
          const cov = cl((y - cima) * d + 0.5), o = (j * w + i) * 3;
          B[o] += (c[0] - B[o]) * cov; B[o + 1] += (c[1] - B[o + 1]) * cov; B[o + 2] += (c[2] - B[o + 2]) * cov;
          nubeA[j * w + i] = 1;
        }
      }
    }

    /* luces puntuales (farolas, coches, neones) */
    for (const l of T.luces || []) { const p = proy(l.x, l.z); luces.push({ sx: p.sx, sy: p.sy - l.h * p.s, sRef: HZ + (EYE + l.h) * p.s, s: p.s, color: hex(l.color), i: l.i, r: l.r * (0.45 + p.s * 4) }); }
    for (const v of T.vegetacion || []) if (v.tipo === 'farola') for (let z = v.z[0]; z < v.z[1]; z += v.paso) for (const lado of [-1, 1]) {
      const p = proy(lado * (v.x - v.alto * 0.2), z + (lado > 0 ? v.paso / 2 : 0));
      luces.push({ sx: p.sx, sy: p.sy - v.alto * p.s, sRef: HZ + (EYE + v.alto) * p.s, s: p.s, color: hex(v.luz), i: 1.9, r: 1.3 + p.s * 30 });
    }
    const destellos = (j0, j1) => {
      for (const l of luces) {
        const R2 = l.r * 9, i0 = Math.max(0, Math.floor((l.sx - R2) * d)), i1 = Math.min(w, Math.ceil((l.sx + R2) * d));
        for (let j = Math.max(j0, Math.floor((l.sy - R2) * d)); j < Math.min(j1, Math.ceil((l.sy + R2) * d)); j++) for (let i = i0; i < i1; i++) {
          const dd = Math.hypot((i + 0.5) / d - l.sx, (j + 0.5) / d - l.sy);
          const q = l.i * (Math.exp(-dd / (l.r * 0.5)) * 1.4 + 0.5 * Math.exp(-dd / (l.r * 2.2)));
          const o = (j * w + i) * 3; B[o] += l.color[0] * q; B[o + 1] += l.color[1] * q; B[o + 2] += l.color[2] * q;
        }
      }
    };
    const jHz = Math.round(HZ * d);
    destellos(0, jHz);

    /* suelo y carretera en perspectiva */
    const etq = texturaEtiquetas();
    const S = T.suelo, sc = S.colores.map(hex), asf = hex(R.asfalto), lin = hex(R.linea), pin = hex(R.pintura), pinA = hex(R.pinturaAcento);
    const cieloHor = [B[((jHz - 2) * w + (w >> 1)) * 3], B[((jHz - 2) * w + (w >> 1)) * 3 + 1], B[((jHz - 2) * w + (w >> 1)) * 3 + 2]];
    const SX = [0.25, 0.75], SY = [1 / 6, 0.5, 5 / 6];
    for (let j = jHz; j < h; j++) {
      const y = (j + 0.5) / d, syC = (y - HZ) / EYE, zC = F / syC - F;
      const niebla = 1 - Math.exp(-zC * S.densidad), osc = 1 - (1 - S.oscuro) * ss(HZ + 34, H - 10, y);
      for (let i = 0; i < w; i++) {
        const x = (i + 0.5) / d;
        let r = 0, gg = 0, b = 0, via = 0, pr = 0, pg = 0, pb = 0, pa = 0;
        for (const oy of SY) {
          const yy = (j + oy) / d, sy = Math.max(1e-4, (yy - HZ) / EYE), z = F / sy - F;
          for (const ox of SX) {
            const xw = ((i + ox) / d - 195) / sy, ax = Math.abs(xw);
            let c;
            if (ax < 450) {
              via += 1;
              const man = fbm(xw * 0.011, z * 0.004, 5, 3), gr = vn(xw * 1.7, z * 1.1, 6);
              const k = 0.8 + 0.42 * man + (gr - 0.5) * 0.22 - 0.1 * Math.exp(-Math.pow((ax - 300) / 70, 2)) - 0.1 * Math.exp(-Math.pow((ax - 0) / 60, 2)) * 0;
              c = [asf[0] * k, asf[1] * k, asf[2] * k];
              let a = 0, pc = lin;
              if (ax > 436) a = 1;
              else if (Math.abs(ax - 150) < 6 && ((z / 1.7) % 253) < 88) a = 1;
              else { const e = etq(xw, z); if (e > 0.01) { a = e; pc = z < 420 ? pinA : pin; } }
              if (a > 0) { const q = a * cl(0.8 + 0.2 * ss(0.3, 0.52, fbm(xw * 0.06, z * 0.022, 8, 3)) - 0.16 * ss(0.62, 0.8, vn(xw * 0.9, z * 0.5, 9))); pr += pc[0] * q; pg += pc[1] * q; pb += pc[2] * q; pa += q; }
            } else {
              const dv = ax - 450;
              const p = fbm(xw * 0.0011 + 9, z * 0.0009, 31, 4), hebra = vn(xw * 0.3, z * 0.035, 32), mota = vn(xw * 0.06, z * 0.03, 33);
              c = p < 0.5 ? mix(sc[0], sc[1], ss(0.28, 0.5, p)) : mix(sc[1], sc[2], ss(0.5, 0.72, p));
              const k = 0.72 + 0.4 * hebra + 0.25 * (mota - 0.5);
              c = [c[0] * k, c[1] * k, c[2] * k];
              if (dv < 46) { const gv = 0.75 + 0.5 * vn(xw * 0.8, z * 0.5, 34); c = mix([asf[0] * 1.5 * gv, asf[1] * 1.45 * gv, asf[2] * 1.35 * gv], c, ss(26, 46, dv + 14 * (hebra - 0.5))); }
            }
            r += c[0]; gg += c[1]; b += c[2];
          }
        }
        r /= 6; gg /= 6; b /= 6; via /= 6; pa /= 6;
        const op = 0.52 + 0.48 * osc;
        let c = [r * osc * (1 - pa) + pr / 6 * op, gg * osc * (1 - pa) + pg / 6 * op, b * osc * (1 - pa) + pb / 6 * op];
        const xwC = (x - 195) / syC;
        const moj = R.mojado * (via > 0.5 ? 1 : (R.mojado > 0.3 ? 0.55 : 0));
        const charco = ss(0.36, 0.62, fbm(xwC * 0.0035, zC * 0.0016, 41, 3));
        const refl = cl(moj * (0.4 + 0.6 * charco) + via * 0.18 * Math.pow(1 - cl(syC), 6));
        if (refl > 0.01) {
          const ond = (vn(xwC * 0.025, zC * 0.009, 42) - 0.5) * 9 * syC + (vn(xwC * 0.2, zC * 0.05, 43) - 0.5) * 2.5 * syC;
          let rr = 0, rg = 0, rb = 0;
          for (let q = 0; q < 5; q++) {
            const ry = HZ - (y - HZ) * (0.7 + q * 0.16) - 0.5, ri = cl(Math.round((x + ond) * d), 0, w - 1), rj = cl(Math.round(ry * d), 0, jHz - 1), o = (rj * w + ri) * 3;
            rr += B[o]; rg += B[o + 1]; rb += B[o + 2];
          }
          const kk = refl * 0.15 * (0.75 + 0.25 * R.mojado);
          c = [c[0] * (1 - refl * 0.55) + rr * kk, c[1] * (1 - refl * 0.55) + rg * kk, c[2] * (1 - refl * 0.55) + rb * kk];
        }
        if (moj > 0.3) for (const l of luces) {
          if (l.fijo) continue;
          const an = l.r * 0.9 + 1.2 + (y - HZ) * 0.03, lar = 16 + 150 * l.s, dy = y - l.sRef;
          const q = l.i * moj * 0.85 * Math.exp(-Math.abs(x + (vn(xwC * 0.03, zC * 0.012, 44) - 0.5) * 6 * syC - l.sx) / an) * Math.exp(-(dy * dy) / (lar * lar)) * (0.55 + 0.45 * charco);
          c = [c[0] + l.color[0] * q, c[1] + l.color[1] * q, c[2] + l.color[2] * q];
        }
        c = mix(c, bruma, niebla * 0.94);
        const res = S.resplandor * Math.exp(-(y - HZ) / 17) * (sol ? Math.exp(-Math.abs(x - sol.x) / 150) : 1) * 0.55;
        c = [c[0] + cieloHor[0] * res, c[1] + cieloHor[1] * res, c[2] + cieloHor[2] * res];
        if (sol && R.brillo) {
          const q = sol.fuerza * R.brillo * via * Math.exp(-Math.abs(x - sol.x) / (7 + 95 * syC)) * Math.pow(1 - cl(syC), 2.2) * (0.5 + 0.5 * vn(xwC * 0.05, zC * 0.02, 45)) * Math.exp(-Math.abs(sol.y - HZ) / 30) * 0.7;
          c = [c[0] + solC[0] * q, c[1] + solC[1] * q * 0.8, c[2] + solC[2] * q * 0.55];
        }
        set((j * w + i) * 3, c);
      }
    }
    destellos(jHz, h);

    /* volcado con curva suave */
    const img = g.createImageData(w, h), D = img.data;
    const tono = v => v < 0.78 ? v : 0.78 + 0.22 * (1 - Math.exp(-(v - 0.78) / 0.22));
    for (let p = 0, o = 0; p < w * h; p++, o += 3) {
      const dth = (h2(p % w, (p / w) | 0, 5) - 0.5) / 255;
      D[p * 4] = cl(tono(B[o]) + dth) * 255; D[p * 4 + 1] = cl(tono(B[o + 1]) + dth) * 255; D[p * 4 + 2] = cl(tono(B[o + 2]) + dth) * 255; D[p * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    g.setTransform(d, 0, 0, d, 0, 0);

    /* estrellas */
    if (C.estrellas) {
      const r = azar(4242);
      for (let n = 0; n < C.estrellas * 260; n++) {
        const x = r() * W, y = Math.pow(r(), 1.5) * 165, t = r(), a = (0.25 + 0.75 * t * t) * (1 - y / 175) * (1 - nubeA[Math.min(h - 1, Math.round(y * d)) * w + Math.min(w - 1, Math.round(x * d))]);
        if (a < 0.03) continue;
        g.fillStyle = `rgba(${r() < 0.4 ? '207,214,255' : '255,250,240'},${a})`;
        g.beginPath(); g.arc(x, y, 0.28 + t * t * 0.55, 0, 7); g.fill();
      }
    }

    /* vegetación y objetos, ordenados por distancia */
    const den = S.densidad * 1.15, sprites = [];
    const tinte = (col, z, extra = 0) => mix(hex(col), bruma, cl(1 - Math.exp(-z * den) + extra));
    const solX = sol ? sol.x : 195;
    for (const v of T.vegetacion || []) {
      const r = azar((v.semilla || 1) * 7919);
      if (v.n) for (let n = 0; n < v.n; n++) {
        const z = v.z[0] + Math.pow(r(), 1.6) * (v.z[1] - v.z[0]), lado = r() < 0.5 ? -1 : 1;
        const x = lado * (v.x[0] + Math.pow(r(), 1.3) * (v.x[1] - v.x[0])), alto = v.alto[0] + r() * (v.alto[1] - v.alto[0]);
        const p = proy(x, z);
        if (p.sx < -40 || p.sx > W + 40) continue;
        sprites.push({ z, v, p, alto: alto * p.s, sem: Math.floor(r() * 1e6) });
      } else for (let z = v.z[0], k = 0; z < v.z[1]; z += v.paso * (1 + k * 0.02), k++) sprites.push({ z, v, k });
    }
    for (const ve of T.velos || []) sprites.push({ z: ve.z, velo: ve });
    sprites.sort((a, b) => b.z - a.z);

    let velo = null;
    if (T.velos) {
      velo = document.createElement('canvas'); velo.width = 195; velo.height = 130;
      const vg = velo.getContext('2d'), im = vg.createImageData(195, 130);
      for (let j = 0; j < 130; j++) for (let i = 0; i < 195; i++) {
        const y = j * 2 + (HZ - 190), per = ss(HZ - 185, HZ - 30, y) * (1 - ss(HZ + 16, HZ + 68, y));
        const a = per * (0.35 + 0.95 * fbm(i * 0.035, j * 0.09, 88, 4)), o = (j * 195 + i) * 4;
        im.data[o] = bruma[0] * 255; im.data[o + 1] = bruma[1] * 255; im.data[o + 2] = bruma[2] * 255; im.data[o + 3] = cl(a) * 255;
      }
      vg.putImageData(im, 0, 0);
    }
    const manchas = (cx, cy, rx, ry, n, r0, r1, r, col) => {
      g.fillStyle = col; g.beginPath();
      for (let k = 0; k < n; k++) { const a = r() * 6.283, q = Math.sqrt(r()), rad = r0 + r() * (r1 - r0); g.moveTo(cx + Math.cos(a) * q * rx + rad, cy + Math.sin(a) * q * ry); g.arc(cx + Math.cos(a) * q * rx, cy + Math.sin(a) * q * ry, rad, 0, 6.3); }
      g.fill();
    };
    for (const sp of sprites) {
      if (sp.velo) { g.globalAlpha = sp.velo.alfa; g.drawImage(velo, (sp.z % 37) - 40, HZ - 190, W + 80, 260); g.globalAlpha = 1; continue; }
      const v = sp.v, col = css(tinte(v.color, sp.z)), luz = css(tinte(v.luz, sp.z), 0.6);
      if (v.tipo === 'valla' || v.tipo === 'guardarrail' || v.tipo === 'farola') {
        const lados = v.tipo === 'guardarrail' ? [Math.sign(v.x)] : [-1, 1], ax = Math.abs(v.x);
        for (const lado of lados) {
          const zz = sp.z + (v.tipo === 'farola' && lado > 0 ? v.paso / 2 : 0), p = proy(lado * ax, zz), hh = v.alto * p.s, an = Math.max(0.5, 15 * p.s);
          const q = proy(lado * ax, zz + v.paso * (1 + sp.k * 0.02)), hq = v.alto * q.s;
          if (v.tipo === 'farola') {
            g.strokeStyle = col; g.lineWidth = Math.max(0.5, 26 * p.s); g.lineCap = 'round'; g.beginPath();
            g.moveTo(p.sx, p.sy); g.lineTo(p.sx, p.sy - hh + 6 * p.s); g.quadraticCurveTo(p.sx, p.sy - hh, p.sx - lado * hh * 0.2, p.sy - hh); g.stroke();
            g.fillStyle = css(hex(v.luz)); g.beginPath(); g.ellipse(p.sx - lado * hh * 0.2, p.sy - hh + 1.2 * p.s, Math.max(0.7, 40 * p.s), Math.max(0.45, 13 * p.s), 0, 0, 6.3); g.fill();
            continue;
          }
          if (v.tipo === 'guardarrail') {
            g.fillStyle = css(tinte(v.luz, sp.z, 0), 0.92); g.beginPath();
            g.moveTo(p.sx, p.sy - hh); g.lineTo(q.sx, q.sy - hq); g.lineTo(q.sx, q.sy - hq * 0.58); g.lineTo(p.sx, p.sy - hh * 0.58); g.fill();
            g.fillStyle = css(tinte(v.color, sp.z), 0.55); g.beginPath();
            g.moveTo(p.sx, p.sy - hh * 0.74); g.lineTo(q.sx, q.sy - hq * 0.74); g.lineTo(q.sx, q.sy - hq * 0.58); g.lineTo(p.sx, p.sy - hh * 0.58); g.fill();
            g.fillStyle = col; g.fillRect(p.sx - an * 0.35, p.sy - hh * 0.9, an * 0.7, hh * 0.9);
          } else {
            g.strokeStyle = css(tinte(v.color, sp.z), 0.7); g.lineWidth = Math.max(0.35, 4 * p.s);
            for (const f of [0.86, 0.5]) { g.beginPath(); g.moveTo(p.sx, p.sy - hh * f); g.quadraticCurveTo((p.sx + q.sx) / 2, (p.sy - hh * f + q.sy - hq * f) / 2 + 9 * p.s, q.sx, q.sy - hq * f); g.stroke(); }
            g.fillStyle = col; g.fillRect(p.sx - an / 2, p.sy - hh, an, hh);
            g.fillStyle = luz; g.fillRect(lado < 0 ? p.sx + an * 0.15 : p.sx - an / 2, p.sy - hh, an * 0.35, hh);
          }
        }
        continue;
      }
      const r = azar(sp.sem), x = sp.p.sx, y = sp.p.sy, hh = sp.alto, dir = Math.sign(solX - x) || 1;
      if (v.tipo === 'encina') {
        g.fillStyle = col; g.fillRect(x - hh * 0.035, y - hh * 0.4, hh * 0.07, hh * 0.4);
        manchas(x, y - hh * 0.62, hh * 0.44, hh * 0.27, 34, hh * 0.06, hh * 0.15, r, col);
        manchas(x + dir * hh * 0.12, y - hh * 0.72, hh * 0.34, hh * 0.16, 30, hh * 0.022, hh * 0.055, r, css(tinte(v.luz, sp.z), 0.42));
        manchas(x - dir * hh * 0.05, y - hh * 0.54, hh * 0.4, hh * 0.2, 16, hh * 0.04, hh * 0.09, r, css(tinte(v.color, sp.z), 0.55));
      } else if (v.tipo === 'pinonero') {
        const inc = (r() - 0.5) * hh * 0.3, tx = x + inc, ty = y - hh * 0.78;
        g.strokeStyle = col; g.lineWidth = Math.max(0.5, hh * 0.04); g.lineCap = 'round';
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + inc * 0.1, y - hh * 0.5, tx, ty); g.stroke();
        g.lineWidth = Math.max(0.4, hh * 0.022); g.beginPath(); g.moveTo(x + inc * 0.5, y - hh * 0.6); g.lineTo(tx - hh * 0.2, ty - hh * 0.04); g.moveTo(x + inc * 0.6, y - hh * 0.64); g.lineTo(tx + hh * 0.22, ty - hh * 0.05); g.stroke();
        manchas(tx, ty - hh * 0.08, hh * 0.36, hh * 0.075, 36, hh * 0.045, hh * 0.1, r, col);
        manchas(tx + dir * hh * 0.05, ty - hh * 0.14, hh * 0.32, hh * 0.045, 34, hh * 0.016, hh * 0.042, r, css(tinte(v.luz, sp.z), 0.45));
        manchas(tx, ty - hh * 0.02, hh * 0.34, hh * 0.035, 14, hh * 0.03, hh * 0.06, r, css(tinte(v.color, sp.z), 0.7));
      } else if (v.tipo === 'pino') {
        const n = 11;
        g.fillStyle = col; g.fillRect(x - hh * 0.014, y - hh * 0.3, hh * 0.028, hh * 0.3);
        g.beginPath();
        for (let k = 0; k < n; k++) {
          const f = (k + 1) / n, ty = y - hh + hh * 0.86 * f, hwL = hh * 0.2 * Math.pow(f, 0.85) * (0.7 + 0.5 * r()), hwR = hh * 0.2 * Math.pow(f, 0.85) * (0.7 + 0.5 * r());
          const ap = ty - hh * 0.2;
          g.moveTo(x, ap); g.lineTo(x + hwR * 0.5, ty - hh * 0.03); g.lineTo(x + hwR, ty + hh * 0.025 * r()); g.lineTo(x + hwR * 0.55, ty); g.lineTo(x + hwR * 0.2, ty + hh * 0.012);
          g.lineTo(x - hwL * 0.2, ty + hh * 0.012); g.lineTo(x - hwL * 0.55, ty); g.lineTo(x - hwL, ty + hh * 0.025 * r()); g.lineTo(x - hwL * 0.5, ty - hh * 0.03); g.closePath();
        }
        g.fill();
        if (hh > 30) { g.fillStyle = css(tinte(v.luz, sp.z), 0.3); g.beginPath(); for (let k = 1; k < n; k++) { const f = (k + 1) / n, ty = y - hh + hh * 0.86 * f, hw = hh * 0.17 * Math.pow(f, 0.85); g.moveTo(x, ty - hh * 0.1); g.lineTo(x + hw * 0.7, ty - hh * 0.01); g.lineTo(x, ty - hh * 0.03); } g.fill(); }
      } else if (v.tipo === 'arbusto') {
        manchas(x, y - hh * 0.36, hh * 0.75, hh * 0.28, 22, hh * 0.1, hh * 0.24, r, col);
        manchas(x + dir * hh * 0.18, y - hh * 0.5, hh * 0.55, hh * 0.16, 22, hh * 0.035, hh * 0.085, r, css(tinte(v.luz, sp.z), 0.4));
      } else if (v.tipo === 'mata') {
        g.lineCap = 'round';
        for (let k = 0; k < 7; k++) {
          const a = (r() - 0.5) * 1.5, l = hh * (0.5 + 0.5 * r());
          g.strokeStyle = k % 3 ? col : luz; g.lineWidth = Math.max(0.35, hh * 0.05);
          g.beginPath(); g.moveTo(x + (r() - 0.5) * hh * 0.3, y); g.quadraticCurveTo(x + Math.sin(a) * l * 0.4, y - l * 0.7, x + Math.sin(a) * l, y - Math.cos(a) * l); g.stroke();
        }
      }
    }

    /* lluvia */
    if (tema.lluvia) {
      const r = azar(99); g.lineCap = 'round';
      for (let n = 0; n < 520; n++) {
        const prof = r(), x = r() * (W + 40) - 20, y = r() * H, l = 5 + prof * prof * 26;
        g.strokeStyle = `rgba(205,215,255,${0.05 + prof * 0.2})`; g.lineWidth = 0.3 + prof * 0.55;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x - l * 0.16, y + l); g.stroke();
      }
      for (let n = 0; n < 70; n++) {
        const z = 150 + Math.pow(r(), 2) * 2600, p = proy((r() - 0.5) * 1100, z);
        g.strokeStyle = `rgba(215,225,255,${0.1 + 0.16 * r()})`; g.lineWidth = 0.35;
        g.beginPath(); g.ellipse(p.sx, p.sy, 13 * p.s, 3 * p.s, 0, 0, 6.3); g.stroke();
      }
    }

    /* grano */
    const N = 256, gc = document.createElement('canvas'); gc.width = gc.height = N;
    const gx = gc.getContext('2d'), gi = gx.createImageData(N, N), r = azar(31337);
    for (let p = 0; p < N * N; p++) { const v = (r() + r() + r()) / 3 * 255; gi.data[p * 4] = gi.data[p * 4 + 1] = gi.data[p * 4 + 2] = v; gi.data[p * 4 + 3] = 255; }
    gx.putImageData(gi, 0, 0);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'overlay'; g.globalAlpha = tema.grano * 2.2; g.fillStyle = g.createPattern(gc, 'repeat'); g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  }

  window.Paisaje = { pintar, W, H, HZ };
})();
