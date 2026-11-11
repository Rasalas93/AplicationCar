/* Pruebas del núcleo: reglas de vencimiento, zonas del coche y API local. node --test pruebas/ */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { vencimiento, proximosVencimientos, zonas, cuenta, fechaPorKm } from '../src/nucleo/reglas.js';
import { masMeses, dias } from '../src/nucleo/fechas.js';
import { crearApi } from '../src/nucleo/api.js';
import { repositorioLocal, almacenArchivos } from '../src/nucleo/almacen.js';

const semilla = JSON.parse(fs.readFileSync(new URL('../datos/semilla.json', import.meta.url)));
const FOCUS = semilla.vehiculos[0], HOY = '2026-11-11';
const ctx = { hoy: HOY, odometro: { km: 165360, fecha: '2026-11-02' }, kmDia: 14.6, horizonte: masMeses(HOY, 3) };
const api = () => crearApi({ semilla, repo: repositorioLocal('t:', null), archivos: almacenArchivos('t', null), hoy: () => HOY });

test('ventana de 3 meses: 11 nov 2026 → 11 feb 2027 (92 días)', () => {
  assert.equal(ctx.horizonte, '2027-02-11');
  assert.equal(dias(HOY, ctx.horizonte), 92);
  assert.equal(masMeses('2026-11-30', 3), '2027-02-28');
});

test('fecha o km: gana la fecha si llega antes', () => {
  const v = vencimiento({ clave: 'a', regla: { tipo: 'fecha-o-km', fecha: '2027-01-15', km: 170000 } }, ctx);
  assert.deepEqual([v.vence.fecha, v.vence.por, v.faltan.km, v.faltan.dias, v.estado, v.nivel], ['2027-01-15', 'fecha', 4640, 65, 'proximo', 'rojo']);
});

test('fecha o km: gana el km si llega antes', () => {
  assert.equal(fechaPorKm(165506, ctx.odometro, 14.6), '2026-11-12');
  const v = vencimiento({ clave: 'a', regla: { tipo: 'fecha-o-km', fecha: '2027-06-01', km: 166000 } }, ctx);
  assert.deepEqual([v.vence.por, v.vence.fecha, v.nivel], ['km', '2026-12-16', 'rojo']);
});

test('fuera de la ventana: verde; pasada: vencido y rojo', () => {
  assert.equal(vencimiento({ clave: 'itv', regla: { tipo: 'fecha', fecha: '2027-11-25' } }, ctx).nivel, 'verde');
  const v = vencimiento({ clave: 'x', regla: { tipo: 'fecha', fecha: '2026-11-01' } }, ctx);
  assert.deepEqual([v.estado, v.nivel, v.faltan.dias], ['vencido', 'rojo', -10]);
});

test('sin dato: ámbar con su pendiente; vigente sin fecha: verde', () => {
  const a = vencimiento({ clave: 'c', regla: { tipo: 'sin-dato' }, pendiente: 'Justificante pendiente' }, ctx);
  assert.deepEqual([a.estado, a.nivel, a.pendiente], ['a-verificar', 'ambar', 'Justificante pendiente']);
  assert.equal(vencimiento({ clave: 's', regla: { tipo: 'vigente' } }, ctx).nivel, 'verde');
});

test('Focus a 11/11/2026: 2 rojas, 1 ámbar, 2 verdes (como T1624), rojas primero', () => {
  const r = proximosVencimientos(FOCUS, HOY), zs = zonas(r.vencimientos);
  assert.deepEqual(cuenta(zs), { rojo: 2, ambar: 1, verde: 2 });
  assert.deepEqual(r.vencimientos.map(v => v.clave), ['ivtm', 'aceite', 'correa', 'itv', 'seguro']);
  assert.equal(r.vencimientos[0].faltan.dias, 51);
});

test('una zona toma el peor nivel de sus tareas', () => {
  const zs = zonas([{ zona: 'motor', nivel: 'verde', clave: 'a' }, { zona: 'motor', nivel: 'rojo', clave: 'b' }, { zona: 'motor', nivel: 'ambar', clave: 'c' }, { zona: null, nivel: 'rojo', clave: 'd' }]);
  assert.deepEqual(zs, [{ zona: 'motor', nivel: 'rojo', claves: ['a', 'b', 'c'] }]);
});

test('API: panel en una llamada con zonas, gastos del mes y testigo de documentos', async () => {
  const r = await api().despachar({ ruta: '/vehiculos/focus/panel' });
  assert.equal(r.estado, 200);
  assert.deepEqual(r.cuerpo.cuenta, { rojo: 2, ambar: 1, verde: 2 });
  assert.equal(r.cuerpo.gastosMes.gastado, 58.85);
  assert.deepEqual([r.cuerpo.documentos.guardados, r.cuerpo.documentos.faltan], [3, 6]);
});

test('API: guardar un gasto lo suma al mes, avisa «cambio» y mueve el odómetro', async () => {
  const a = api(); let avisos = 0;
  a.alCambiar(() => avisos++);
  const r = await a.despachar({ metodo: 'POST', ruta: '/vehiculos/focus/gastos', cuerpo: { importe: 30, categoria: 'combustible', concepto: 'Gasolina 95', litros: 17.87, km: 165500 } });
  assert.equal(r.estado, 201);
  const p = (await a.despachar({ ruta: '/vehiculos/focus/panel' })).cuerpo;
  assert.equal(p.gastosMes.gastado, 88.85);
  assert.equal(p.vehiculo.odometro.km, 165500);
  assert.equal(avisos, 1);
});

test('API: un gasto sin importe o con categoría desconocida no se guarda', async () => {
  const a = api();
  assert.deepEqual((await a.despachar({ metodo: 'POST', ruta: '/vehiculos/focus/gastos', cuerpo: { importe: 0, categoria: 'combustible' } })).cuerpo.error.campo, 'importe');
  assert.deepEqual((await a.despachar({ metodo: 'POST', ruta: '/vehiculos/focus/gastos', cuerpo: { importe: 5, categoria: 'cafe' } })).cuerpo.error.campo, 'categoria');
  assert.equal((await a.despachar({ ruta: '/vehiculos/otro/panel' })).estado, 404);
});

test('API: adjuntar un documento lo quita del testigo', async () => {
  const a = api();
  await a.despachar({ metodo: 'POST', ruta: '/vehiculos/focus/documentos/seguro/archivo', cuerpo: { archivo: { type: 'application/pdf' } } });
  const d = (await a.despachar({ ruta: '/vehiculos/focus/documentos' })).cuerpo;
  assert.equal(d.resumen.faltan, 5);
  assert.equal(d.grupos[2].docs[0].tipo, 'pdf');
});

test('la semilla no lleva datos personales', () => {
  const txt = JSON.stringify(semilla);
  for (const p of ['"bastidor"', '"titular"', '"dni"', '"domicilio"', '"municipio"', '"poliza"', '"aseguradora"']) assert.ok(!txt.toLowerCase().includes(p), p);
  assert.doesNotMatch(txt, /\b[A-HJ-NPR-Z0-9]{17}\b/, 'sin bastidor');
  assert.doesNotMatch(txt, /\b\d{8}[A-Z]\b/, 'sin DNI');
});
