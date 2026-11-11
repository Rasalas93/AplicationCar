/** Dónde está cada zona en el Focus (metros, ejes glTF: x adelante, y arriba, z derecha). Se busca la chapa con un rayo. */
export const ZONAS_FOCUS = {
  motor: { nombre: 'Motor', rayo: [[1.5, 3, -0.05], [0, -1, 0]] },
  distribucion: { nombre: 'Distribución', rayo: [[1.88, 3, 0.5], [0, -1, 0]] },
  itv: { nombre: 'Parabrisas', rayo: [[0.4, 3, 0.36], [0, -1, 0]] },
  impuestos: { nombre: 'Papeles', rayo: [[-4, 0.9, 0.42], [1, 0, 0]] },
  seguro: { nombre: 'Seguro', rayo: [[0.25, 0.75, -3], [0, 0, 1]] }
};
