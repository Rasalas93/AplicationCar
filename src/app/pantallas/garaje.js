/** Garaje: elegir el vehículo activo y añadir otro (coche o moto) desde la plantilla de su tipo. */
import { abrirHoja, cerrarHoja, tocar, avisar, icono } from '../ui.js';
import { km, esc } from '../formato.js';

const DIBUJO = {
  coche: '<path d="M3 15.5V12l2.2-4.2A2 2 0 0 1 7 6.8h10a2 2 0 0 1 1.8 1L21 12v3.5a1 1 0 0 1-1 1h-1M5 16.5H4a1 1 0 0 1-1-1M9 16.5h6M3 12h18"/><circle cx="7" cy="16.5" r="2"/><circle cx="17" cy="16.5" r="2"/>',
  moto: '<circle cx="5.5" cy="16" r="3.2"/><circle cx="18.5" cy="16" r="3.2"/><path d="M5.5 16l4-6h5l4 6M9.5 10l-1.5-3H6M14.5 10l1.5-4h2.5M12 16l2.5-6"/>'
};
const dibujo = t => `<svg class="ic" viewBox="0 0 24 24">${DIBUJO[t] || DIBUJO.coche}</svg>`;

export async function abrirGaraje({ cliente }) {
  const { vehiculos, activo } = await cliente.vehiculos();
  const st = { tipo: 'moto' };
  const h = abrirHoja(`<div class="hcab"><h2>Garaje</h2><span class="chip">${vehiculos.length} ${vehiculos.length === 1 ? 'vehículo' : 'vehículos'}</span></div>
    <div class="garaje">${vehiculos.map(v => `<button class="vehG${v.id === activo ? ' on' : ''}" data-veh="${v.id}"><i class="ico">${dibujo(v.tipo)}</i><div><h4>${esc(v.etiqueta)}</h4><p>${esc([`${v.marca} ${v.modelo}`.trim(), v.anio, km(v.km)].filter(Boolean).join(' · '))}</p></div>${v.id === activo ? '<span class="chip ok">al volante</span>' : '<span class="chip">Usar</span>'}</button>`).join('')}</div>
    <span class="lbl">Añadir vehículo</span>
    <div class="chips tipos">${['moto', 'coche'].map(t => `<button class="chip${t === st.tipo ? ' on' : ''}" data-tipo="${t}">${dibujo(t)}${t === 'moto' ? 'Moto' : 'Coche'}</button>`).join('')}</div>
    <div class="formV">
      <label class="ancho"><span>Nombre</span><input class="entrada" id="gNombre" maxlength="40" placeholder="Ej.: La moto"></label>
      <label><span>Marca</span><input class="entrada" id="gMarca" maxlength="30"></label>
      <label><span>Modelo</span><input class="entrada" id="gModelo" maxlength="30"></label>
      <label><span>Año</span><input class="entrada" id="gAnio" inputmode="numeric" maxlength="4"></label>
      <label><span>Km</span><input class="entrada" id="gKm" inputmode="numeric"></label>
    </div>
    <p class="visorMeta">El tipo trae su plan de mantenimiento, sus zonas y su dibujo. Todo queda en este móvil.</p>
    <button class="guardar listo" id="gGuardar">Añadir y usar</button>`, { clase: 'hGaraje' });
  const usar = async id => { await cliente.usar(id); tocar('verde'); await cerrarHoja(); };
  h.querySelectorAll('[data-veh]').forEach(b => b.onclick = () => { tocar('toque'); if (b.dataset.veh === activo) cerrarHoja(); else usar(b.dataset.veh); });
  h.querySelectorAll('[data-tipo]').forEach(b => b.onclick = () => { tocar('tic'); st.tipo = b.dataset.tipo; h.querySelectorAll('[data-tipo]').forEach(x => x.classList.toggle('on', x === b)); });
  h.querySelector('#gGuardar').onclick = async () => {
    const n = id => { const x = parseInt(h.querySelector(id).value.replace(/\D/g, ''), 10); return isNaN(x) ? null : x; };
    const r = await cliente.crearVehiculo({ tipo: st.tipo, etiqueta: h.querySelector('#gNombre').value, marca: h.querySelector('#gMarca').value, modelo: h.querySelector('#gModelo').value, anio: n('#gAnio'), km: n('#gKm') });
    if (r.estado !== 201) { tocar('ambar'); avisar({ etiqueta: 'Ponle un nombre', anio: 'Revisa el año', km: 'Revisa los km' }[r.cuerpo.error.campo] || 'No se guardó'); return; }
    tocar('guardado'); await usar(r.cuerpo.vehiculo.id);
    avisar(`${r.cuerpo.vehiculo.etiqueta} en el garaje`);
  };
}
