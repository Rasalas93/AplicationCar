/** Dónde está cada zona en el coche genérico (metros, ejes glTF: x adelante, y arriba, z derecha). Se busca la pieza con un rayo. */
export const ZONAS_COCHE = {
  motor: { nombre: 'Motor', rayo: [[1.6, 3, -0.1], [0, -1, 0]] },
  frenos: { nombre: 'Frenos', rayo: [[1.45, 0.42, -3], [0, 0, 1]] },
  ruedas: { nombre: 'Neumáticos', rayo: [[-1.56, 0.5, -3], [0, 0, 1]] },
  itv: { nombre: 'Parabrisas', rayo: [[0.6, 3, 0.3], [0, -1, 0]] },
  impuestos: { nombre: 'Papeles', rayo: [[-4, 0.9, 0.42], [1, 0, 0]] },
  seguro: { nombre: 'Seguro', rayo: [[0.3, 0.75, -3], [0, 0, 1]] }
};
