/** ClienteApi: la app solo habla con el núcleo por el contrato; hoy por transporte local, mañana por HTTP. */
import { RUTAS } from '../contrato/contrato.js';

export function clienteLocal(api, vehiculoId) {
  const get = ruta => api.despachar({ ruta }).then(r => r.cuerpo);
  return {
    vehiculoId,
    panel: () => get(RUTAS.panel(vehiculoId)),
    vencimientos: () => get(RUTAS.vencimientos(vehiculoId)),
    resumenGastos: () => get(RUTAS.resumenGastos(vehiculoId)),
    documentos: () => get(RUTAS.documentos(vehiculoId)),
    anotarGasto: cuerpo => api.despachar({ metodo: 'POST', ruta: RUTAS.gastos(vehiculoId), cuerpo }),
    adjuntar: (doc, archivo) => api.despachar({ metodo: 'POST', ruta: RUTAS.archivo(vehiculoId, doc), cuerpo: { archivo } }),
    alCambiar: f => api.alCambiar(f)
  };
}
