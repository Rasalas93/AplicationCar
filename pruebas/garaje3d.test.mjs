/* Pruebas de T1656: color y matrícula de cada vehículo del Garaje y un ancla 3D para cada zona que da el núcleo. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { crearApi } from '../src/nucleo/api.js';
import { repositorioLocal, almacenArchivos } from '../src/nucleo/almacen.js';
import { MODELOS, modeloDe } from '../src/app/presentadores/modelos3d.js';

const semilla = JSON.parse(fs.readFileSync(new URL('../datos/semilla.json', import.meta.url)));
const montar = () => crearApi({ semilla, repo: repositorioLocal('t:', null), archivos: almacenArchivos('t', null), hoy: () => '2026-11-11' });
const pide = (a, ruta, metodo = 'GET', cuerpo) => a.despachar({ metodo, ruta, cuerpo });

test('garaje: color y matrícula del vehículo; sin color, el de T1645 de su tipo', async () => {
  const api = montar();
  await pide(api, '/vehiculos', 'POST', { tipo: 'moto', etiqueta: 'Moto' });
  await pide(api, '/vehiculos', 'POST', { tipo: 'coche', etiqueta: 'Coche', color: '#8e0a14', matricula: ' 0000  aaa ' });
  const v = async id => (await pide(api, `/vehiculos/${id}/panel`)).cuerpo.vehiculo;
  const moto = await v('moto'), coche = await v('coche');
  assert.deepEqual([moto.pintura.color, moto.pintura.nombre, moto.matricula], ['#D4D4CF', 'Blanco Perla', '']);
  assert.deepEqual([coche.pintura.color, coche.matricula], ['#8E0A14', '0000 AAA']);
  await pide(api, '/vehiculos', 'POST', { tipo: 'coche', etiqueta: 'Otro' });
  assert.deepEqual([(await v('otro')).pintura.color, (await v('otro')).pintura.nombre], ['#1B3F86', 'Azul Cobalto']);
  assert.equal((await pide(api, '/vehiculos', 'POST', { tipo: 'moto', etiqueta: 'x', color: 'rojo' })).cuerpo.error.campo, 'color');
  assert.equal((await pide(api, '/vehiculos', 'POST', { tipo: 'moto', etiqueta: 'x', matricula: '<b>' })).cuerpo.error.campo, 'matricula');
});

test('modelos 3D: el Focus el suyo, la moto la moto, un coche el coche; cada zona del núcleo tiene su ancla', async () => {
  const api = montar();
  await pide(api, '/vehiculos', 'POST', { tipo: 'moto', etiqueta: 'Moto' });
  await pide(api, '/vehiculos', 'POST', { tipo: 'coche', etiqueta: 'Coche' });
  const vistos = [];
  for (const id of ['focus', 'moto', 'coche']) {
    const p = (await pide(api, `/vehiculos/${id}/panel`)).cuerpo, m = MODELOS[modeloDe(p.vehiculo)];
    vistos.push(m.id);
    for (const z of p.zonas) assert.ok(m.zonas[z.zona]?.rayo, `${id}: zona ${z.zona} sin ancla en ${m.id}`);
  }
  assert.deepEqual(vistos, ['focus', 'moto', 'coche']);
  assert.ok(MODELOS.moto.zonas.transmision, 'la moto tiene su cadena');
});
