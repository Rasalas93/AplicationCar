/** Contrato entre núcleo y app: lo único que comparten (rutas, estados, formas de las respuestas). */

/** Estado de un vencimiento: lo calcula el núcleo; el color lo pone la skin. */
export const ESTADOS = Object.freeze({ VENCIDO: 'vencido', PROXIMO: 'proximo', A_VERIFICAR: 'a-verificar', AL_DIA: 'al-dia' });

/** Color semántico de una zona del coche (regla T1624: rojo = vence en la ventana, ámbar = falta dato). */
export const NIVEL = Object.freeze({ ROJO: 'rojo', AMBAR: 'ambar', VERDE: 'verde' });

export const RUTAS = Object.freeze({
  vehiculos: () => '/vehiculos',
  activo: id => `/vehiculos/${id}/activo`,
  panel: id => `/vehiculos/${id}/panel`,
  vencimientos: id => `/vehiculos/${id}/vencimientos`,
  gastos: id => `/vehiculos/${id}/gastos`,
  resumenGastos: id => `/vehiculos/${id}/gastos/resumen`,
  documentos: id => `/vehiculos/${id}/documentos`,
  archivo: (id, doc) => `/vehiculos/${id}/documentos/${doc}/archivo`,
  archivos: id => `/vehiculos/${id}/archivos`,
  adjunto: (id, a) => `/vehiculos/${id}/archivos/${a}`,
  taller: id => `/vehiculos/${id}/taller`,
  ticket: (id, visita) => `/vehiculos/${id}/taller/${visita}/archivo`,
  ficha: id => `/vehiculos/${id}/ficha`
});

/**
 * @typedef {{ clave: string, titulo: string, zona: string|null, detalle: string, estado: string, nivel: string,
 *   vence: { fecha: string|null, km: number|null, por: 'fecha'|'km'|null } | null,
 *   faltan: { dias: number|null, km: number|null } | null, pendiente?: string, ejemplo?: boolean, fuente: object }} Vencimiento
 * @typedef {{ zona: string, nivel: string, claves: string[] }} Zona
 * @typedef {{ id: string, clave: string, nombre: string, tipo: 'pdf'|'foto'|'archivo', mime: string, tamano: number|null, fecha: string|null,
 *   destino: { tipo: 'vehiculo'|'doc'|'visita', id?: string } }} Archivo
 * @typedef {{ id: string, fecha: string, km: number|null, taller: string, trabajos: string[], otros: string, importe: number|null, notas: string }} Visita
 * @typedef {{ metodo: 'GET'|'POST'|'DELETE', ruta: string, cuerpo?: object, consulta?: object }} Peticion
 * @typedef {{ estado: number, cuerpo: object }} Respuesta
 */
