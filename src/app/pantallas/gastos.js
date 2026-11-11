/** Gastos (T1634): mes, semanas, medias y previsión; alta a mano en 3 toques y el «por qué» de la previsión. */
import { num, eur, corta, diaSem, partes, MES, MESL, esc } from '../formato.js';
import { abrirHoja, cerrarHoja, tocar, avisar } from '../ui.js';
import { pintarFondo } from '../skin/motor.js';

const NOMBRE = { combustible: 'Combustible', peajes: 'Peajes y aparc.', mantenimiento: 'Mantenimiento', otros: 'Otros', itv: 'ITV', impuestos: 'Impuestos', seguro: 'Seguro', multas: 'Multas' };
const FIJAS = ['itv', 'impuestos', 'seguro'];
const fijo = c => FIJAS.includes(c) ? ' fijo' : '';

export function pantallaGastos({ raiz, cliente, temaActual }) {
  let R = null, T = null, ultimoNuevo = null;
  const color = c => T.categorias[c] || T.acento;
  raiz.innerHTML = `<div class="fondoG"><canvas></canvas></div><div class="veloG"></div><header class="cabG" id="cabG"></header><main class="panelG" id="panelG"></main>`;

  function pista(prev, media, conTexto, tope, hoy) {
    const x = v => (Math.min(v, tope) / tope * 100).toFixed(2) + '%';
    const [a, m, d] = partes(hoy), diasMes = new Date(Date.UTC(a, m, 0)).getUTCDate();
    const dif = (prev.central - media) / media * 100, mes = hoy.slice(0, 7);
    const fijos = R.gastos.filter(g => g.recurrente && g.fecha.startsWith(mes));
    const causa = fijos.length ? `este mes cae ${fijos.map(g => `${g.concepto} anual (${eur(g.importe)})`).join(', ')}` : 'sin gastos anuales este mes';
    return `<div class="pista">
      <div class="carril"><i class="rango" style="left:${x(prev.min)};width:calc(${x(prev.max)} - ${x(prev.min)})"></i><i class="hecho" style="width:${x(prev.gastado)}"></i><i class="media" style="left:${x(media)}"></i><i class="centro" style="left:${x(prev.central)}"></i></div>
      <span class="et" style="left:0">día ${d} de ${diasMes}</span><span class="et m" style="left:${x(media)}">mes medio ${eur(media, 0)}</span><span class="et" style="right:0">${eur(tope, 0)}</span>
      ${conTexto ? `<p><b>${dif >= 0 ? '▲' : '▼'} ${num(Math.abs(dif), 0)} %</b> ${dif >= 0 ? 'sobre' : 'bajo'} tu mes medio · ${causa}</p>` : ''}</div>`;
  }

  function barras() {
    const W = 342, Y0 = 100, n = R.semanas.length, paso = W / n, ancho = 16;
    const maxS = Math.max(...R.semanas.map(s => s.total), R.medias.corriente.semana), ESC = Math.min(1.4, 82 / maxS);
    const orden = ['combustible', 'peajes', 'otros', 'mantenimiento', 'itv', 'impuestos', 'seguro', 'multas'];
    let s = `<defs>${FIJAS.map(c => `<pattern id="r-${c}" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="${color(c)}" opacity=".35"/><rect width="2" height="4" fill="${color(c)}"/></pattern>`).join('')}</defs>`;
    R.semanas.forEach((sa, i) => {
      const x = i * paso + (paso - ancho) / 2; let y = Y0;
      for (const c of orden) {
        const v = sa.porCategoria[c] || 0; if (v <= 0.005) continue;
        const h = v * ESC; y -= h;
        s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${ancho}" height="${Math.max(0.6, h - 0.8).toFixed(1)}" rx="1.5" fill="${FIJAS.includes(c) ? `url(#r-${c})` : color(c)}"/>`;
      }
      if (sa.enCurso) s += `<rect x="${(x - 3).toFixed(1)}" y="${(y - 3).toFixed(1)}" width="${ancho + 6}" height="${(Y0 - y + 3).toFixed(1)}" rx="4" fill="none" stroke="${T.acento}" stroke-width="1.2" opacity=".9"/>`;
      const f = FIJAS.find(c => sa.porCategoria[c]);
      if (f) s += `<text class="v" x="${(x + ancho / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle">${NOMBRE[f]}</text>`;
      const [, m, d] = partes(sa.inicio);
      if (sa.enCurso) s += `<text class="v" x="${(x + ancho / 2).toFixed(1)}" y="115" text-anchor="middle" style="fill:${T.acento}">esta</text>`;
      else if ((d <= 7 || i === 0) && i < n - 2) s += `<text x="${x.toFixed(1)}" y="115">${MES[m - 1]}</text>`;
    });
    const yM = Y0 - R.medias.corriente.semana * ESC;
    s += `<line x1="0" x2="${W}" y1="${Y0 + 0.5}" y2="${Y0 + 0.5}" stroke="${T.marco.linea}"/><line x1="0" x2="${W}" y1="${yM.toFixed(1)}" y2="${yM.toFixed(1)}" stroke="${T.texto.tinta}" stroke-width="1.2" stroke-dasharray="4 3" opacity=".85"/>`;
    return s;
  }

  function pintarPanel() {
    const V = T.voz, hoy = R.hoy, [ANIO, NMES, NDIA] = partes(hoy), prev = R.prevision, m = R.medias;
    const tope = Math.ceil(Math.max(prev.max, m.total.mes) * 1.08 / 50) * 50;
    const cats = R.porCategoria.filter(c => c.importe > 0.005), tot = cats.reduce((s, c) => s + c.importe, 0);
    const lista = [...R.gastos].reverse().slice(0, 5), ultimaSem = R.semanas[R.semanas.length - 1];
    raiz.querySelector('#cabG').innerHTML = `<div><span class="marca">${V.marca}</span><span class="hoy">${NDIA} ${MES[NMES - 1].toUpperCase()} ${ANIO}</span></div>
      <h1>${V.gastos}<small>${esc(R.vehiculo.modelo)} · ${esc(R.vehiculo.version)}</small></h1>`;
    raiz.querySelector('#panelG').innerHTML = `
      <div class="heroe">
        <div><span class="rot">${V.gastado} · ${MESL[NMES - 1]}</span> ${R.gastos.some(g => g.ejemplo) ? '<span class="ej">ejemplo</span>' : ''}<span class="gordo">${num(prev.gastado)}<em>€</em></span></div>
        <div class="prev"><span class="rot">${V.prevision} de ${MES[NMES - 1]}</span><strong>${num(prev.central, 0)}<em>€</em></strong><span>entre ${num(prev.min, 0)} y ${num(prev.max, 0)} €</span><a class="pq" id="btnPorque">${V.porque} ›</a></div>
      </div>
      ${pista(prev, m.total.mes, true, tope, hoy)}
      <div class="marco tarj">
        <div class="pcab"><span class="rot">${V.medias}</span><span>${m.semanas} semanas · ${corta(m.desde)} a ${corta(m.hasta)}</span></div>
        <div class="med"><div><strong>${num(m.total.semana)}<em>€</em></strong><span>por semana</span></div><div><strong>${num(m.total.mes)}<em>€</em></strong><span>por mes</span></div>
          <ul><li><i class="pt" style="--c:${T.acento}"></i>Uso y taller<b>${eur(m.corriente.mes)}</b></li><li><i class="pt fijo" style="--c:${color('itv')}"></i>Fijos anuales ÷ 12<b>${eur(m.fijos.mes)}</b></li>
          ${m.fijos.sinImporte.map(c => `<li class="conf"><i class="pt" style="--c:${T.estados.falta}"></i>${esc(c)}<b>a confirmar</b></li>`).join('')}</ul></div>
      </div>
      <div class="marco tarj">
        <div class="pcab"><span class="rot">${V.semanas}</span><span>esta ${eur(ultimaSem.total)} · media ┄ ${eur(m.corriente.semana)}</span></div>
        <svg class="sem" viewBox="0 0 342 120">${barras()}</svg>
        <div class="ley">${[['combustible', 'Combustible'], ['peajes', 'Peajes y aparc.'], ['mantenimiento', 'Mantenim.'], ['otros', 'Otros'], ['itv', 'Anual']].map(([c, t]) => `<span><i class="pt${fijo(c)}" style="--c:${color(c)}"></i>${t}</span>`).join('')}</div>
      </div>
      <div class="marco tarj">
        <div class="pcab"><span class="rot">${V.reparto} · ${MESL[NMES - 1]}</span><span>${eur(tot)}</span></div>
        <div class="rep">${cats.map(c => `<i class="${fijo(c.categoria)}" style="--c:${color(c.categoria)};flex:${c.importe.toFixed(2)}"></i>`).join('')}</div>
        <div class="cats">${cats.map(c => `<div><i class="pt${fijo(c.categoria)}" style="--c:${color(c.categoria)}"></i>${NOMBRE[c.categoria]}<b>${eur(c.importe)}</b><em>${num(c.importe / tot * 100, 0)} %</em></div>`).join('')}</div>
      </div>
      <div class="marco tarj">
        <div class="pcab"><span class="rot">${V.ultimos}</span><span>${R.gastos.length} apuntes · a mano</span></div>
        <div class="ult">${lista.map(g => `<div class="${g === lista[0] && ultimoNuevo && g.fecha === ultimoNuevo.fecha && g.importe === ultimoNuevo.importe ? 'nuevo' : ''}"><i class="pt${fijo(g.categoria)}" style="--c:${color(g.categoria)}"></i>${esc(g.concepto)}<span>${g.fecha === hoy ? 'hoy' : diaSem(g.fecha) + ' ' + corta(g.fecha)}${g.litros ? ' · ' + num(g.litros) + ' L' : ''}${g.recurrente ? ' · cada año' : ''}</span><b>${eur(g.importe)}</b></div>`).join('')}</div>
      </div>`;
    raiz.querySelector('#btnPorque').onclick = () => { tocar('toque'); abrirPorque(); };
  }

  /** Alta a mano: teclado, chips (última categoría primero), «Repetir último repostaje», Guardar. */
  function abrirAlta(categoria) {
    const st = { txt: '', cat: categoria || R.orden[0], repetido: false };
    const U = R.ultimoRepostaje, N = R.repostaje, hoy = R.hoy;
    const h = abrirHoja('<div class="hAlta"></div>', { clase: 'hAltaW' });
    const valor = () => st.txt ? parseFloat(st.txt.replace(',', '.')) || 0 : 0;
    function pinta() {
      const imp = valor(), litros = st.cat === 'combustible' && imp ? imp / R.precioLitro.valor : 0;
      h.firstChild.innerHTML = `
        <div class="hcab"><h2>Nuevo gasto</h2><span class="chip">Hoy · ${diaSem(hoy)} ${corta(hoy)}</span></div>
        <div class="imp"><strong class="${imp ? '' : 'vacio'}">${st.txt || '0,00'}<em>€</em></strong></div>
        <div class="campos"><div><span>Litros</span><b>${litros ? num(litros) : '—'} <small>${litros ? 'calculado' : ''}</small></b></div><div><span>€ / litro</span><b>${num(R.precioLitro.valor, 3)} <small>hoy</small></b></div><div><span>Km</span><b><small>opcional</small></b></div></div>
        ${U ? `<button class="repetir${st.repetido ? ' on' : ''}" id="rep"><svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 13.700-5.700L20 8.500M20 4v4.500h-4.500M20 12a8 8 0 0 1-13.700 5.700L4 15.500M4 20v-4.500h4.500"/></svg>Repetir último repostaje<span>${eur(U.importe)} · ${corta(U.fecha)}</span></button>` : ''}
        <div class="chips">${R.orden.map(c => `<button class="chip${c === st.cat ? ' on' : ''}" data-cat="${c}" style="--c:${color(c)}"><i class="pt" style="--c:${color(c)}"></i>${NOMBRE[c]}</button>`).join('')}</div>
        <div class="opc"><span>Se repite · <b>no</b></span><span>Fuente · <b>a mano</b></span><i>última categoría, primero</i></div>
        <div class="teclas">${['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫'].map(x => `<b data-t="${x}">${x}</b>`).join('')}</div>
        <button class="guardar${imp ? ' listo' : ''}" id="guardar">Guardar${imp ? ' ' + eur(imp) : ''}</button>
        <p class="tres">Un repostaje normal: <b>3 toques</b> · Anotar → Repetir → Guardar</p>`;
      h.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
        tocar('tic'); const t = b.dataset.t; st.repetido = false;
        if (t === '⌫') st.txt = st.txt.slice(0, -1);
        else if (t === ',') { if (!st.txt.includes(',')) st.txt = (st.txt || '0') + ','; }
        else if (!/,\d\d$/.test(st.txt) && st.txt.replace(',', '').length < 7) st.txt += t;
        pinta();
      });
      h.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { tocar('tic'); st.cat = b.dataset.cat; st.repetido = false; pinta(); });
      const rep = h.querySelector('#rep');
      if (rep) rep.onclick = () => { tocar('toque'); st.repetido = true; st.cat = 'combustible'; st.txt = num(N.importe); pinta(); };
      h.querySelector('#guardar').onclick = async () => {
        const imp = valor(); if (!imp) return;
        const cuerpo = st.repetido ? { ...N } : { fecha: hoy, importe: imp, categoria: st.cat, concepto: st.cat === 'combustible' ? (U ? U.concepto : 'Combustible') : NOMBRE[st.cat], ...(st.cat === 'combustible' ? { litros: Math.round(imp / R.precioLitro.valor * 100) / 100 } : {}) };
        delete cuerpo.ejemplo;
        const r = await cliente.anotarGasto(cuerpo);
        if (r.estado !== 201) { avisar('No se guardó: revisa ' + r.cuerpo.error.campo); return; }
        ultimoNuevo = r.cuerpo.gasto;
        tocar('guardado'); cerrarHoja();
        avisar(`Guardado · ${eur(imp)} · ${NOMBRE[cuerpo.categoria]}`);
      };
    }
    pinta();
  }

  function abrirPorque() {
    const V = T.voz, p = R.prevision, v = p.variable, hoy = R.hoy, [, NMES, NDIA] = partes(hoy), diasMes = new Date(Date.UTC(+hoy.slice(0, 4), NMES, 0)).getUTCDate();
    const m = R.medias, tope = Math.ceil(Math.max(p.max, m.total.mes) * 1.08 / 50) * 50;
    const ev = e => `<b>${esc(e.concepto)}</b> ${num(e.min, 0)}–${num(e.max, 0)} € (${corta(e.fecha)}${e.por === 'km' ? ', por km' : ''})${e.ejemplo ? ' <span class="ej">ejemplo</span>' : ''}`;
    const nombreMes = mes => { const [a, mm] = mes.split('-').map(Number); return `${MESL[mm - 1][0].toUpperCase() + MESL[mm - 1].slice(1)} ${a}`; };
    const futuro = f => `<div><span class="rot">${nombreMes(f.mes)}</span><strong>${eur(f.central, 0)}<small>${num(f.min, 0)}–${num(f.max, 0)}</small></strong><p>${f.eventos.length ? f.eventos.map(ev).join('<br>') : `Solo uso: ${f.variable.diasRestantes} días × ${eur(f.variable.ritmoDia)}<br>Sin eventos programados`}</p></div>`;
    const fijosMes = R.gastos.filter(g => g.recurrente && g.fecha.startsWith(hoy.slice(0, 7)));
    abrirHoja(`<div class="hPorque">
      <div class="hcab"><h2>${V.prevision} de ${MESL[NMES - 1]}</h2>${R.gastos.some(g => g.ejemplo) ? '<span class="ej">valores de ejemplo</span>' : ''}</div>
      <div class="total"><strong>${num(p.central, 0)}<em>€</em></strong><span>entre <b>${eur(p.min, 0)}</b> y <b>${eur(p.max, 0)}</b><br>rango: semanas flojas y fuertes</span></div>
      ${pista(p, m.total.mes, false, tope, hoy)}
      <div class="paso"><i>1</i><h3>Ya gastado<small>1–${NDIA} ${MES[NMES - 1]}</small></h3><b>${eur(p.gastado)}</b><p>${R.porCategoria.map(c => `${NOMBRE[c.categoria]} <b>${num(c.importe)}</b>`).join(' · ')}</p></div>
      <div class="paso"><i>2</i><h3>Uso que queda<small>${v.diasRestantes} días × ${eur(v.ritmoDia)}/día</small></h3><b>${eur(v.central)}</b><p>Ritmo de tus últimas ${v.semanas} semanas en combustible, peajes, aparcamiento y otros. Rango <b>${num(v.min, 0)}–${num(v.max, 0)} €</b> (semanas del 25 % más flojo y más fuerte).</p></div>
      <div class="paso"><i>3</i><h3>Programado<small>hasta el ${diasMes} ${MES[NMES - 1]}</small></h3><b>${eur(p.eventos.reduce((s, e) => s + (e.min + e.max) / 2, 0))}</b><p>${p.eventos.length ? p.eventos.map(ev).join(' · ') : 'Nada vence en lo que queda de mes.'}${fijosMes.length ? ` ${fijosMes.map(g => g.concepto).join(', ')} ya pagado el ${corta(fijosMes[0].fecha)} (está en «gastado»).` : ''}</p></div>
      <div class="suma"><span>= ${V.prevision} de ${MESL[NMES - 1]}</span><b>${eur(p.central)}</b></div>
      ${p.sinFecha.length ? `<div class="fuera"><svg viewBox="0 0 24 24"><path d="M12 3 2 20h20zM12 10v5M12 17.500v.5"/></svg><span><b>Fuera de la cuenta · ${p.sinFecha.map(s => esc(s.concepto)).join(', ')}:</b> fecha de renovación y prima <b>a confirmar</b>. Al anotarlas entran aquí solas.</span></div>` : ''}
      <div class="viene">${R.siguientes.map(futuro).join('')}</div>
      <p class="formula">gastado + ritmo × días que quedan + programado</p></div>`, { clase: 'hPorqueW' });
  }

  async function pintar() {
    const nuevo = temaActual();
    if (nuevo !== T) { T = nuevo; requestAnimationFrame(() => pintarFondo(raiz.querySelector('.fondoG canvas'), T)); }
    R = await cliente.resumenGastos();
    pintarPanel();
  }
  return { pintar, abrirAlta, abrirPorque };
}
