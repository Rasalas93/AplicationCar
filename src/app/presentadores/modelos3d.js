/** Modelo 3D de cada vehículo: GLB, zonas, material de pintura y encuadre (objetivo de la cámara, media longitud en metros y dirección de la vista de entrada). */
import { ZONAS_FOCUS } from './zonas-focus.js';
import { ZONAS_COCHE } from './zonas-coche.js';
import { ZONAS_MOTO } from './zonas-moto.js';

export const MODELOS = Object.freeze({
  focus: { id: 'focus', glb: 'modelo/focus.glb', zonas: ZONAS_FOCUS, pintura: { material: 'paint', metal: 0.62, rugosidad: 0.3 }, objetivo: [0.05, 0.78, 0], mitad: 2.3 },
  coche: { id: 'coche', glb: 'modelo/coche.glb', zonas: ZONAS_COCHE, pintura: { material: 'paint_coche', metal: 0.62, rugosidad: 0.3 }, objetivo: [0, 0.8, 0], mitad: 2.32 },
  moto: { id: 'moto', glb: 'modelo/moto.glb', zonas: ZONAS_MOTO, pintura: { material: 'paint_moto', metal: 0.25, rugosidad: 0.28 }, acento: 'paint_accent', objetivo: [-0.05, 0.58, 0], mitad: 1.36, vista: [2.6, 1.4, -8] }
});

/** El Focus lleva el suyo; los demás, el genérico de su tipo. */
export const modeloDe = v => v.presentador === 'focus3d' ? 'focus' : v.tipo === 'moto' ? 'moto' : 'coche';
