/** Historial de taller (funciones puras): validar una visita, pasarla a Gastos y recalcular las tareas que hizo. */
import { masMeses } from './fechas.js';

const dma = f => f.split('-').reverse().join('/');

/** Error de validación (nombre del campo) o null. */
export function validarVisita(c) {
  if (!c || !/^\d{4}-\d{2}-\d{2}$/.test(c.fecha || '')) return 'fecha';
  if (c.km != null && !(c.km > 0)) return 'km';
  if (c.importe != null && !(c.importe >= 0)) return 'importe';
  if (!(Array.isArray(c.trabajos) && c.trabajos.length) && !(c.otros || '').trim()) return 'trabajos';
  return null;
}

/** Gasto de mantenimiento que deja una visita (null si no tiene importe). */
export function gastoDeVisita(visita, tareas = []) {
  if (!(visita.importe > 0)) return null;
  const nombres = visita.trabajos.map(k => (tareas.find(t => t.clave === k) || { titulo: k }).titulo);
  if (visita.otros) nombres.push(visita.otros);
  return { fecha: visita.fecha, importe: visita.importe, categoria: 'mantenimiento', concepto: `Taller · ${nombres.join(', ')}`, fuente: 'taller', recurrente: null, ...(visita.km ? { km: visita.km } : {}), visita: visita.id };
}

/** Vehículo con las visitas aplicadas: cada tarea hecha vence de nuevo desde la última visita que la hizo. */
export function aplicarVisitas(v, visitas, conTicket = () => false) {
  const orden = [...visitas].sort((a, b) => a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0);
  const programados = v.programados.map(p => ({ ...p }));
  const tareas = v.tareas.map(t => {
    const u = orden.filter(x => x.trabajos.includes(t.clave)).pop();
    if (!u || !t.intervalo) return t;
    const i = t.intervalo, regla = { tipo: 'fecha-o-km', fecha: i.meses ? masMeses(u.fecha, i.meses) : null, km: i.km && u.km ? u.km + i.km : null };
    if (!regla.fecha && !regla.km) return t;
    const ticket = conTicket(u.id), donde = u.taller ? ` · ${u.taller}` : '';
    const p = programados.find(x => x.id === t.gasto);
    if (p) Object.assign(p, { fecha: regla.fecha || p.fecha, km: regla.km || p.km, ejemplo: false });
    const { pendiente, ...resto } = t;
    return { ...resto, regla, ejemplo: false, ultima: { fecha: u.fecha, km: u.km || null, visita: u.id },
      detalle: `Hecho ${dma(u.fecha)}${u.km ? ` · ${u.km.toLocaleString('es-ES')} km` : ''}${donde}`,
      fuente: { tipo: ticket ? 'documento' : 'manual', cita: `${ticket ? 'Ticket' : 'Visita anotada'}${donde} · ${dma(u.fecha)}` } };
  });
  return { ...v, tareas, programados };
}
