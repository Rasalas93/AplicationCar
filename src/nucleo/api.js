/** Única entrada al núcleo: valida, llama a reglas y gastos, guarda y avisa con «cambio». */
import { RUTAS } from '../contrato/contrato.js';
import { proximosVencimientos, zonas, cuenta } from './reglas.js';
import { Prevision as P } from './gastos.js';
import { masMeses } from './fechas.js';

const CATEGORIAS = ['combustible', 'mantenimiento', 'seguro', 'impuestos', 'itv', 'peajes', 'multas', 'otros'];

/** Crea el API local; `hoy` es una función para poder fijar la fecha en pruebas y demos. */
export function crearApi({ semilla, repo, archivos, hoy }) {
  const oyentes = new Set();
  const base = id => semilla.vehiculos.find(v => v.id === id);

  /** Vehículo = semilla + lo que el usuario guardó en el móvil. */
  function vehiculo(id) {
    const v = base(id);
    if (!v) return null;
    const propios = repo.obtener(`${id}:gastos`, []), docs = repo.obtener(`${id}:documentos`, {});
    const gastos = [...v.gastos, ...propios].sort((a, b) => a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0);
    const conKm = propios.filter(g => g.km).sort((a, b) => b.km - a.km)[0];
    const odometro = conKm && conKm.km > v.odometro.km ? { km: conKm.km, fecha: conKm.fecha, fuente: 'Anotado a mano' } : v.odometro;
    const grupos = v.documentos.grupos.map(g => ({ ...g, docs: g.docs.map(d => docs[d.id] ? { ...d, falta: false, tipo: docs[d.id].tipo, meta: docs[d.id].meta, propio: true } : d) }));
    return { ...v, gastos, odometro, documentos: { ...v.documentos, grupos } };
  }

  function resumenDocumentos(v) {
    const todos = v.documentos.grupos.flatMap(g => g.docs), esperados = todos.filter(d => !d.extra);
    const faltan = esperados.filter(d => d.falta);
    return { guardados: esperados.length - faltan.length, esperados: esperados.length, faltan: faltan.length, aBordo: faltan.filter(d => /bordo/.test(d.meta)).length };
  }

  function resumenGastos(v, h) {
    const mes = h.slice(0, 7), args = { gastos: v.gastos, programados: v.programados, hoy: h, odometro: v.odometro, kmDia: v.kmDia };
    return {
      hoy: h, vehiculo: { modelo: v.modelo, version: v.version }, precioLitro: v.precioLitro, odometro: v.odometro, kmDia: v.kmDia,
      gastos: v.gastos, programados: v.programados,
      semanas: P.semanas(v.gastos, h), medias: P.medias(v.gastos, v.programados, h), prevision: P.previsionMes(args),
      porCategoria: P.porCategoria(v.gastos, mes + '-01', h), orden: P.ordenCategorias(v.gastos),
      siguientes: [1, 2].map(n => ({ mes: masMeses(mes + '-01', n).slice(0, 7), ...P.previsionMes({ ...args, mes: masMeses(mes + '-01', n).slice(0, 7) }) })),
      repostaje: P.repetirRepostaje(v.gastos, h, v.precioLitro.valor),
      ultimoRepostaje: [...v.gastos].filter(g => g.categoria === 'combustible').pop() || null
    };
  }

  function panel(v, h) {
    const venc = proximosVencimientos(v, h), zs = zonas(venc.vencimientos), g = resumenGastos(v, h);
    return {
      vehiculo: { id: v.id, etiqueta: v.etiqueta, marca: v.marca, modelo: v.modelo, version: v.version, anio: v.anio, matricula: v.matricula, pintura: v.pintura, motor: v.motor, odometro: v.odometro, kmDia: v.kmDia },
      ...venc, zonas: zs, cuenta: cuenta(zs), consumo: v.consumo,
      gastosMes: { gastado: g.prevision.gastado, central: g.prevision.central, min: g.prevision.min, max: g.prevision.max, mediaMes: g.medias.total.mes },
      documentos: resumenDocumentos(v), consejo: v.consejo
    };
  }

  function validarGasto(c) {
    if (!c || !(c.importe > 0)) return 'importe';
    if (!CATEGORIAS.includes(c.categoria)) return 'categoria';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c.fecha || '')) return 'fecha';
    if (c.km != null && !(c.km > 0)) return 'km';
    return null;
  }

  const rutas = [
    ['GET', /^\/vehiculos\/([\w-]+)\/panel$/, (v, h) => panel(v, h)],
    ['GET', /^\/vehiculos\/([\w-]+)\/vencimientos$/, (v, h) => { const r = proximosVencimientos(v, h); return { ...r, zonas: zonas(r.vencimientos) }; }],
    ['GET', /^\/vehiculos\/([\w-]+)\/gastos\/resumen$/, (v, h) => resumenGastos(v, h)],
    ['GET', /^\/vehiculos\/([\w-]+)\/documentos$/, v => ({ ...v.documentos, resumen: resumenDocumentos(v) })],
    ['POST', /^\/vehiculos\/([\w-]+)\/gastos$/, (v, h, c, id) => {
      const g = { fecha: h, fuente: 'manual', recurrente: null, ...c, importe: Math.round(c.importe * 100) / 100 };
      const err = validarGasto(g);
      if (err) return { _estado: 422, error: { codigo: 'dato-invalido', campo: err } };
      repo.guardar(`${id}:gastos`, [...repo.obtener(`${id}:gastos`, []), g]);
      return { _estado: 201, gasto: g, recalculado: ['gastos', 'prevision', 'vencimientos'] };
    }],
    ['POST', /^\/vehiculos\/([\w-]+)\/documentos\/([\w-]+)\/archivo$/, async (v, h, c, id, doc) => {
      if (!c || !c.archivo) return { _estado: 422, error: { codigo: 'dato-invalido', campo: 'archivo' } };
      await archivos.guardar(`${id}:${doc}`, c.archivo);
      const docs = repo.obtener(`${id}:documentos`, {});
      docs[doc] = { tipo: /pdf/.test(c.archivo.type || '') ? 'pdf' : 'foto', meta: `${h.split('-').reverse().join('/')} · guardado en el móvil` };
      repo.guardar(`${id}:documentos`, docs);
      return { _estado: 201, documento: doc };
    }]
  ];

  return {
    RUTAS,
    /** @param {import('../contrato/contrato.js').Peticion} p */
    async despachar({ metodo = 'GET', ruta, cuerpo }) {
      for (const [m, re, f] of rutas) {
        const x = m === metodo && ruta.match(re);
        if (!x) continue;
        const v = vehiculo(x[1]);
        if (!v) return { estado: 404, cuerpo: { error: { codigo: 'no-existe', campo: 'vehiculo' } } };
        const r = await f(v, hoy(), cuerpo, ...x.slice(1));
        const estado = r._estado || 200;
        delete r._estado;
        if (metodo !== 'GET' && estado < 300) oyentes.forEach(o => o({ ruta, cuerpo: r }));
        return { estado, cuerpo: r };
      }
      return { estado: 404, cuerpo: { error: { codigo: 'ruta', campo: ruta } } };
    },
    alCambiar(f) { oyentes.add(f); return () => oyentes.delete(f); }
  };
}
