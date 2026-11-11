/** Plantillas por tipo de vehículo: tareas con intervalo, huecos de la Guantera, ficha y presentador. Un tipo nuevo es un dato. */
const ORIENTATIVO = cita => ({ tipo: 'orientativo', cita });
const PIDE = 'Anota la última vez';
const tarea = (clave, titulo, zona, detalle, intervalo, cita) => ({ clave, titulo, zona, detalle, intervalo, regla: { tipo: 'sin-dato' }, pendiente: PIDE, fuente: ORIENTATIVO(cita) });
const aMano = (clave, titulo, zona, pendiente) => ({ clave, titulo, zona, detalle: 'Sin fecha todavía', regla: { tipo: 'sin-dato' }, pendiente, fuente: { tipo: 'pendiente', cita: 'Falta el documento' } });
const COMUNES = [aMano('itv', 'ITV', 'itv', 'Anota la fecha de la próxima ITV'), aMano('seguro', 'Seguro', 'seguro', 'Anota el vencimiento'), aMano('ivtm', 'IVTM', 'impuestos', 'Anota el recibo')];

const DOCUMENTOS = () => ({ grupos: [
  { nombre: 'Tráfico', docs: [{ id: 'permiso', nombre: 'Permiso de circulación', meta: 'Obligatorio a bordo', falta: true }, { id: 'tarjeta', nombre: 'Tarjeta ITV', meta: 'Obligatoria a bordo', falta: true }] },
  { nombre: 'Seguro e impuestos', docs: [{ id: 'seguro', nombre: 'Póliza del seguro', meta: 'Vencimiento y asistencia', falta: true }, { id: 'ivtm', nombre: 'Recibo del IVTM', meta: 'Cierra el aviso anual', falta: true }] },
  { nombre: 'Mantenimiento', docs: [{ id: 'libro', nombre: 'Libro o facturas de taller', meta: 'Prueba de lo hecho', falta: true, llenaVisita: '*' }, { id: 'manual', nombre: 'Manual del propietario', meta: 'Intervalos y presiones', falta: true }] }
] });

const FICHA = () => [
  { grupo: 'Vehículo', campos: [['motor', 'Motor'], ['neumaticos', 'Neumáticos'], ['aceite', 'Aceite y capacidad'], ['presiones', 'Presiones']].map(([clave, etiqueta]) => ({ clave, etiqueta, valor: '' })) },
  { grupo: 'Contactos', campos: [['taller', 'Taller'], ['seguro', 'Asistencia del seguro'], ['grua', 'Grúa']].map(([clave, etiqueta]) => ({ clave, etiqueta, valor: '', tel: true })) }
];

export const TIPOS = Object.freeze({
  coche: {
    nombre: 'Coche', presentador: 'silueta', color: '#5B6B82', kmDia: 33,
    tareas: () => [
      tarea('aceite', 'Aceite y filtros', 'motor', '1 año o 15.000 km', { meses: 12, km: 15000 }, 'RACE [M1]: 1 año o 15.000 km; manda el manual'),
      tarea('frenos', 'Líquido de frenos', 'frenos', 'Cada 2 años', { meses: 24 }, 'RACE [M3]: cada 2 años'),
      tarea('neumaticos', 'Neumáticos', 'ruedas', 'Unos 40.000 km', { km: 40000 }, 'RACE [M10]: 40.000-50.000 km'),
      ...COMUNES
    ],
    consejo: { fuente: 'DGT', texto: 'Revisa la presión de los neumáticos en frío una vez al mes.' }
  },
  moto: {
    nombre: 'Moto', presentador: 'silueta', color: '#C8402E', kmDia: 14,
    tareas: () => [
      tarea('aceite', 'Aceite y filtro', 'motor', '1 año o 6.000 km', { meses: 12, km: 6000 }, 'Orientativo para motos; manda el manual'),
      tarea('cadena', 'Kit de arrastre', 'transmision', 'Engrase cada 1.000 km · cambio unos 20.000 km', { km: 20000 }, 'Orientativo para motos; manda el manual'),
      tarea('frenos', 'Líquido de frenos', 'frenos', 'Cada 2 años', { meses: 24 }, 'RACE [M3]: cada 2 años'),
      tarea('neumaticos', 'Neumáticos', 'ruedas', 'Unos 12.000 km', { km: 12000 }, 'Orientativo para motos; manda el manual'),
      ...COMUNES
    ],
    consejo: { fuente: 'DGT', texto: 'Casco homologado y abrochado siempre, también en trayectos cortos.' }
  }
});

/** Vehículo completo desde la plantilla de su tipo; `base` aporta lo común (precio del litro). */
export function vehiculoDesdePlantilla(d, base = {}) {
  const T = TIPOS[d.tipo] || TIPOS.coche;
  return {
    id: d.id, tipo: d.tipo, etiqueta: d.etiqueta, presentador: T.presentador, marca: d.marca || '', modelo: d.modelo || T.nombre, version: d.version || '', anio: d.anio || null, matricula: '',
    motor: null, pintura: { nombre: '', color: d.color || T.color, confirmado: false },
    odometro: { km: d.km || 0, fecha: d.creado, fuente: 'Anotado a mano' }, kmDia: T.kmDia, kmDiaFuente: 'Ejemplo hasta tener dos lecturas',
    consumo: null, tareas: T.tareas(), gastos: [], programados: [], precioLitro: base.precioLitro || null,
    documentos: DOCUMENTOS(), ficha: FICHA(), consejo: T.consejo, propio: true
  };
}
