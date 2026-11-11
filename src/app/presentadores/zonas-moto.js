/** Dónde está cada zona en la moto genérica (metros, ejes glTF: x adelante, y arriba, z derecha). Se busca la pieza con un rayo. */
export const ZONAS_MOTO = {
  motor: { nombre: 'Motor', rayo: [[0.12, 0.6, -3], [0, 0, 1]] },
  transmision: { nombre: 'Cadena', rayo: [[-0.45, 0.43, -3], [0, 0, 1]] },
  frenos: { nombre: 'Frenos', rayo: [[0.615, 0.27, -3], [0, 0, 1]] },
  ruedas: { nombre: 'Neumáticos', rayo: [[-0.95, 0.2, -3], [0, 0, 1]] },
  itv: { nombre: 'Faro', rayo: [[0.6, 0.9, -3], [0, 0, 1]] },
  seguro: { nombre: 'Depósito', rayo: [[0.05, 0.92, -3], [0, 0, 1]] },
  impuestos: { nombre: 'Papeles', rayo: [[-0.6, 0.8, -3], [0, 0, 1]] }
};
