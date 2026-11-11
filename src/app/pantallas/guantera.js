/** Guantera (T1633): documentos por tipo, testigo de lo que falta, lo leído del informe DGT y adjuntar ficheros al móvil. */
import { abrirHoja, cerrarHoja, tocar, avisar } from '../ui.js';
import { pintarFondo } from '../skin/motor.js';
import { esc } from '../formato.js';

const ICO = {
  pdf: '<path d="M5 2h7l4 4v12H5z"/><path d="M12 2v4h4M8 11h5M8 14h5"/>',
  foto: '<rect x="3" y="5" width="14" height="11" rx="2"/><circle cx="10" cy="10.5" r="2.6"/><path d="M7 5l1-2h4l1 2"/>',
  qr: '<rect x="3" y="3" width="5" height="5"/><rect x="12" y="3" width="5" height="5"/><rect x="3" y="12" width="5" height="5"/><path d="M12 12h2v2M17 12v5h-3M12 17v-1"/>',
  falta: '<path d="M5 2h7l4 4v12H5z" stroke-dasharray="2.4 2.4"/><path d="M10.5 9v4M8.5 11h4"/>'
};
const ico = n => `<svg class="ic" viewBox="0 0 20 20">${ICO[n]}</svg>`;

export function pantallaGuantera({ raiz, cliente, temaActual }) {
  let D = null, T = null;
  raiz.innerHTML = `<div class="cieloG"><canvas></canvas><div class="velo"></div></div><div class="tit" id="titG"></div><div class="cuerpoG" id="cuerpoG"></div>
    <input type="file" id="fichero" accept="image/*,application/pdf" hidden>`;
  const fichero = raiz.querySelector('#fichero');
  let destino = null;
  fichero.onchange = async () => {
    const f = fichero.files[0]; if (!f || !destino) return;
    const r = await cliente.adjuntar(destino, f);
    fichero.value = '';
    if (r.estado === 201) { tocar('guardado'); avisar('Guardado en el móvil'); }
  };

  function abrirInforme() {
    const I = D.informeDgt;
    abrirHoja(`<div class="hcab"><h2>${esc(I.titulo)}</h2><span class="chip ok">fuente: documento</span></div>
      <div class="guardadoD">${ico('pdf')}<span><b>${esc(I.fecha)} · ${I.paginas} páginas.</b> El documento se guarda solo en tu móvil: la app lee de él estos ${I.campos.length} datos.</span></div>
      <div class="camposD">${I.campos.map(c => `<div class="campo ${c.estado || ''}"><small>${esc(c.k)}<u>pág. ${c.pag}</u></small><b>${esc(c.v)}</b><span>${esc(c.d)}</span></div>`).join('')}</div>
      <div class="avisosD">${I.avisos.map(a => `<p><i></i>${esc(a)}</p>`).join('')}</div>
      <div class="acciones"><button class="boton pri" data-adjuntar="dgt">Guardar el PDF original</button><button class="boton" data-cerrar>Cerrar</button></div>`);
    enlazarHoja();
  }

  function abrirQr() {
    abrirHoja(`<div class="hcab"><h2>QR de la última ITV</h2><span class="ej">fase Android</span></div>
      <div class="notaQR"><b>Lo que trae el QR:</b> solo un enlace a la web de la estación, con un código. Fecha, resultado y km no están en el QR: salen del informe DGT.</div>
      <div class="notaQR"><b>Pendiente:</b> leer el QR en el móvil sin conexión llega con ML Kit en la app Android. Mientras, guarda la foto del informe de la ITV del 02/11/2026.</div>
      <div class="acciones"><button class="boton pri" data-adjuntar="itv">Guardar la foto</button><button class="boton" data-cerrar>Cerrar</button></div>`);
    enlazarHoja();
  }

  function enlazarHoja() {
    const h = document.getElementById('hoja');
    h.querySelector('[data-cerrar]').onclick = () => { tocar('toque'); cerrarHoja(); };
    h.querySelectorAll('[data-adjuntar]').forEach(b => b.onclick = () => { tocar('toque'); destino = b.dataset.adjuntar; fichero.click(); });
  }

  async function pintar() {
    const nuevo = temaActual();
    if (nuevo !== T) { T = nuevo; requestAnimationFrame(() => pintarFondo(raiz.querySelector('.cieloG canvas'), T)); }
    D = await cliente.documentos();
    const V = T.voz, r = D.resumen, todos = D.grupos.flatMap(g => g.docs), esperados = todos.filter(d => !d.extra);
    const arcos = esperados.map((d, i) => { const a0 = i / esperados.length * 360 + 3, a1 = (i + 1) / esperados.length * 360 - 3, p = a => [21 + 16 * Math.sin(a * Math.PI / 180), 21 - 16 * Math.cos(a * Math.PI / 180)].map(v => v.toFixed(2)); return `<path d="M${p(a0)}A16 16 0 0 1 ${p(a1)}" stroke="${i < r.guardados ? 'var(--ok)' : 'var(--falta)'}" opacity="${i < r.guardados ? 1 : .55}"/>`; }).join('');
    raiz.querySelector('#titG').innerHTML = `<b>${V.guantera}</b><span>Focus 1.6 EcoBoost · 2011</span>`;
    raiz.querySelector('#cuerpoG').innerHTML = `
      <div class="testigo"><svg viewBox="0 0 42 42" fill="none" stroke-width="4.5" stroke-linecap="round">${arcos}<text x="21" y="25" text-anchor="middle" fill="var(--tinta)" stroke="none" font-family="JetBrains Mono" font-weight="800" font-size="11">${r.guardados}/${r.esperados}</text></svg>
        <div><h3>${r.faltan ? `Faltan ${r.faltan}` : 'Completa'}<small>documentos</small></h3><p>${r.guardados} guardados · ${r.aBordo} obligatorio a bordo</p></div></div>
      ${D.grupos.map(g => { const c = g.docs.filter(d => !d.extra), t = c.filter(d => !d.falta).length; return `<div class="grupo"><span class="lbl">${esc(g.nombre)}</span><span>${c.length ? `${t} de ${c.length}` : 'extra'}</span></div>` + g.docs.map(d => {
        const chip = d.falta ? '<span class="chip linea">Adjuntar</span>' : d.accion === 'qr' ? '<span class="chip ac">Leer QR</span>' : `<span class="chip${d.accion ? ' ac' : ''}">${d.accion === 'abrir' ? 'Abrir' : 'Ver'}</span>`;
        return `<button class="doc${d.falta ? ' falta' : ''}${d.accion ? ' foco' : ''}" data-doc="${d.id}"><i class="ico">${ico(d.falta ? 'falta' : d.tipo)}</i><div><h4>${esc(d.nombre)}</h4><p>${esc(d.meta)}</p></div>${chip}</button>`;
      }).join(''); }).join('')}`;
    raiz.querySelectorAll('[data-doc]').forEach(b => b.onclick = () => {
      tocar('toque');
      const d = todos.find(x => x.id === b.dataset.doc);
      if (d.id === 'dgt') abrirInforme();
      else if (d.accion === 'qr') abrirQr();
      else if (d.falta) { destino = d.id; fichero.click(); }
      else avisar(d.propio ? 'Guardado en este móvil' : 'Foto en la carpeta del coche (aún no importada)');
    });
    return r;
  }
  return { pintar };
}
