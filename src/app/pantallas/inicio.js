/** Inicio: el coche 3D con sus zonas arriba y, debajo, lo que pide atención (vista-modelo + pintado). */
import { crearCoche3D, hayWebGL } from '../presentadores/coche3d.js';
import { ZONAS_FOCUS } from '../presentadores/zonas-focus.js';
import { num, km, larga, dma, MES, partes, esc } from '../formato.js';
import { abrirHoja, cerrarHoja, tocar, icono } from '../ui.js';
import { dias } from '../../nucleo/fechas.js';

const BASE = import.meta.env.BASE_URL;

/** Vista-modelo: del panel del API a filas y zonas listas para pintar (sin colores). */
export function vistaInicio(p) {
  const dato = v => v.estado === 'a-verificar' ? 'falta dato' : !v.vence ? 'vigente' : v.vence.por === 'km' || (v.faltan.km != null && v.faltan.dias > 45) ? `${num(v.faltan.km, 0)} km · ${MES[partes(v.vence.fecha)[1] - 1]}` : `${v.faltan.dias} días`;
  const filas = p.vencimientos.map(v => ({ ...v, valor: v.estado === 'a-verificar' ? null : !v.vence ? 'Vigente' : v.vence.km && v.vence.por === 'fecha' && v.faltan.dias > 30 ? `${num(v.faltan.km, 0)} km` : `${v.faltan.dias} días`, sub: v.vence && v.vence.km && v.vence.por === 'fecha' && v.faltan.dias > 30 ? `o ${MES[partes(v.vence.fecha)[1] - 1]}` : '', dato: dato(v) }));
  const zonas = p.zonas.map(z => { const v = filas.find(f => f.clave === z.claves.find(c => filas.find(f => f.clave === c && f.nivel === z.nivel))) || filas.find(f => f.clave === z.claves[0]); return { zona: z.zona, nivel: z.nivel, titulo: v.titulo.replace(/ y filtros| de distribución| 2027/g, ''), dato: v.dato, clave: v.clave }; });
  const conFecha = filas.filter(f => f.vence && f.vence.fecha);
  const via = conFecha.map(f => ({ txt: f.titulo.split(' ')[0].toUpperCase(), sub: f.valor, rojo: f.nivel === 'rojo', d: dias(p.hoy, f.vence.fecha) })).sort((a, b) => a.d - b.d).slice(0, 3);
  return { filas, zonas, via, cuenta: p.cuenta, vehiculo: p.vehiculo, consumo: p.consumo, gastosMes: p.gastosMes, documentos: p.documentos, consejo: p.consejo, horizonte: p.horizonte };
}

export function pantallaInicio({ raiz, cliente, temaActual, ir, abrirAspecto }) {
  let coche = null, vm = null;
  raiz.innerHTML = `
    <div class="escenario" id="escenario">
      <img class="poster" src="${BASE}modelo/poster.jpg" alt="Ford Focus en el estudio" decoding="async">
      <canvas id="lienzo3d" aria-label="Coche en 3D: arrastra para girarlo"></canvas>
      <header class="cabI"><div><div class="marca" id="marcaI"></div><div class="modelo" id="modeloI"></div></div>
        <div class="cuenta"><span id="cuentaI"></span><button class="btnTema" id="btnTema" aria-label="Aspecto">${icono('aspecto')}</button></div></header>
      <div class="odoI"><small>ODÓMETRO</small><strong id="odoI"></strong><em>km</em></div>
      <div class="fuenteI" id="fuenteI"></div>
    </div>
    <div class="contenido" id="contenidoI"></div>`;
  raiz.querySelector('#btnTema').onclick = () => { tocar('toque'); abrirAspecto(); };

  const esc3d = raiz.querySelector('#escenario');
  if (hayWebGL()) {
    coche = crearCoche3D({ contenedor: esc3d, lienzo: raiz.querySelector('#lienzo3d'), modelo: `${BASE}modelo/focus.glb`, entorno: `${BASE}modelo/estudio.hdr`, definiciones: ZONAS_FOCUS, alTocarZona: z => abrirTarea(z.clave, true) });
    coche.listo.then(() => { esc3d.classList.add('vivo'); window.__coche3d = coche; window.__listo3d = true; }).catch(() => { window.__listo3d = 'error'; });
    coche.iniciar();
  } else window.__listo3d = 'sin-webgl';

  function abrirTarea(clave, desdeZona) {
    const f = vm.filas.find(x => x.clave === clave);
    tocar(desdeZona ? f.nivel : 'toque');
    const T = temaActual(), color = { rojo: T.estados.alerta, ambar: T.estados.falta, verde: T.estados.ok }[f.nivel];
    const cifra = f.estado === 'a-verificar' ? `<strong>?</strong><span>${esc(f.pendiente)}<br>Adjunta el documento para quitar el aviso</span>`
      : !f.vence ? `<strong>OK</strong><span>${esc(f.detalle)}</span>`
      : `<strong>${f.faltan.dias}</strong><span>días · ${f.vence.por === 'km' ? 'por km' : 'por fecha'}<br>${larga(f.vence.fecha)}${f.vence.km ? ` o ${km(f.vence.km)}` : ''}</span>`;
    const fuente = f.fuente ? `${esc(f.fuente.cita || f.fuente.quien || f.fuente.tipo)}${f.fuente.url ? ` · <a href="${f.fuente.url}" target="_blank" rel="noopener">BOE</a>` : ''}` : '—';
    const nivel = { rojo: ['alerta', 'Vence en los próximos 3 meses'], ambar: ['falta', 'Falta un dato'], verde: ['ok', 'En regla'] }[f.nivel];
    abrirHoja(`<div class="tarea" style="--c:${color}">
      <div class="hcab"><h2>${esc(f.titulo)}</h2>${f.ejemplo ? '<span class="ej">ejemplo</span>' : ''}</div>
      <div class="estado"><span class="chip ${nivel[0]}">${nivel[1]}</span><span class="chip">${esc(ZONAS_FOCUS[f.zona]?.nombre || '')}</span></div>
      <div class="cifra">${cifra}</div>
      <div class="kv"><span>Qué</span><b>${esc(f.detalle)}</b>${f.vence && f.vence.km ? `<span>Faltan</span><b>${km(f.faltan.km)} a ${num(vm.vehiculo.kmDia, 1)} km/día</b>` : ''}<span>Fuente</span><b>${fuente}</b></div>
      <div class="acciones">${f.gasto ? `<button class="boton pri" data-ir="gastos">Ver en Gastos</button>` : `<button class="boton pri" data-ir="guantera">Ir a la Guantera</button>`}<button class="boton" data-cerrar>Cerrar</button></div></div>`, { clase: 'hTarea' });
    document.querySelector('#hoja [data-cerrar]').onclick = () => { tocar('toque'); cerrarHoja(); };
    document.querySelector('#hoja [data-ir]').onclick = e => { tocar('toque'); const d = e.currentTarget.dataset.ir; cerrarHoja().then(() => ir(d)); };
  }

  async function pintar() {
    const T = temaActual(), V = T.voz;
    vm = vistaInicio(await cliente.panel());
    const c = vm.cuenta, est = T.estados, v = vm.vehiculo;
    raiz.querySelector('#marcaI').textContent = V.marca;
    raiz.querySelector('#modeloI').textContent = `${v.modelo.replace('MK3', '').trim()} ${v.version} · ${v.anio}`;
    raiz.querySelector('#cuentaI').innerHTML = `<i style="--c:${est.alerta}"></i>${c.rojo}<i style="--c:${est.falta}"></i>${c.ambar}<i style="--c:${est.ok}"></i>${c.verde}`;
    raiz.querySelector('#odoI').textContent = num(v.odometro.km, 0);
    raiz.querySelector('#fuenteI').textContent = v.odometro.fuente.replace('DGT · ', '');
    if (coche) { coche.pintar(v.pintura.color); coche.matricula(v.matricula); coche.zonas(vm.zonas); }
    else esc3d.insertAdjacentHTML('beforeend', `<div class="zonasPlano">${vm.zonas.map(z => `<button class="zona" data-nivel="${z.nivel}" data-clave="${z.clave}"><i></i><span><b>${z.titulo}</b><small>${z.dato}</small></span></button>`).join('')}</div>`);
    esc3d.querySelectorAll('.zonasPlano .zona').forEach(b => b.onclick = () => abrirTarea(b.dataset.clave, true));
    const col = n => ({ rojo: est.alerta, ambar: est.falta, verde: est.ok }[n]);
    const g = vm.gastosMes, d = vm.documentos, cons = vm.consumo, maxC = Math.max(...cons.meses.map(m => m[1]));
    raiz.querySelector('#contenidoI').innerHTML = `
      <div class="sec"><span class="lbl">Requiere atención</span><b><i>${c.rojo} en 3 meses</i> · <u>${c.ambar} sin dato</u></b></div>
      <div class="marco">${vm.filas.map(f => `<button class="fila${f.nivel !== 'verde' ? ' av' : ''}" data-clave="${f.clave}" style="--c:${col(f.nivel)}"><span class="dot"></span><div><h4>${esc(f.titulo)}</h4><p>${esc(f.detalle)}</p></div>${f.valor ? `<span class="val">${f.valor}${f.sub ? `<small>${f.sub}</small>` : ''}</span>` : `<span class="est">${esc(f.pendiente)}</span>`}<svg class="chev" viewBox="0 0 7 12"><path d="M1 1l5 5-5 5"/></svg></button>`).join('')}</div>
      <div class="via"><div class="hoyV"><i></i>HOY</div>${vm.via.map((x, i) => `<span class="${x.rojo ? 'a' : ''}" style="left:${32 + i * 26}%">${x.txt}</span><u class="${x.rojo ? 'a' : ''}" style="left:${32 + i * 26}%">${x.sub}</u>`).join('')}</div>
      <div class="tiles">
        <button class="marco tile" data-ir="gastos"><span class="dot" style="--c:${T.acento}"></span><div><h4>${V.gastos}</h4><p><strong>${num(g.gastado)} €</strong> este mes · previsión ${num(g.central, 0)} €</p></div><svg class="chev" viewBox="0 0 7 12"><path d="M1 1l5 5-5 5"/></svg></button>
        <button class="marco tile" data-ir="guantera"><span class="dot" style="--c:${d.faltan ? est.falta : est.ok}"></span><div><h4>${V.guantera}</h4><p><strong>${d.guardados} documentos</strong> · faltan ${d.faltan}</p></div><svg class="chev" viewBox="0 0 7 12"><path d="M1 1l5 5-5 5"/></svg></button>
      </div>
      <div class="marco fuel"><div><div class="lbl">Consumo real</div><div class="big">${num(cons.l100, 1)}<span>L/100 km</span></div>
        <div class="chips"><span class="chip ok">Último ${num(cons.ultimo, 1)}</span><span class="chip">${cons.repostajes} repostajes</span>${cons.ejemplo ? '<span class="ej">ejemplo</span>' : ''}</div></div>
        <div class="bars">${cons.meses.map((m, i) => `<i class="${i === cons.meses.length - 1 ? 'now' : ''}" style="height:${(m[1] / maxC * 82).toFixed(0)}%"></i>`).join('')}<div class="axis"><span>${cons.meses[0][0]}</span><span>${cons.meses[cons.meses.length - 1][0]}</span></div></div></div>
      <div class="marco tip"><div class="L">L</div><p><b>CONSEJO NOVEL · ${esc(vm.consejo.fuente)}</b>${esc(vm.consejo.texto)}</p></div>`;
    raiz.querySelectorAll('.fila').forEach(b => b.onclick = () => abrirTarea(b.dataset.clave, false));
    raiz.querySelectorAll('.tile').forEach(b => b.onclick = () => { tocar('toque'); ir(b.dataset.ir); });
  }

  return { pintar, activar: si => coche && coche.activar(si), abrirTarea, get coche() { return coche; } };
}
