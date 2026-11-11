/** Garaje: los vehículos (semilla + creados en el móvil) y el ensamblado de cada uno con lo guardado. */
import { TIPOS, vehiculoDesdePlantilla } from './tipos.js';
import { aplicarVisitas, gastoDeVisita } from './taller.js';

const dma = f => f ? f.split('-').reverse().join('/') : '';
const porFecha = (a, b) => a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0;
const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'vehiculo';

export function crearGaraje({ semilla, repo, archivos }) {
  const propios = () => repo.obtener('garaje', []);
  const base = id => {
    const s = semilla.vehiculos.find(v => v.id === id);
    if (s) return s;
    const d = propios().find(v => v.id === id);
    return d ? vehiculoDesdePlantilla(d, semilla.vehiculos[0]) : null;
  };

  /** Huecos de la Guantera llenos con un archivo suyo o con el ticket de una visita que los cubre. */
  function documentos(v, lista, visitas) {
    const grupos = v.documentos.grupos.map(g => ({ ...g, docs: g.docs.map(d => {
      const suyos = lista.filter(a => a.destino.tipo === 'doc' && a.destino.id === d.id);
      const deVisita = d.llenaVisita ? lista.filter(a => a.destino.tipo === 'visita' && visitas.some(x => x.id === a.destino.id && (d.llenaVisita === '*' || x.trabajos.includes(d.llenaVisita)))) : [];
      const usados = suyos.length ? suyos : deVisita;
      if (!usados.length) return { ...d, archivos: [] };
      const u = usados[usados.length - 1], n = usados.length > 1 ? ` · ${usados.length} archivos` : '';
      const meta = suyos.length ? (u.meta || `${dma(u.fecha)} · guardado en el móvil`) + n : `Ticket de taller · ${dma(u.fecha)}${n}`;
      return { ...d, falta: false, tipo: u.tipo, meta, propio: true, archivos: usados.map(a => a.id) };
    }) }));
    return { ...v.documentos, grupos };
  }

  /** Vehículo = base + gastos propios + visitas de taller + archivos del móvil. */
  function vehiculo(id) {
    const b = base(id);
    if (!b) return null;
    const visitas = repo.obtener(`${id}:visitas`, []), lista = archivos.listar(id);
    const v = aplicarVisitas(b, visitas, vid => lista.some(a => a.destino.tipo === 'visita' && a.destino.id === vid));
    const anotados = repo.obtener(`${id}:gastos`, []), deTaller = visitas.map(x => gastoDeVisita(x, b.tareas)).filter(Boolean);
    const gastos = [...b.gastos, ...anotados, ...deTaller].sort(porFecha);
    const lecturas = [...anotados.map(g => ({ km: g.km, fecha: g.fecha, fuente: 'Anotado a mano' })), ...visitas.map(x => ({ km: x.km, fecha: x.fecha, fuente: `Taller · ${dma(x.fecha)}` }))].filter(l => l.km);
    const mayor = lecturas.sort((x, y) => y.km - x.km)[0];
    const odometro = mayor && mayor.km > b.odometro.km ? mayor : b.odometro;
    return { ...v, gastos, odometro, visitas: [...visitas].sort(porFecha), archivos: lista, documentos: documentos(v, lista, visitas) };
  }

  return {
    vehiculo,
    /** Resumen de todos los vehículos, el de la semilla primero. */
    lista() {
      return [...semilla.vehiculos.map(v => ({ ...v, tipo: v.tipo || 'coche' })), ...propios()].map(v => ({ id: v.id, tipo: v.tipo, etiqueta: v.etiqueta, marca: v.marca || '', modelo: v.modelo || TIPOS[v.tipo]?.nombre || '', anio: v.anio || null, km: vehiculo(v.id).odometro.km }));
    },
    /** Crea un vehículo desde la plantilla de su tipo. Devuelve el error (campo) o el vehículo. */
    crear(c, hoy) {
      if (!c || !TIPOS[c.tipo]) return { error: 'tipo' };
      const etiqueta = (c.etiqueta || '').trim();
      if (!etiqueta || etiqueta.length > 40) return { error: 'etiqueta' };
      if (c.km != null && !(c.km >= 0)) return { error: 'km' };
      if (c.anio != null && !(c.anio >= 1900 && c.anio <= 2100)) return { error: 'anio' };
      if (c.color && !/^#[0-9a-f]{6}$/i.test(c.color)) return { error: 'color' };
      const matricula = (c.matricula || '').trim().toUpperCase().replace(/\s+/g, ' ');
      if (matricula && !/^[A-Z0-9 -]{2,10}$/.test(matricula)) return { error: 'matricula' };
      const usados = new Set(this.lista().map(v => v.id));
      let id = slug(etiqueta), n = 2;
      while (usados.has(id)) id = `${slug(etiqueta)}-${n++}`;
      const d = { id, tipo: c.tipo, etiqueta, marca: (c.marca || '').trim(), modelo: (c.modelo || '').trim(), anio: c.anio || null, km: c.km || 0, creado: hoy, ...(c.color && { color: c.color.toUpperCase() }), ...(matricula && { matricula }) };
      repo.guardar('garaje', [...propios(), d]);
      return { vehiculo: d };
    }
  };
}
