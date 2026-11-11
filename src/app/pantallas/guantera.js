/** Guantera (T1633): documentos por tipo, testigo de lo que falta, informe DGT, archivos del vehículo y datos útiles. */
import { abrirHoja, cerrarHoja, tocar, avisar, icono } from '../ui.js';
import { pintarFondo } from '../skin/motor.js';
import { esc } from '../formato.js';
import { elegirArchivo, botonesAdjuntar, enlazarAdjuntar, filaArchivo, abrirVisor } from '../visor.js';

const FUENTE = { documento: ['ok', 'documento'], verbal: ['falta', 'verbal'], ejemplo: ['ej', 'ejemplo'], manual: ['', 'a mano'] };

const ICO = {
  pdf: '<path d="M5 2h7l4 4v12H5z"/><path d="M12 2v4h4M8 11h5M8 14h5"/>',
  foto: '<rect x="3" y="5" width="14" height="11" rx="2"/><circle cx="10" cy="10.5" r="2.6"/><path d="M7 5l1-2h4l1 2"/>',
  qr: '<rect x="3" y="3" width="5" height="5"/><rect x="12" y="3" width="5" height="5"/><rect x="3" y="12" width="5" height="5"/><path d="M12 12h2v2M17 12v5h-3M12 17v-1"/>',
  archivo: '<path d="M5 2h7l4 4v12H5z"/><path d="M12 2v4h4"/>',
  falta: '<path d="M5 2h7l4 4v12H5z" stroke-dasharray="2.4 2.4"/><path d="M10.5 9v4M8.5 11h4"/>'
};
const ico = n => `<svg class="ic" viewBox="0 0 20 20">${ICO[n]}</svg>`;

export function pantallaGuantera({ raiz, cliente, temaActual }) {
  let D = null, T = null, F = null;
  raiz.innerHTML = `<div class="cieloG"><canvas></canvas><div class="velo"></div></div><div class="tit" id="titG"></div><div class="cuerpoG" id="cuerpoG"></div>`;

  async function guardarEn(doc, f) {
    const r = doc ? await cliente.adjuntar(doc, f) : await cliente.adjuntarVehiculo(f);
    if (r.estado === 201) { tocar('guardado'); avisar('Guardado en el móvil'); } else avisar('No se guardó el archivo');
  }

  /** Hueco de un documento: sus archivos, foto o archivo nuevo. */
  function abrirHueco(d) {
    const propios = (d.archivos || []).length;
    const h = abrirHoja(`<div class="hcab"><h2>${esc(d.nombre)}</h2><span class="chip ${d.falta ? 'falta' : 'ok'}">${d.falta ? 'falta' : propios ? 'en el móvil' : 'guardado'}</span></div>
      <p class="visorMeta">${esc(d.falta ? d.meta : propios ? d.meta : 'Foto en la carpeta del coche (aún no importada)')}</p>
      ${propios ? `<div class="archs">${d.archivos.map(id => filaArchivo(D.todos.get(id) || { id, nombre: d.nombre, tipo: d.tipo })).join('')}</div>` : ''}
      ${botonesAdjuntar(propios ? 'Añadir otro' : 'Elegir archivo')}<div class="acciones"><button class="boton" data-cerrar>Cerrar</button></div>`);
    h.querySelectorAll('[data-archivo]').forEach(b => b.onclick = () => { tocar('toque'); abrirVisor({ cliente, id: b.dataset.archivo, titulo: d.nombre }); });
    h.querySelector('[data-cerrar]').onclick = () => { tocar('toque'); cerrarHoja(); };
    enlazarAdjuntar(h, async f => { await cerrarHoja(); guardarEn(d.id, f); });
  }

  /** Un dato útil: valor y fuente (documento, verbal o ejemplo). */
  function abrirCampo(c) {
    if (c.fija) { tocar('toque'); avisar('La matrícula sale del documento'); return; }
    const st = { fuente: c.fuente ? c.fuente.tipo : 'verbal' };
    const h = abrirHoja(`<div class="hcab"><h2>${esc(c.etiqueta)}</h2>${c.fuente ? `<span class="chip">${esc(c.fuente.cita || '')}</span>` : ''}</div>
      <input class="entrada" id="valorC" value="${esc(c.valor || '')}" maxlength="160" ${c.tel ? 'inputmode="tel" placeholder="Teléfono"' : 'placeholder="Escribe el dato"'}>
      <span class="lbl">Fuente</span><div class="chips fuentes">${['documento', 'verbal', 'ejemplo'].map(f => `<button class="chip${f === st.fuente ? ' on' : ''}" data-fuente="${f}">${FUENTE[f][1]}</button>`).join('')}</div>
      <div class="acciones">${c.tel && c.valor ? `<a class="boton" href="tel:${esc(c.valor.replace(/\s/g, ''))}">${icono('tel')}Llamar</a>` : ''}<button class="boton pri" data-guardar>Guardar</button><button class="boton" data-cerrar>Cerrar</button></div>`);
    h.querySelectorAll('[data-fuente]').forEach(b => b.onclick = () => { tocar('tic'); st.fuente = b.dataset.fuente; h.querySelectorAll('[data-fuente]').forEach(x => x.classList.toggle('on', x === b)); });
    h.querySelector('[data-cerrar]').onclick = () => { tocar('toque'); cerrarHoja(); };
    h.querySelector('[data-guardar]').onclick = async () => {
      const r = await cliente.editarFicha({ clave: c.clave, valor: h.querySelector('#valorC').value, fuente: st.fuente });
      if (r.estado !== 201) { avisar('No se guardó: revisa ' + r.cuerpo.error.campo); return; }
      tocar('guardado'); await cerrarHoja(); avisar('Dato guardado');
    };
  }

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
    h.querySelectorAll('[data-adjuntar]').forEach(b => b.onclick = async () => {
      tocar('toque');
      const doc = b.dataset.adjuntar, f = await elegirArchivo({ camara: doc === 'itv' });
      if (f) { await cerrarHoja(); guardarEn(doc, f); }
    });
  }

  async function pintar() {
    const nuevo = temaActual();
    if (nuevo !== T) { T = nuevo; requestAnimationFrame(() => pintarFondo(raiz.querySelector('.cieloG canvas'), T)); }
    [D, F] = await Promise.all([cliente.documentos(), cliente.ficha()]);
    D.todos = new Map((await cliente.archivos()).archivos.map(a => [a.id, a]));
    const V = T.voz, veh = D.vehiculo, r = D.resumen, todos = D.grupos.flatMap(g => g.docs), esperados = todos.filter(d => !d.extra);
    const arcos = esperados.map((d, i) => { const a0 = i / esperados.length * 360 + 3, a1 = (i + 1) / esperados.length * 360 - 3, p = a => [21 + 16 * Math.sin(a * Math.PI / 180), 21 - 16 * Math.cos(a * Math.PI / 180)].map(v => v.toFixed(2)); return `<path d="M${p(a0)}A16 16 0 0 1 ${p(a1)}" stroke="${i < r.guardados ? 'var(--ok)' : 'var(--falta)'}" opacity="${i < r.guardados ? 1 : .55}"/>`; }).join('');
    raiz.querySelector('#titG').innerHTML = `<b>${V.guantera}</b><span>${esc([veh.etiqueta, `${veh.marca} ${veh.modelo}`.trim(), veh.anio].filter(Boolean).join(' · '))}</span>`;
    raiz.querySelector('#cuerpoG').innerHTML = `
      <div class="testigo"><svg viewBox="0 0 42 42" fill="none" stroke-width="4.5" stroke-linecap="round">${arcos}<text x="21" y="25" text-anchor="middle" fill="var(--tinta)" stroke="none" font-family="JetBrains Mono" font-weight="800" font-size="11">${r.guardados}/${r.esperados}</text></svg>
        <div><h3>${r.faltan ? `Faltan ${r.faltan}` : 'Completa'}<small>documentos</small></h3><p>${r.guardados} guardados · ${r.aBordo} obligatorio a bordo</p></div></div>
      ${D.grupos.map(g => { const c = g.docs.filter(d => !d.extra), t = c.filter(d => !d.falta).length; return `<div class="grupo"><span class="lbl">${esc(g.nombre)}</span><span>${c.length ? `${t} de ${c.length}` : 'extra'}</span></div>` + g.docs.map(d => {
        const chip = d.falta ? '<span class="chip linea">Adjuntar</span>' : d.accion === 'qr' ? '<span class="chip ac">Leer QR</span>' : `<span class="chip${d.accion ? ' ac' : ''}">${d.accion === 'abrir' ? 'Abrir' : 'Ver'}</span>`;
        return `<button class="doc${d.falta ? ' falta' : ''}${d.accion ? ' foco' : ''}" data-doc="${d.id}"><i class="ico">${ico(d.falta ? 'falta' : d.tipo)}</i><div><h4>${esc(d.nombre)}</h4><p>${esc(d.meta)}</p></div>${chip}</button>`;
      }).join(''); }).join('')}
      <div class="grupo"><span class="lbl">Archivos del vehículo</span><span>${D.archivos.length || 'ninguno'}</span></div>
      <div class="archs">${D.archivos.map(filaArchivo).join('')}</div>
      <button class="doc falta nuevoA" data-nuevo><i class="ico">${icono('clip')}</i><div><h4>Añadir foto o PDF</h4><p>Se guarda solo en este móvil, sin conexión</p></div><span class="chip linea">Adjuntar</span></button>
      <div class="grupo"><span class="lbl">Datos útiles</span><span>${F.resumen.conDato} de ${F.resumen.total}${F.resumen.ejemplo ? ` · ${F.resumen.ejemplo} de ejemplo` : ''}</span></div>
      ${F.grupos.map(g => `<div class="datosU">${g.campos.map(c => { const f = c.fuente && FUENTE[c.fuente.tipo]; return `<button class="campo dato${c.valor ? '' : ' vacio'}" data-campo="${c.clave}"><small>${esc(c.etiqueta)}${f ? `<u class="${f[0]}">${f[1]}</u>` : ''}</small><b>${c.valor ? esc(c.valor) : c.tel ? 'Añadir teléfono' : 'Añadir'}</b></button>`; }).join('')}</div>`).join('')}`;
    raiz.querySelectorAll('[data-doc]').forEach(b => b.onclick = () => {
      tocar('toque');
      const d = todos.find(x => x.id === b.dataset.doc);
      if (d.id === 'dgt' && D.informeDgt) abrirInforme();
      else if (d.accion === 'qr') abrirQr();
      else abrirHueco(d);
    });
    raiz.querySelectorAll('.archs [data-archivo]').forEach(b => b.onclick = () => { tocar('toque'); abrirVisor({ cliente, id: b.dataset.archivo }); });
    raiz.querySelector('[data-nuevo]').onclick = () => {
      tocar('toque');
      const h = abrirHoja(`<div class="hcab"><h2>Archivo del vehículo</h2><span class="chip">${esc(veh.etiqueta)}</span></div><p class="visorMeta">Factura, foto del salpicadero, un parte… Queda en este móvil.</p>${botonesAdjuntar('Elegir archivo')}<div class="acciones"><button class="boton" data-cerrar>Cerrar</button></div>`);
      h.querySelector('[data-cerrar]').onclick = () => { tocar('toque'); cerrarHoja(); };
      enlazarAdjuntar(h, async f => { await cerrarHoja(); guardarEn(null, f); });
    };
    const campos = F.grupos.flatMap(g => g.campos);
    raiz.querySelectorAll('[data-campo]').forEach(b => b.onclick = () => { tocar('toque'); abrirCampo(campos.find(c => c.clave === b.dataset.campo)); });
    return r;
  }
  return { pintar };
}
