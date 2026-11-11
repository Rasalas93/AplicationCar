/** Presentador plano: coche o moto en SVG (hecho por código) con sus zonas tocables. Misma forma que crearCoche3D. */
export const NOMBRES = { motor: 'Motor', distribucion: 'Distribución', frenos: 'Frenos', ruedas: 'Ruedas', transmision: 'Transmisión', itv: 'ITV', impuestos: 'Papeles', seguro: 'Seguro' };

const rueda = (cx, cy, r, disco) => `<g><circle cx="${cx}" cy="${cy}" r="${r}" fill="#0d0e12" stroke="#2a2c34" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="${r * 0.62}" fill="url(#llanta)" stroke="#9aa0ad" stroke-width="1.4"/>${Array.from({ length: 5 }, (_, i) => { const a = i / 5 * 6.283 + 0.3; return `<path d="M${cx} ${cy}L${(cx + Math.cos(a) * r * 0.58).toFixed(1)} ${(cy + Math.sin(a) * r * 0.58).toFixed(1)}" stroke="#7a808c" stroke-width="${(r * 0.09).toFixed(1)}" stroke-linecap="round"/>`; }).join('')}${disco ? `<circle cx="${cx}" cy="${cy}" r="${r * 0.4}" fill="none" stroke="#c9ccd3" stroke-width="2.4" opacity=".8"/>` : ''}<circle cx="${cx}" cy="${cy}" r="${r * 0.12}" fill="#d8dbe2"/></g>`;
const DEFS = `<defs><linearGradient id="chapa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--pintura)" stop-opacity="1"/><stop offset=".55" stop-color="var(--pintura)"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>
  <linearGradient id="brillo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="cristal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9fb4cc" stop-opacity=".55"/><stop offset=".5" stop-color="#1b2533" stop-opacity=".9"/><stop offset="1" stop-color="#0b0f16"/></linearGradient>
  <radialGradient id="llanta"><stop offset="0" stop-color="#3a3e48"/><stop offset="1" stop-color="#1a1c22"/></radialGradient>
  <radialGradient id="suelo"><stop offset="0" stop-color="#000" stop-opacity=".7"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>`;

/** Dibujos y dónde cae cada zona (fracción del dibujo, 0-1). */
export const SILUETAS = {
  coche: {
    caja: '0 0 400 200',
    svg: `${DEFS}<ellipse cx="200" cy="178" rx="190" ry="14" fill="url(#suelo)"/>
      <path d="M30 150 L27 112 Q30 96 46 90 L80 66 Q92 58 108 57 L212 54 Q228 54 240 64 L270 88 L340 100 Q366 105 372 120 L376 140 Q376 152 364 153 L336 153 A36 36 0 0 0 264 153 L136 153 A36 36 0 0 0 64 153 L40 153 Q30 153 30 150Z" fill="url(#chapa)" stroke="color-mix(in srgb,var(--pintura) 60%,#fff)" stroke-width="1.2"/>
      <path d="M46 92 L82 68 Q94 61 108 60 L212 57 Q226 57 236 66 L262 88 Q200 84 130 86 Q80 88 46 96Z" fill="url(#brillo)" opacity=".5"/>
      <path d="M98 74 L206 66 Q222 66 230 74 L254 92 L98 96Z" fill="url(#cristal)" stroke="#0b0d12" stroke-width="2"/>
      <path d="M164 68 L162 96" stroke="#0b0d12" stroke-width="5"/><path d="M84 78 L98 74 L98 96 L74 97Z" fill="url(#cristal)" stroke="#0b0d12" stroke-width="2"/>
      <path d="M100 104 L360 112" stroke="#000" stroke-opacity=".25" stroke-width="1.4"/><path d="M168 100 L168 148 M254 98 L258 148" stroke="#000" stroke-opacity=".3" stroke-width="1.3"/>
      <rect x="214" y="110" width="16" height="4" rx="2" fill="#000" opacity=".35"/><rect x="128" y="110" width="16" height="4" rx="2" fill="#000" opacity=".35"/>
      <path d="M350 108 Q366 110 370 120 L352 120 Q344 114 350 108Z" fill="#f3f1e6" opacity=".95"/><path d="M28 104 L40 100 L42 118 L29 120Z" fill="#d0202e"/>
      <path d="M346 140 L374 140" stroke="#000" stroke-opacity=".5" stroke-width="5" stroke-linecap="round"/>
      ${rueda(100, 152, 30, true)}${rueda(300, 152, 30, true)}`,
    zonas: { motor: [0.85, 0.5], distribucion: [0.92, 0.62], frenos: [0.82, 0.86], ruedas: [0.22, 0.86], itv: [0.62, 0.3], seguro: [0.4, 0.6], impuestos: [0.08, 0.4] }
  },
  moto: {
    caja: '0 0 400 230',
    svg: `${DEFS}<ellipse cx="200" cy="212" rx="180" ry="12" fill="url(#suelo)"/>
      ${rueda(92, 162, 46, false)}${rueda(310, 162, 46, true)}
      <path d="M92 162 L182 142" stroke="#30333c" stroke-width="11" stroke-linecap="round"/><circle cx="92" cy="162" r="15" fill="none" stroke="#b9bdc7" stroke-width="3"/>
      <path d="M92 147 L182 135 M92 177 L182 149" stroke="#8d929d" stroke-width="2.2"/><circle cx="182" cy="142" r="8" fill="#5c606b"/>
      <path d="M200 156 Q150 160 112 146 L70 122" stroke="#5f636d" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M76 116 L58 110 L54 124 L70 128Z" fill="#878c97"/>
      <path d="M165 108 L248 104 L252 150 L176 156 Q160 142 165 108Z" fill="#23252c" stroke="#3c3f49" stroke-width="2"/>
      ${[0, 1, 2, 3, 4].map(i => `<path d="M${196 + i * 9} 108 L${196 + i * 9} 132" stroke="#4d515c" stroke-width="3"/>`).join('')}
      <path d="M264 58 L176 102 L238 148" stroke="#3b3e47" stroke-width="7" fill="none" stroke-linejoin="round"/>
      <path d="M58 78 L112 84 Q118 98 112 102 L72 98 Q60 92 58 78Z" fill="url(#chapa)"/>
      <path d="M108 84 L196 74 Q200 84 194 92 L116 102Z" fill="#141519" stroke="#2c2e36" stroke-width="1.5"/>
      <path d="M186 70 Q210 52 252 56 Q270 60 262 80 L244 104 Q214 108 190 100 Q178 86 186 70Z" fill="url(#chapa)" stroke="color-mix(in srgb,var(--pintura) 55%,#fff)" stroke-width="1.2"/>
      <path d="M196 70 Q216 58 248 61 Q238 70 200 80Z" fill="url(#brillo)" opacity=".6"/>
      <path d="M266 52 L310 162" stroke="#c9ccd3" stroke-width="9" stroke-linecap="round"/><path d="M266 52 L308 160" stroke="#7d828d" stroke-width="3"/>
      <path d="M244 36 L262 46 L290 40" stroke="#25272e" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M270 56 Q296 54 302 72 Q290 84 276 80Z" fill="url(#chapa)"/><ellipse cx="294" cy="70" rx="6" ry="9" fill="#f3f1e6"/>
      <path d="M272 120 Q310 104 350 122" stroke="url(#chapa)" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M50 90 L56 84 L62 96Z" fill="#d0202e"/>`,
    zonas: { motor: [0.52, 0.55], transmision: [0.3, 0.7], frenos: [0.775, 0.86], ruedas: [0.12, 0.8], itv: [0.62, 0.1], seguro: [0.74, 0.3], impuestos: [0.16, 0.36] }
  }
};

export function crearSilueta({ contenedor, tipo, alTocarZona }) {
  const S = SILUETAS[tipo] || SILUETAS.coche, caja = S.caja.split(' ').map(Number);
  const raiz = document.createElement('div');
  raiz.className = 'silueta'; raiz.dataset.tipo = tipo;
  raiz.innerHTML = `<svg viewBox="${S.caja}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${S.svg}</svg><div class="zonas3d"></div>`;
  contenedor.appendChild(raiz);
  const svg = raiz.querySelector('svg'), capa = raiz.querySelector('.zonas3d');
  let puntos = [];

  /** Coloca las etiquetas sobre el dibujo y separa las que se pisan (como el 3D). */
  function colocar() {
    const r = svg.getBoundingClientRect(), b = raiz.getBoundingClientRect();
    if (!r.width) return;
    const k = Math.min(r.width / caja[2], r.height / caja[3]), ox = r.left - b.left + (r.width - caja[2] * k) / 2, oy = r.top - b.top + (r.height - caja[3] * k) / 2;
    for (const p of puntos) { p.x = ox + p.f[0] * caja[2] * k; p.y = oy + p.f[1] * caja[3] * k; p.izq = p.x > b.width * 0.55; p.dy = 0; p.el.classList.toggle('izq', p.izq); }
    const orden = [...puntos].sort((a, c) => a.y - c.y), ancho = p => { const w = p.el.querySelector('span').offsetWidth + 12; return p.izq ? [p.x - w, p.x] : [p.x, p.x + w]; };
    orden.forEach((p, i) => { const [a0, a1] = ancho(p); for (let j = 0; j < i; j++) { const o = orden[j], [b0, b1] = ancho(o); if (a0 < b1 && b0 < a1 && p.y + p.dy - (o.y + o.dy) < 38) p.dy = o.y + o.dy + 38 - p.y; } });
    for (const p of puntos) { p.el.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)`; p.el.style.setProperty('--dy', `${p.dy.toFixed(1)}px`); }
  }
  new ResizeObserver(colocar).observe(raiz);

  return {
    tipo, listo: Promise.resolve(),
    zonas(lista) {
      capa.innerHTML = '';
      puntos = lista.filter(z => S.zonas[z.zona]).map(z => {
        const el = document.createElement('button');
        el.className = 'zona'; el.dataset.nivel = z.nivel; el.dataset.zona = z.zona;
        el.innerHTML = `<i></i><span><b>${z.titulo}</b><small>${z.dato}</small></span>`;
        el.setAttribute('aria-label', `${z.titulo}: ${z.dato}`);
        el.addEventListener('click', e => { e.stopPropagation(); alTocarZona(z); });
        capa.appendChild(el);
        return { el, f: S.zonas[z.zona] };
      });
      requestAnimationFrame(colocar);
    },
    pintar(hex) { raiz.style.setProperty('--pintura', hex); },
    matricula() {},
    mostrar(si) { raiz.hidden = !si; if (si) requestAnimationFrame(colocar); },
    activar() {}, paso() {}, iniciar() {}
  };
}
