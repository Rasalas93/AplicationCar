/** Taller: historial de visitas con su ticket, lo próximo por hacer y el alta de una visita que recalcula el núcleo. */
import { abrirHoja, cerrarHoja, tocar, avisar, icono } from '../ui.js';
import { pintarFondo } from '../skin/motor.js';
import { num, eur, km, dma, MES, partes, esc } from '../formato.js';
import { botonesAdjuntar, enlazarAdjuntar, filaArchivo, abrirVisor } from '../visor.js';

export function pantallaTaller({ raiz, cliente, temaActual }) {
  let D = null, T = null;
  raiz.innerHTML = `<div class="cieloG"><canvas></canvas><div class="velo"></div></div><div class="tit" id="titT"></div><div class="cuerpoG" id="cuerpoT"></div>`;
  const nombre = k => (D.tareas.find(t => t.clave === k) || { titulo: k }).titulo;
  const color = n => ({ rojo: T.estados.alerta, ambar: T.estados.falta, verde: T.estados.ok }[n]);
  const cuando = v => !v ? '' : v.estado === 'a-verificar' ? 'sin dato' : !v.vence ? 'al día' : v.vence.por === 'km' || v.faltan.dias > 400 ? `${num(Math.max(0, v.faltan.km || 0), 0)} km` : `${v.faltan.dias} días`;

  /** Alta de una visita: fecha, km, taller, trabajos, importe y ticket (foto o PDF). */
  function abrirAlta(trabajo) {
    const st = { trabajos: new Set(trabajo ? [trabajo] : []), archivo: null };
    const h = abrirHoja(`<div class="hcab"><h2>Visita al taller</h2><span class="chip">${esc(D.vehiculo.etiqueta)}</span></div>
      <div class="formV">
        <label><span>Fecha</span><input class="entrada" id="vFecha" type="date" value="${D.hoy}"></label>
        <label><span>Km</span><input class="entrada" id="vKm" inputmode="numeric" value="${D.odometro.km || ''}"></label>
        <label><span>Importe €</span><input class="entrada" id="vImp" inputmode="decimal" placeholder="0,00"></label>
        <label><span>Taller</span><input class="entrada" id="vTaller" maxlength="40" placeholder="Nombre"></label>
      </div>
      <span class="lbl">Trabajos hechos</span>
      <div class="chips trabajos">${D.tareas.map(t => `<button class="chip${st.trabajos.has(t.clave) ? ' on' : ''}" data-trabajo="${t.clave}">${esc(t.titulo)}</button>`).join('')}</div>
      <input class="entrada" id="vOtros" maxlength="80" placeholder="Otros trabajos (opcional)">
      <span class="lbl">Ticket o factura</span>
      <div id="vTicket" class="ticketV vacio">${icono('clip')}<span>Sin adjuntar</span></div>
      ${botonesAdjuntar('Elegir archivo')}
      <button class="guardar listo" id="vGuardar">Guardar visita</button>`, { clase: 'hVisita' });
    h.querySelectorAll('[data-trabajo]').forEach(b => b.onclick = () => {
      tocar('tic'); const k = b.dataset.trabajo;
      st.trabajos.has(k) ? st.trabajos.delete(k) : st.trabajos.add(k);
      b.classList.toggle('on', st.trabajos.has(k));
    });
    enlazarAdjuntar(h, f => {
      st.archivo = f; tocar('verde');
      const t = h.querySelector('#vTicket'); t.classList.remove('vacio');
      t.innerHTML = `${icono('clip')}<span><b>${esc(f.name || 'ticket')}</b> · se guarda con la visita</span>`;
    });
    h.querySelector('#vGuardar').onclick = async () => {
      const n = s => { const x = parseFloat(String(s).replace(/\./g, '').replace(',', '.')); return isNaN(x) ? null : x; };
      const imp = h.querySelector('#vImp').value.trim();
      const cuerpo = { fecha: h.querySelector('#vFecha').value, km: n(h.querySelector('#vKm').value), importe: imp ? parseFloat(imp.replace(',', '.')) : null, taller: h.querySelector('#vTaller').value, trabajos: [...st.trabajos], otros: h.querySelector('#vOtros').value };
      if (st.archivo) Object.assign(cuerpo, { archivo: st.archivo, nombre: st.archivo.name });
      const r = await cliente.anotarVisita(cuerpo);
      if (r.estado !== 201) { tocar('ambar'); avisar({ trabajos: 'Marca al menos un trabajo', fecha: 'Revisa la fecha', km: 'Revisa los km', importe: 'Revisa el importe' }[r.cuerpo.error.campo] || 'No se guardó'); return; }
      tocar('guardado'); await cerrarHoja();
      const al = r.cuerpo.actualizadas.length;
      avisar(`Visita guardada${al ? ` · ${al} ${al > 1 ? 'tareas' : 'tarea'} al día` : ''}`);
    };
  }

  function abrirVisita(x) {
    const h = abrirHoja(`<div class="hcab"><h2>${esc(x.taller || 'Visita al taller')}</h2><span class="chip">${dma(x.fecha)}</span></div>
      <div class="kv"><span>Km</span><b>${x.km ? km(x.km) : '—'}</b><span>Trabajos</span><b>${esc([...x.trabajos.map(nombre), x.otros].filter(Boolean).join(', '))}</b><span>Importe</span><b>${x.importe != null ? eur(x.importe) + ' · en Gastos' : '—'}</b></div>
      <span class="lbl">Ticket o factura</span>
      <div class="archs">${x.archivos.map(filaArchivo).join('') || '<p class="visorMeta">Sin adjuntar todavía</p>'}</div>
      ${botonesAdjuntar(x.archivos.length ? 'Añadir otro' : 'Elegir archivo')}<div class="acciones"><button class="boton" data-cerrar>Cerrar</button></div>`);
    h.querySelectorAll('[data-archivo]').forEach(b => b.onclick = () => { tocar('toque'); abrirVisor({ cliente, id: b.dataset.archivo, titulo: 'Ticket del taller' }); });
    h.querySelector('[data-cerrar]').onclick = () => { tocar('toque'); cerrarHoja(); };
    enlazarAdjuntar(h, async f => { await cerrarHoja(); const r = await cliente.adjuntarTicket(x.id, f); if (r.estado === 201) { tocar('guardado'); avisar('Ticket guardado en el móvil'); } });
  }

  async function pintar() {
    const nuevo = temaActual();
    if (nuevo !== T) { T = nuevo; requestAnimationFrame(() => pintarFondo(raiz.querySelector('.cieloG canvas'), T)); }
    const [t, p] = await Promise.all([cliente.taller(), cliente.panel()]);
    D = { ...t, hoy: p.hoy };
    const v = D.vehiculo, r = D.resumen, V = T.voz;
    raiz.querySelector('#titT').innerHTML = `<b>${V.taller}</b><span>${esc([v.etiqueta, `${v.marca} ${v.modelo}`.trim()].filter(Boolean).join(' · '))}</span>`;
    raiz.querySelector('#cuerpoT').innerHTML = `
      <div class="resumenT"><div><strong>${r.visitas}</strong><span>${r.visitas === 1 ? 'visita' : 'visitas'}</span></div><div><strong>${eur(r.total, 0)}</strong><span>en taller</span></div><div><strong>${r.ultima ? `${partes(r.ultima)[2]} ${MES[partes(r.ultima)[1] - 1]}` : '—'}</strong><span>última</span></div>
        <button class="boton pri" id="nuevaV">${icono('taller')}Nueva visita</button></div>
      <div class="grupo"><span class="lbl">Mantenimiento</span><span>${km(D.odometro.km)}</span></div>
      <div class="marco proxT">${D.tareas.map(x => { const ve = x.vencimiento; return `<button class="fila" data-hacer="${x.clave}" style="--c:${color(ve.nivel)}"><span class="dot"></span><div><h4>${esc(x.titulo)}</h4><p>${esc(ve.detalle)}</p></div><span class="val">${cuando(ve)}${ve.ejemplo ? '<small>ejemplo</small>' : ve.fuente && ve.fuente.tipo === 'orientativo' ? '<small>orientativo</small>' : ''}</span></button>`; }).join('')}</div>
      <div class="grupo"><span class="lbl">Historial</span><span>${r.visitas ? 'la más reciente primero' : ''}</span></div>
      ${D.visitas.length ? D.visitas.map(x => { const [a, m, d] = partes(x.fecha); return `<button class="visitaT" data-visita="${x.id}"><div class="fechaT"><b>${d}</b><span>${MES[m - 1]} ${a}</span></div><div class="cuerpoV"><h4>${esc(x.taller || 'Taller')}</h4><p>${x.trabajos.map(k => `<i>${esc(nombre(k))}</i>`).join('')}${x.otros ? `<i>${esc(x.otros)}</i>` : ''}</p><small>${x.km ? km(x.km) : 'sin km'}</small></div><div class="impV"><b>${x.importe != null ? eur(x.importe) : '—'}</b>${x.archivos.length ? `<span class="chip ok">${icono('clip')}ticket</span>` : '<span class="chip linea">sin ticket</span>'}</div></button>`; }).join('')
        : `<button class="doc falta" data-primera><i class="ico">${icono('taller')}</i><div><h4>Sin visitas todavía</h4><p>Anota la primera con su ticket</p></div><span class="chip linea">Anotar</span></button>`}`;
    raiz.querySelector('#nuevaV').onclick = () => { tocar('toque'); abrirAlta(); };
    const primera = raiz.querySelector('[data-primera]');
    if (primera) primera.onclick = () => { tocar('toque'); abrirAlta(); };
    raiz.querySelectorAll('[data-hacer]').forEach(b => b.onclick = () => { tocar('toque'); abrirAlta(b.dataset.hacer); });
    raiz.querySelectorAll('[data-visita]').forEach(b => b.onclick = () => { tocar('toque'); abrirVisita(D.visitas.find(x => x.id === b.dataset.visita)); });
  }
  return { pintar, abrirAlta };
}
