/** Motor de reglas: vencimientos por fecha o km (lo que llegue antes) y zonas del coche para los próximos meses. */
import { ESTADOS, NIVEL } from '../contrato/contrato.js';
import { dias, masDias, masMeses } from './fechas.js';

const PESO = { [NIVEL.ROJO]: 3, [NIVEL.AMBAR]: 2, [NIVEL.VERDE]: 1 };

/** Fecha en que el odómetro llegará a `km` al ritmo `kmDia`. */
export function fechaPorKm(km, odometro, kmDia) {
  return masDias(odometro.fecha, Math.ceil((km - odometro.km) / kmDia));
}

/** Calcula un vencimiento de una tarea del plan. */
export function vencimiento(tarea, { hoy, odometro, kmDia, horizonte }) {
  const r = tarea.regla || {}, base = { clave: tarea.clave, titulo: tarea.titulo, zona: tarea.zona || null, detalle: tarea.detalle, fuente: tarea.fuente, ejemplo: !!tarea.ejemplo, gasto: tarea.gasto || null, taller: !!tarea.intervalo };
  if (r.tipo === 'sin-dato') return { ...base, estado: ESTADOS.A_VERIFICAR, nivel: NIVEL.AMBAR, vence: null, faltan: null, pendiente: tarea.pendiente || 'Falta dato' };
  if (r.tipo === 'vigente') return { ...base, estado: ESTADOS.AL_DIA, nivel: NIVEL.VERDE, vence: null, faltan: null };
  let fecha = r.fecha || null, por = fecha ? 'fecha' : null;
  if (r.km) {
    const fk = fechaPorKm(r.km, odometro, kmDia);
    if (!fecha || fk < fecha) { fecha = fk; por = 'km'; }
  }
  const faltanDias = dias(hoy, fecha), faltanKm = r.km ? r.km - odometro.km : null;
  const estado = faltanDias < 0 ? ESTADOS.VENCIDO : fecha <= horizonte ? ESTADOS.PROXIMO : ESTADOS.AL_DIA;
  return { ...base, estado, nivel: estado === ESTADOS.AL_DIA ? NIVEL.VERDE : NIVEL.ROJO, vence: { fecha, km: r.km || null, por }, faltan: { dias: faltanDias, km: faltanKm } };
}

/** Vencimientos del vehículo ordenados: rojos, ámbar y verdes; dentro de cada uno, por fecha. */
export function proximosVencimientos(vehiculo, hoy, meses = 3) {
  const ctx = { hoy, odometro: vehiculo.odometro, kmDia: vehiculo.kmDia, horizonte: masMeses(hoy, meses) };
  const lista = vehiculo.tareas.map(t => vencimiento(t, ctx));
  const orden = v => [ -PESO[v.nivel], v.estado === ESTADOS.A_VERIFICAR ? -1 : 0, v.vence ? v.vence.fecha : '9999' ];
  lista.sort((a, b) => { const x = orden(a), y = orden(b); return x[0] - y[0] || x[1] - y[1] || (x[2] < y[2] ? -1 : x[2] > y[2] ? 1 : 0); });
  return { hoy, horizonte: ctx.horizonte, vencimientos: lista };
}

/** Una zona por pieza del coche, con el peor nivel de sus tareas. */
export function zonas(vencimientos) {
  const m = new Map();
  for (const v of vencimientos) {
    if (!v.zona) continue;
    const z = m.get(v.zona) || { zona: v.zona, nivel: NIVEL.VERDE, claves: [] };
    z.claves.push(v.clave);
    if (PESO[v.nivel] > PESO[z.nivel]) z.nivel = v.nivel;
    m.set(v.zona, z);
  }
  return [...m.values()];
}

/** Cuenta por nivel: el «2 · 1 · 2» de la cabecera. */
export function cuenta(zs) {
  return { rojo: zs.filter(z => z.nivel === NIVEL.ROJO).length, ambar: zs.filter(z => z.nivel === NIVEL.AMBAR).length, verde: zs.filter(z => z.nivel === NIVEL.VERDE).length };
}
