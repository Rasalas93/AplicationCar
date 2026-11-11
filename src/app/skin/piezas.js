/* Piezas mecánicas por código (engranaje, tren, rueda, neumático-reloj), sin colores propios: todo sale de `material` del tema. */
(function () {
  const TAU = Math.PI * 2, f = n => (+n).toFixed(2);
  const pol = (r, a) => `${f(r * Math.cos(a))} ${f(r * Math.sin(a))}`;
  const circ = (cx, cy, r) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
  const arco = (r, a0, a1, horario = 1) => `M${pol(r, a0)}A${f(r)} ${f(r)} 0 ${Math.abs(a1 - a0) > Math.PI ? 1 : 0} ${horario} ${pol(r, a1)}`;
  const G = Math.PI / 180;

  /* Relieve iluminado: la opacidad del dibujo hace de altura y el filtro la vuelve metal con luz fija. */
  function filtro(id, o) {
    const luz = `<feDistantLight azimuth="235" elevation="${o.elev}"/>`;
    const veta = o.veta ? `<feTurbulence type="fractalNoise" baseFrequency="${o.veta}" numOctaves="2" seed="7"/><feColorMatrix type="matrix" values="${o.grano} 0 0 0 ${1 - o.grano / 2}  ${o.grano} 0 0 0 ${1 - o.grano / 2}  ${o.grano} 0 0 0 ${1 - o.grano / 2}  0 0 0 0 1" result="veta"/><feBlend in="m1" in2="veta" mode="multiply" result="m2"/>` : '<feMerge result="m2"><feMergeNode in="m1"/></feMerge>';
    return `<filter id="${id}" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
      <feComponentTransfer in="SourceGraphic" result="base"><feFuncA type="linear" slope="3"/></feComponentTransfer>
      <feGaussianBlur in="SourceAlpha" stdDeviation="${o.suave}" result="alt"/>
      <feDiffuseLighting in="alt" surfaceScale="${o.alto}" diffuseConstant="${o.difusa}" lighting-color="#fff" result="dif">${luz}</feDiffuseLighting>
      <feSpecularLighting in="alt" surfaceScale="${o.alto}" specularConstant="${o.espec}" specularExponent="${o.exp}" lighting-color="#fff" result="esp">${luz}</feSpecularLighting>
      <feBlend in="base" in2="dif" mode="multiply" result="m1"/>${veta}
      <feComposite in="esp" in2="m2" operator="arithmetic" k2="1" k3="1" result="m3"/>
      <feComposite in="m3" in2="base" operator="in"/>
    </filter>`;
  }

  /* <defs> comunes: degradados del tema y filtros de material. */
  function defs(m) {
    const paradas = l => l.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('');
    return `<svg width="0" height="0" style="position:absolute"><defs>
      <linearGradient id="matCromo" x1="0" y1="0" x2="0" y2="1">${paradas(m.cromo)}</linearGradient>
      <linearGradient id="matEje" x1="0" y1="0" x2="1" y2="0">${paradas(m.cromo)}</linearGradient>
      <linearGradient id="matCristal" x1="0" y1="0" x2="1" y2="1">${paradas(m.cristal)}</linearGradient>
      <radialGradient id="matGoma">${paradas(m.goma)}</radialGradient>
      ${filtro('pzAcero', { suave: 0.55, alto: 2.6, difusa: 1.3, espec: 0.9, exp: 30, elev: 50, veta: '.02 .7', grano: 0.5 })}
      ${filtro('pzCromo', { suave: 2.2, alto: 7, difusa: 1.3, espec: 1.5, exp: 38, elev: 50 })}
      ${filtro('pzFino', { suave: 0.9, alto: 3, difusa: 1.3, espec: 1.2, exp: 34, elev: 50 })}
      ${filtro('pzGoma', { suave: 0.6, alto: 2.4, difusa: 1.3, espec: 0.35, exp: 12, elev: 50 })}
    </defs></svg>`;
  }

  function perfil(z, m) {
    const rp = m * z / 2, ra = rp + m, rf = rp - 1.25 * m, p = TAU / z;
    let d = '';
    for (let i = 0; i < z; i++) {
      const t = i * p;
      d += `${i ? 'L' : 'M'}${pol(rf, t - 0.29 * p)}L${pol(ra, t - 0.13 * p)}L${pol(ra, t + 0.13 * p)}L${pol(rf, t + 0.29 * p)}`;
    }
    return d + 'Z';
  }

  /* Engranaje recto centrado en el origen: corona dentada, alma con aligeramientos, cubo, tornillos y chavetero. */
  function engranaje({ z, m, clase = '' }) {
    const rp = m * z / 2, rf = rp - 1.25 * m, rb = rf - m * 1.15, rh = Math.max(m * 1.9, rp * 0.3), re = rh * 0.46;
    const n = z >= 22 ? 6 : z >= 14 ? 5 : 0, rc = (rb + rh) / 2, ra = Math.min((rb - rh) * 0.4, rc * Math.sin(Math.PI / (n || 1)) * 0.72);
    let huecos = '', tornillos = '';
    for (let k = 0; k < n; k++) huecos += circ(rc * Math.cos(k * TAU / n + 0.4), rc * Math.sin(k * TAU / n + 0.4), ra);
    if (n) for (let k = 0; k < 6; k++) tornillos += circ(rh * 0.72 * Math.cos(k * TAU / 6), rh * 0.72 * Math.sin(k * TAU / 6), Math.max(0.7, m * 0.3));
    return `<g class="pz-eng ${clase}" filter="url(#pzAcero)"><g class="pz-gira">
      <path d="${perfil(z, m)}${huecos}" fill-rule="evenodd" fill="var(--acero)" fill-opacity=".5"/>
      ${n ? `<path d="${circ(0, 0, rf - 0.2)}${circ(0, 0, rb)}" fill-rule="evenodd" fill="var(--acero)" fill-opacity=".5"/>` : ''}
      <circle r="${f(rh)}" fill="var(--acero)" fill-opacity=".62"/>
      <path d="${circ(0, 0, re)}M${f(-re * 0.3)} ${f(-re * 1.35)}h${f(re * 0.6)}v${f(re * 0.6)}h${f(-re * 0.6)}Z${tornillos}" fill="var(--aceroOsc)"/>
    </g></g>`;
  }

  /* Resuelve un tren: cada rueda cuelga de otra (`de`, `ang`) y engrana con ella; devuelve centro, razón y fase. */
  function tren({ modulo: m, ruedas }) {
    const r = [];
    ruedas.forEach((g, i) => {
      if (g.de == null) return r.push({ ...g, m, razon: 1, fase: g.fase || 0 });
      const p = r[g.de], phi = g.ang * G, dist = m * (p.z + g.z) / 2, p1 = TAU / p.z, p2 = TAU / g.z;
      r.push({ ...g, m, x: p.x + dist * Math.cos(phi), y: p.y + dist * Math.sin(phi), razon: -p.razon * p.z / g.z, fase: phi + Math.PI - p2 * (0.5 - (phi - p.fase) / p1) });
    });
    return r;
  }

  const girar = g => `style="--razon:${f(g.razon)};--fase:${f(g.fase / G)}deg"`;

  /* Rueda de coche: goma con dibujo, flanco, llanta cromada fija y huecos entre radios que giran. */
  function rueda(r, { llanta = 0.64, radios = 5 } = {}) {
    const rl = r * llanta, paso = TAU * r * 0.955 / 34;
    let huecos = '', tuercas = '';
    for (let k = 0; k < radios; k++) {
      const a = k * TAU / radios, w = TAU / radios * 0.33, r0 = rl * 0.34, r1 = rl * 0.84;
      huecos += `M${pol(r0, a - w * 0.55)}L${pol(r1, a - w)}A${f(r1)} ${f(r1)} 0 0 1 ${pol(r1, a + w)}L${pol(r0, a + w * 0.55)}Z`;
      tuercas += circ(rl * 0.2 * Math.cos(a + TAU / radios / 2), rl * 0.2 * Math.sin(a + TAU / radios / 2), rl * 0.045);
    }
    return `<g class="pz-rueda">
      <g filter="url(#pzGoma)">
        <circle r="${f(r * 0.93)}" fill="var(--gomaBase)" fill-opacity=".62"/>
        <circle r="${f(r * 0.955)}" fill="none" stroke="var(--gomaBase)" stroke-opacity=".8" stroke-width="${f(r * 0.09)}" stroke-dasharray="${f(paso * 0.66)} ${f(paso * 0.34)}" class="pz-gira"/>
        <circle r="${f(r * 0.83)}" fill="var(--gomaBase)" fill-opacity=".5"/>
      </g>
      <circle r="${f((r * 0.86 + rl) / 2)}" fill="none" stroke="url(#matGoma)" stroke-width="${f(r * 0.86 - rl)}" opacity=".55"/>
      <g filter="url(#pzFino)">
        <circle r="${f(rl)}" fill="url(#matCromo)"/>
        <g class="pz-gira"><path d="${huecos}" fill="var(--hueco)"/><path d="${tuercas}" fill="var(--hueco)"/></g>
      </g>
      <circle r="${f(rl)}" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="${f(r * 0.03)}"/>
      <circle r="${f(rl * 0.1)}" fill="url(#matCromo)"/>
    </g>`;
  }

  /* Neumático como reloj de la ventana: `dias` en 240° de flanco, marcas blancas, tramos de estado y tapa cromada con la cuenta. */
  function neumatico({ r, dias, marcas, tramos, medida, cifra, unidad }) {
    const A0 = 150 * G, BAR = 240 * G, ang = d => A0 + BAR * d / dias;
    const rD = r * 0.47, rExt = r * 0.72, rInt = r * 0.545, paso = TAU * r * 0.95 / 46;
    const largo = rr => rr * BAR;
    let ticks = '', textos = '', bandas = '';
    for (let d = 0; d <= dias; d += 7) ticks += `M${pol(rD + 1.5, ang(d))}L${pol(rD + 4, ang(d))}`;
    for (const m of marcas) {
      ticks += `M${pol(m.txt ? rExt - 1 : rD + 1.5, ang(m.dia))}L${pol(m.txt ? rExt + 9 : rD + 7, ang(m.dia))}`;
      textos += `<text class="pz-blanco"><textPath href="#pzVia1" startOffset="${f(largo(rExt) * m.dia / dias + (m.fin ? -3 : 3))}" ${m.fin ? 'text-anchor="end"' : ''}>${m.txt}</textPath></text>`;
    }
    for (const t of tramos) {
      const a0 = ang(t.de), a1 = ang(t.a);
      bandas += `<g class="e-${t.estado} pz-tramo">${t.a > t.de ? `<path d="${arco(r * 0.9, a0, a1)}" fill="none" stroke="var(--e)" stroke-width="${f(r * 0.07)}"/>` : ''}
        <path d="M${pol(rD + 1, a0)}L${pol(r * 0.935, a0)}" stroke="var(--e)" stroke-width="2" stroke-linecap="round"/>
        <text fill="var(--e)"><textPath href="#pzVia2" startOffset="${f(largo(rInt) * (t.a > t.de ? (t.de + t.a) / 2 : t.de - 2) / dias)}" text-anchor="${t.a > t.de ? 'middle' : 'end'}">${t.txt}</textPath></text></g>`;
    }
    return `<svg class="pz-neum" viewBox="${-r} ${-r} ${2 * r} ${2 * r}" width="${2 * r}" height="${2 * r}">
      <defs><path id="pzVia1" d="${arco(rExt, A0, A0 + BAR)}"/><path id="pzVia2" d="${arco(rInt, A0, A0 + BAR)}"/><path id="pzVia3" d="${arco(r * 0.8, 152 * G, 28 * G, 0)}"/></defs>
      <g class="pz-rodar">
        <g filter="url(#pzGoma)">
          <circle r="${f(r * 0.94)}" fill="var(--gomaBase)" fill-opacity=".6"/>
          <circle r="${f(r * 0.955)}" fill="none" stroke="var(--gomaBase)" stroke-opacity=".85" stroke-width="${f(r * 0.085)}" stroke-dasharray="${f(paso * 0.7)} ${f(paso * 0.3)}"/>
          <circle r="${f(r * 0.86)}" fill="var(--gomaBase)" fill-opacity=".5"/>
          <path d="${circ(0, 0, rD + 6)}${circ(0, 0, rD + 0.5)}" fill-rule="evenodd" fill="var(--gomaBase)" fill-opacity=".5"/>
        </g>
        <circle r="${f((r * 0.86 + rD) / 2)}" fill="none" stroke="url(#matGoma)" stroke-width="${f(r * 0.86 - rD)}" opacity=".6"/>
        <path d="${ticks}" class="pz-blanco" fill="none" stroke-width="1.2"/>
        ${bandas}${textos}
        <text class="pz-molde" text-anchor="middle"><textPath href="#pzVia3" startOffset="50%">${medida}</textPath></text>
        <g filter="url(#pzFino)">
          <circle r="${f(rD)}" fill="url(#matCromo)"/>
          <path d="${circ(0, 0, rD - 2.2)}${circ(0, 0, rD - 3.4)}" fill-rule="evenodd" fill="var(--hueco)" fill-opacity=".8"/>
        </g>
        <circle r="${f(rD)}" fill="none" stroke="#000" stroke-opacity=".6" stroke-width="1.2"/>
        <text class="pz-cifra" text-anchor="middle" y="${f(rD * 0.2)}">${cifra}</text>
        <text class="pz-unidad" text-anchor="middle" y="${f(rD * 0.62)}">${unidad}</text>
      </g>
    </svg>`;
  }

  /* Contorno de engranaje como polygon() de CSS, en % de la caja. */
  function recorte(z) {
    const p = TAU / z, pts = [];
    for (let i = 0; i < z; i++) for (const [r, a] of [[41, -0.3], [50, -0.15], [50, 0.15], [41, 0.3]]) pts.push(`${f(50 + r * Math.cos((i + a) * p))}% ${f(50 + r * Math.sin((i + a) * p))}%`);
    return `polygon(${pts.join(',')})`;
  }

  window.Piezas = { defs, engranaje, tren, girar, rueda, neumatico, recorte };
})();
