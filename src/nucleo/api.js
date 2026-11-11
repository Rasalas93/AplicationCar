/** Única entrada al núcleo: enruta, valida, llama a reglas, gastos, garaje, taller y archivos, y avisa con «cambio». */
import { RUTAS } from '../contrato/contrato.js';
import { proximosVencimientos, zonas, cuenta } from './reglas.js';
import { Prevision as P } from './gastos.js';
import { masMeses } from './fechas.js';
import { crearGaraje } from './garaje.js';
import { registroArchivos } from './archivos.js';
import { migrar } from './migracion.js';
import { validarVisita } from './taller.js';
import { fichaDe, validarCampo } from './ficha.js';

const CATEGORIAS = ['combustible', 'mantenimiento', 'seguro', 'impuestos', 'itv', 'peajes', 'multas', 'otros'];
const invalido = campo => ({ _estado: 422, error: { codigo: 'dato-invalido', campo } });

/** Crea el API local; `hoy` es una función para poder fijar la fecha en pruebas y demos. */
export function crearApi({ semilla, repo, archivos, hoy }) {
  const oyentes = new Set();
  migrar(repo, semilla.vehiculos.map(v => v.id));
  const registro = registroArchivos(repo, archivos), garaje = crearGaraje({ semilla, repo, archivos: registro });
  const vehiculo = id => garaje.vehiculo(id);
  const resumenVehiculo = v => ({ id: v.id, tipo: v.tipo || 'coche', etiqueta: v.etiqueta, marca: v.marca, modelo: v.modelo, version: v.version, anio: v.anio });

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
      vehiculo: { ...resumenVehiculo(v), presentador: v.presentador || 'silueta', matricula: v.matricula, pintura: v.pintura, motor: v.motor, odometro: v.odometro, kmDia: v.kmDia },
      ...venc, zonas: zs, cuenta: cuenta(zs), consumo: v.consumo,
      gastosMes: { gastado: g.prevision.gastado, central: g.prevision.central, min: g.prevision.min, max: g.prevision.max, mediaMes: g.medias.total.mes },
      documentos: resumenDocumentos(v), consejo: v.consejo, visitas: v.visitas.length
    };
  }

  function validarGasto(c) {
    if (!c || !(c.importe > 0)) return 'importe';
    if (!CATEGORIAS.includes(c.categoria)) return 'categoria';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c.fecha || '')) return 'fecha';
    if (c.km != null && !(c.km > 0)) return 'km';
    return null;
  }

  function taller(v, h) {
    const venc = proximosVencimientos(v, h).vencimientos;
    const visitas = [...v.visitas].reverse().map(x => ({ ...x, archivos: v.archivos.filter(a => a.destino.tipo === 'visita' && a.destino.id === x.id) }));
    return {
      vehiculo: resumenVehiculo(v), odometro: v.odometro, visitas,
      tareas: v.tareas.filter(t => t.intervalo).map(t => ({ clave: t.clave, titulo: t.titulo, zona: t.zona, ultima: t.ultima || null, vencimiento: venc.find(x => x.clave === t.clave) })),
      resumen: { visitas: visitas.length, total: Math.round(visitas.reduce((s, x) => s + (x.importe || 0), 0) * 100) / 100, ultima: visitas[0] ? visitas[0].fecha : null }
    };
  }

  const rutas = [
    ['GET', /^\/vehiculos$/, () => ({ vehiculos: garaje.lista(), activo: repo.obtener('activo', semilla.vehiculos[0].id) }), true],
    ['POST', /^\/vehiculos$/, (_, h, c) => { const r = garaje.crear(c, h); return r.error ? invalido(r.error) : { _estado: 201, vehiculo: r.vehiculo }; }, true],
    ['POST', /^\/vehiculos\/([\w-]+)\/activo$/, (v, h, c, id) => { repo.guardar('activo', id); return { activo: id }; }],
    ['GET', /^\/vehiculos\/([\w-]+)\/panel$/, (v, h) => panel(v, h)],
    ['GET', /^\/vehiculos\/([\w-]+)\/vencimientos$/, (v, h) => { const r = proximosVencimientos(v, h); return { ...r, zonas: zonas(r.vencimientos) }; }],
    ['GET', /^\/vehiculos\/([\w-]+)\/gastos\/resumen$/, (v, h) => resumenGastos(v, h)],
    ['GET', /^\/vehiculos\/([\w-]+)\/documentos$/, v => ({ vehiculo: resumenVehiculo(v), ...v.documentos, resumen: resumenDocumentos(v), archivos: v.archivos.filter(a => a.destino.tipo === 'vehiculo') })],
    ['POST', /^\/vehiculos\/([\w-]+)\/gastos$/, (v, h, c, id) => {
      const g = { fecha: h, fuente: 'manual', recurrente: null, ...c, importe: Math.round(c.importe * 100) / 100 };
      const err = validarGasto(g);
      if (err) return invalido(err);
      repo.guardar(`${id}:gastos`, [...repo.obtener(`${id}:gastos`, []), g]);
      return { _estado: 201, gasto: g, recalculado: ['gastos', 'prevision', 'vencimientos'] };
    }],
    ['POST', /^\/vehiculos\/([\w-]+)\/documentos\/([\w-]+)\/archivo$/, async (v, h, c, id, doc) => {
      if (!c || !c.archivo) return invalido('archivo');
      if (!v.documentos.grupos.some(g => g.docs.some(d => d.id === doc))) return { _estado: 404, error: { codigo: 'no-existe', campo: 'documento' } };
      const a = await registro.adjuntar(id, { tipo: 'doc', id: doc }, c.archivo, { nombre: c.nombre, hoy: h });
      return { _estado: 201, documento: doc, archivo: a };
    }],
    ['GET', /^\/vehiculos\/([\w-]+)\/archivos$/, v => ({ archivos: v.archivos })],
    ['POST', /^\/vehiculos\/([\w-]+)\/archivos$/, async (v, h, c, id) => {
      if (!c || !c.archivo) return invalido('archivo');
      const a = await registro.adjuntar(id, { tipo: 'vehiculo' }, c.archivo, { nombre: c.nombre, hoy: h });
      return { _estado: 201, archivo: a };
    }],
    ['GET', /^\/vehiculos\/([\w-]+)\/archivos\/([\w-]+)$/, async (v, h, c, id, aid) => (await registro.leer(id, aid)) || { _estado: 404, error: { codigo: 'no-existe', campo: 'archivo' } }],
    ['DELETE', /^\/vehiculos\/([\w-]+)\/archivos\/([\w-]+)$/, async (v, h, c, id, aid) => { const a = await registro.borrar(id, aid); return a ? { borrado: a.id } : { _estado: 404, error: { codigo: 'no-existe', campo: 'archivo' } }; }],
    ['GET', /^\/vehiculos\/([\w-]+)\/taller$/, (v, h) => taller(v, h)],
    ['POST', /^\/vehiculos\/([\w-]+)\/taller$/, async (v, h, c, id) => {
      const x = { fecha: h, trabajos: [], ...c }, err = validarVisita(x);
      if (err) return invalido(err);
      if (x.trabajos.some(k => !v.tareas.some(t => t.clave === k))) return invalido('trabajos');
      const visita = { id: `t${Date.now().toString(36)}${repo.obtener(`${id}:visitas`, []).length}`, fecha: x.fecha, km: x.km || null, taller: (x.taller || '').trim(), trabajos: x.trabajos, otros: (x.otros || '').trim(), importe: x.importe != null ? Math.round(x.importe * 100) / 100 : null, notas: (x.notas || '').trim() };
      repo.guardar(`${id}:visitas`, [...repo.obtener(`${id}:visitas`, []), visita]);
      const archivo = c.archivo ? await registro.adjuntar(id, { tipo: 'visita', id: visita.id }, c.archivo, { nombre: c.nombre, hoy: h }) : null;
      return { _estado: 201, visita, archivo, actualizadas: visita.trabajos.filter(k => v.tareas.find(t => t.clave === k).intervalo), recalculado: ['vencimientos', 'gastos', 'documentos'] };
    }],
    ['POST', /^\/vehiculos\/([\w-]+)\/taller\/([\w-]+)\/archivo$/, async (v, h, c, id, vid) => {
      if (!c || !c.archivo) return invalido('archivo');
      if (!v.visitas.some(x => x.id === vid)) return { _estado: 404, error: { codigo: 'no-existe', campo: 'visita' } };
      return { _estado: 201, archivo: await registro.adjuntar(id, { tipo: 'visita', id: vid }, c.archivo, { nombre: c.nombre, hoy: h }) };
    }],
    ['GET', /^\/vehiculos\/([\w-]+)\/ficha$/, (v, h, c, id) => ({ vehiculo: resumenVehiculo(v), ...fichaDe(v, repo.obtener(`${id}:ficha`, {})) })],
    ['POST', /^\/vehiculos\/([\w-]+)\/ficha$/, (v, h, c, id) => {
      const err = validarCampo(c);
      if (err) return invalido(err);
      const campo = (v.ficha || []).flatMap(g => g.campos).find(x => x.clave === c.clave);
      if (!campo) return invalido('clave');
      repo.guardar(`${id}:ficha`, { ...repo.obtener(`${id}:ficha`, {}), [c.clave]: { valor: c.valor.trim(), fuente: c.valor.trim() ? c.fuente : null, fecha: h } });
      return { _estado: 201, clave: c.clave };
    }]
  ];

  return {
    RUTAS,
    /** @param {import('../contrato/contrato.js').Peticion} p */
    async despachar({ metodo = 'GET', ruta, cuerpo }) {
      for (const [m, re, f, global] of rutas) {
        const x = m === metodo && ruta.match(re);
        if (!x) continue;
        const v = global ? null : vehiculo(x[1]);
        if (!global && !v) return { estado: 404, cuerpo: { error: { codigo: 'no-existe', campo: 'vehiculo' } } };
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
