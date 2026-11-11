/** ClienteApi: la app solo habla con el núcleo por el contrato; hoy por transporte local, mañana por HTTP. */
import { RUTAS } from '../contrato/contrato.js';

export function clienteLocal(api, inicial) {
  let id = inicial;
  const get = ruta => api.despachar({ ruta }).then(r => r.cuerpo);
  const post = (ruta, cuerpo) => api.despachar({ metodo: 'POST', ruta, cuerpo });
  return {
    get vehiculoId() { return id; },
    /** Cambia el vehículo activo (lo recuerda el núcleo). */
    usar: nuevo => { id = nuevo; return post(RUTAS.activo(nuevo)); },
    vehiculos: () => get(RUTAS.vehiculos()),
    crearVehiculo: cuerpo => post(RUTAS.vehiculos(), cuerpo),
    panel: () => get(RUTAS.panel(id)),
    vencimientos: () => get(RUTAS.vencimientos(id)),
    resumenGastos: () => get(RUTAS.resumenGastos(id)),
    documentos: () => get(RUTAS.documentos(id)),
    anotarGasto: cuerpo => post(RUTAS.gastos(id), cuerpo),
    adjuntar: (doc, archivo) => post(RUTAS.archivo(id, doc), { archivo, nombre: archivo.name }),
    adjuntarVehiculo: archivo => post(RUTAS.archivos(id), { archivo, nombre: archivo.name }),
    archivos: () => get(RUTAS.archivos(id)),
    leerArchivo: a => get(RUTAS.adjunto(id, a)),
    borrarArchivo: a => api.despachar({ metodo: 'DELETE', ruta: RUTAS.adjunto(id, a) }),
    taller: () => get(RUTAS.taller(id)),
    anotarVisita: cuerpo => post(RUTAS.taller(id), cuerpo),
    adjuntarTicket: (visita, archivo) => post(RUTAS.ticket(id, visita), { archivo, nombre: archivo.name }),
    ficha: () => get(RUTAS.ficha(id)),
    editarFicha: cuerpo => post(RUTAS.ficha(id), cuerpo),
    alCambiar: f => api.alCambiar(f)
  };
}
