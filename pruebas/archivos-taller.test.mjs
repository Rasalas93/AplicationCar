/* Pruebas de T1642: archivos adjuntos, historial de taller, datos útiles, varios vehículos y migración v1 → v2. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { crearApi } from '../src/nucleo/api.js';
import { repositorioLocal, almacenArchivos } from '../src/nucleo/almacen.js';
import { migrar } from '../src/nucleo/migracion.js';
import { aplicarVisitas } from '../src/nucleo/taller.js';

const semilla = JSON.parse(fs.readFileSync(new URL('../datos/semilla.json', import.meta.url)));
const HOY = '2026-11-11';
const montar = (repo = repositorioLocal('t:', null), archivos = almacenArchivos('t', null)) => ({ repo, archivos, api: crearApi({ semilla, repo, archivos, hoy: () => HOY }) });
const pide = (a, ruta, metodo = 'GET', cuerpo) => a.despachar({ metodo, ruta, cuerpo });
const blob = (type, size = 1234, name) => ({ type, size, name });
const hueco = (docs, id) => docs.grupos.flatMap(g => g.docs).find(d => d.id === id);
const zona = (p, z) => p.zonas.find(x => x.zona === z);

test('archivos: adjuntar al vehículo, listar, leer y borrar', async () => {
  const { api } = montar();
  const r = await pide(api, '/vehiculos/focus/archivos', 'POST', { archivo: blob('image/jpeg', 2048, 'salpicadero.jpg'), nombre: 'salpicadero.jpg' });
  assert.equal(r.estado, 201);
  assert.deepEqual([r.cuerpo.archivo.tipo, r.cuerpo.archivo.tamano, r.cuerpo.archivo.fecha, r.cuerpo.archivo.destino.tipo], ['foto', 2048, HOY, 'vehiculo']);
  const id = r.cuerpo.archivo.id;
  assert.equal((await pide(api, '/vehiculos/focus/documentos')).cuerpo.archivos.length, 1);
  const leido = (await pide(api, `/vehiculos/focus/archivos/${id}`)).cuerpo;
  assert.equal(leido.blob.name, 'salpicadero.jpg');
  assert.equal((await pide(api, `/vehiculos/focus/archivos/${id}`, 'DELETE')).estado, 200);
  assert.equal((await pide(api, '/vehiculos/focus/archivos')).cuerpo.archivos.length, 0);
  assert.equal((await pide(api, `/vehiculos/focus/archivos/${id}`)).estado, 404);
});

test('archivos: llenar un hueco quita su «falta»; borrar el último lo devuelve', async () => {
  const { api } = montar();
  const r = await pide(api, '/vehiculos/focus/documentos/permiso/archivo', 'POST', { archivo: blob('application/pdf') });
  let d = (await pide(api, '/vehiculos/focus/documentos')).cuerpo;
  assert.deepEqual([hueco(d, 'permiso').falta, hueco(d, 'permiso').tipo, d.resumen.faltan, d.resumen.aBordo], [false, 'pdf', 5, 0]);
  await pide(api, `/vehiculos/focus/archivos/${r.cuerpo.archivo.id}`, 'DELETE');
  d = (await pide(api, '/vehiculos/focus/documentos')).cuerpo;
  assert.deepEqual([hueco(d, 'permiso').falta, d.resumen.faltan], [true, 6]);
  assert.equal((await pide(api, '/vehiculos/focus/documentos/nada/archivo', 'POST', { archivo: blob('image/png') })).estado, 404);
});

test('taller: una visita de aceite mueve su vencimiento, pone verde la zona y entra en Gastos', async () => {
  const { api } = montar(); let avisos = 0;
  api.alCambiar(() => avisos++);
  assert.equal(zona((await pide(api, '/vehiculos/focus/panel')).cuerpo, 'motor').nivel, 'rojo');
  const r = await pide(api, '/vehiculos/focus/taller', 'POST', { fecha: HOY, km: 165500, taller: 'Taller de ejemplo', trabajos: ['aceite'], importe: 129.9, archivo: blob('image/jpeg', 900, 'ticket.jpg') });
  assert.equal(r.estado, 201);
  assert.deepEqual(r.cuerpo.actualizadas, ['aceite']);
  const p = (await pide(api, '/vehiculos/focus/panel')).cuerpo, aceite = p.vencimientos.find(v => v.clave === 'aceite');
  assert.deepEqual([aceite.vence.fecha, aceite.vence.km, aceite.nivel, aceite.ejemplo, aceite.fuente.tipo], ['2027-11-11', 185500, 'verde', false, 'documento']);
  assert.equal(zona(p, 'motor').nivel, 'verde');
  assert.deepEqual(p.cuenta, { rojo: 1, ambar: 1, verde: 3 });
  assert.equal(p.vehiculo.odometro.km, 165500);
  assert.equal(p.gastosMes.gastado, 188.75);
  const g = (await pide(api, '/vehiculos/focus/gastos/resumen')).cuerpo;
  assert.ok(g.gastos.some(x => x.categoria === 'mantenimiento' && x.importe === 129.9 && x.fuente === 'taller'));
  assert.deepEqual([g.programados.find(x => x.id === 'aceite-2027').fecha, g.programados.find(x => x.id === 'aceite-2027').km], ['2027-11-11', 185500]);
  const t = (await pide(api, '/vehiculos/focus/taller')).cuerpo;
  assert.deepEqual([t.resumen.visitas, t.resumen.total, t.visitas[0].archivos.length], [1, 129.9, 1]);
  assert.equal(avisos, 1);
});

test('taller: la correa con ticket pasa de ámbar a verde y llena los huecos de factura y libro', async () => {
  const { api } = montar();
  await pide(api, '/vehiculos/focus/taller', 'POST', { fecha: '2026-11-05', km: 165400, taller: 'Taller de ejemplo', trabajos: ['correa'], importe: 480, archivo: blob('application/pdf') });
  const p = (await pide(api, '/vehiculos/focus/panel')).cuerpo, c = p.vencimientos.find(v => v.clave === 'correa');
  assert.deepEqual([zona(p, 'distribucion').nivel, c.vence.fecha, c.vence.km], ['verde', '2036-11-05', 315400]);
  const d = (await pide(api, '/vehiculos/focus/documentos')).cuerpo;
  assert.deepEqual([hueco(d, 'correa').falta, hueco(d, 'libro').falta, d.resumen.faltan], [false, false, 4]);
});

test('taller: sin trabajos o con un trabajo que el vehículo no tiene, no se guarda', async () => {
  const { api } = montar();
  assert.equal((await pide(api, '/vehiculos/focus/taller', 'POST', { fecha: HOY, km: 165500 })).cuerpo.error.campo, 'trabajos');
  assert.equal((await pide(api, '/vehiculos/focus/taller', 'POST', { fecha: HOY, trabajos: ['cadena'] })).cuerpo.error.campo, 'trabajos');
  assert.equal((await pide(api, '/vehiculos/focus/taller', 'POST', { fecha: '11/11/2026', trabajos: ['aceite'] })).cuerpo.error.campo, 'fecha');
  const solo = aplicarVisitas(semilla.vehiculos[0], [{ id: 'x', fecha: HOY, km: null, trabajos: ['aceite'] }]);
  assert.deepEqual(solo.tareas.find(t => t.clave === 'aceite').regla, { tipo: 'fecha-o-km', fecha: '2027-11-11', km: null });
});

test('migración v1 → v2: gastos y documentos del móvil siguen ahí, sin duplicar', async () => {
  const repo = repositorioLocal('t:', null), archivos = almacenArchivos('t', null);
  repo.guardar('focus:gastos', [{ fecha: '2026-11-10', importe: 30, categoria: 'combustible', concepto: 'Gasolina 95', km: 165420, fuente: 'manual', recurrente: null }]);
  repo.guardar('focus:documentos', { seguro: { tipo: 'pdf', meta: '10/11/2026 · guardado en el móvil' } });
  await archivos.guardar('focus:seguro', blob('application/pdf', 5000, 'poliza.pdf'));
  const { api } = montar(repo, archivos);
  assert.equal(repo.obtener('esquema'), 2);
  assert.equal(migrar(repo), 2);
  assert.equal(repo.obtener('focus:archivos').length, 1);
  const d = (await pide(api, '/vehiculos/focus/documentos')).cuerpo, s = hueco(d, 'seguro');
  assert.deepEqual([s.falta, s.tipo, s.meta, d.resumen.faltan], [false, 'pdf', '10/11/2026 · guardado en el móvil', 5]);
  assert.equal((await pide(api, `/vehiculos/focus/archivos/${s.archivos[0]}`)).cuerpo.blob.size, 5000);
  const p = (await pide(api, '/vehiculos/focus/panel')).cuerpo;
  assert.deepEqual([p.vehiculo.odometro.km, p.gastosMes.gastado], [165420, 88.85]);
  assert.equal((await pide(api, '/vehiculos')).cuerpo.activo, 'focus');
});

test('varios vehículos: una moto con su plantilla, el Focus primero y los datos separados', async () => {
  const { api } = montar();
  const r = await pide(api, '/vehiculos', 'POST', { tipo: 'moto', etiqueta: 'Moto', marca: 'Marca', modelo: 'Trail 700', anio: 2019, km: 21000 });
  assert.equal(r.estado, 201);
  const l = (await pide(api, '/vehiculos')).cuerpo.vehiculos;
  assert.deepEqual(l.map(v => [v.id, v.tipo]), [['focus', 'coche'], ['moto', 'moto']]);
  const m = (await pide(api, '/vehiculos/moto/panel')).cuerpo;
  assert.deepEqual([m.vehiculo.tipo, m.vehiculo.presentador, m.vehiculo.matricula, m.vehiculo.odometro.km], ['moto', 'silueta', '', 21000]);
  assert.ok(m.zonas.some(z => z.zona === 'transmision'));
  assert.ok(m.zonas.every(z => z.nivel === 'ambar'), 'sin historial todo pide dato');
  await pide(api, '/vehiculos/moto/taller', 'POST', { fecha: HOY, km: 21000, trabajos: ['cadena'], importe: 160 });
  assert.equal(zona((await pide(api, '/vehiculos/moto/panel')).cuerpo, 'transmision').nivel, 'verde');
  const f = (await pide(api, '/vehiculos/focus/panel')).cuerpo;
  assert.deepEqual([f.cuenta, f.gastosMes.gastado, f.vehiculo.presentador], [{ rojo: 2, ambar: 1, verde: 2 }, 58.85, 'focus3d']);
  assert.equal((await pide(api, '/vehiculos/moto/activo', 'POST')).cuerpo.activo, 'moto');
  assert.equal((await pide(api, '/vehiculos', 'POST', { tipo: 'barco', etiqueta: 'x' })).cuerpo.error.campo, 'tipo');
  assert.equal((await pide(api, '/vehiculos', 'POST', { tipo: 'moto', etiqueta: 'Moto' })).cuerpo.vehiculo.id, 'moto-2');
});

test('datos útiles: matrícula de la semilla, cada valor con su fuente y editable', async () => {
  const { api } = montar();
  let f = (await pide(api, '/vehiculos/focus/ficha')).cuerpo;
  const campo = k => f.grupos.flatMap(g => g.campos).find(c => c.clave === k);
  assert.deepEqual([campo('matricula').valor, campo('matricula').fuente.tipo], [semilla.vehiculos[0].matricula, 'documento']);
  assert.deepEqual([campo('neumaticos').fuente.tipo, campo('aceite').fuente.tipo, campo('correa').fuente.tipo, campo('taller').fuente], ['documento', 'ejemplo', 'verbal', null]);
  assert.equal((await pide(api, '/vehiculos/focus/ficha', 'POST', { clave: 'taller', valor: '600 000 000', fuente: 'verbal' })).estado, 201);
  f = (await pide(api, '/vehiculos/focus/ficha')).cuerpo;
  assert.deepEqual([campo('taller').valor, campo('taller').fuente.tipo], ['600 000 000', 'verbal']);
  assert.equal((await pide(api, '/vehiculos/focus/ficha', 'POST', { clave: 'aceite', valor: '5W-20', fuente: 'inventado' })).cuerpo.error.campo, 'fuente');
  assert.equal((await pide(api, '/vehiculos/focus/ficha', 'POST', { clave: 'matricula', valor: '0000 XXX', fuente: 'documento' })).cuerpo.error.campo, 'clave');
});
