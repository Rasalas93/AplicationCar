/* Prueba de prevision.js con datos de ejemplo calculados a mano: node prevision.test.mjs */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const P = require('./prevision.js');
require('./datos.js');
const D = globalThis.GASTOS;

const casos = [];
const caso = (nombre, f) => casos.push([nombre, f]);
const cerca = (a, b, m) => assert.ok(Math.abs(a - b) < 0.006, `${m || ''} esperado ${b}, sale ${a}`);

/* Historial pequeño: 4 semanas completas (12 oct a 8 nov de 2026) y hoy miércoles 11 nov. */
const HOY = '2026-11-11';
const F = [
  { fecha: '2026-10-13', importe: 40, categoria: 'combustible', concepto: 'Gasolina', litros: 25, recurrente: null },
  { fecha: '2026-10-22', importe: 10, categoria: 'peajes', concepto: 'Peaje', recurrente: null },
  { fecha: '2026-10-27', importe: 20, categoria: 'combustible', concepto: 'Gasolina', litros: 12.5, recurrente: null },
  { fecha: '2026-10-30', importe: 60, categoria: 'mantenimiento', concepto: 'Pastillas', recurrente: null },
  { fecha: '2026-11-03', importe: 30, categoria: 'combustible', concepto: 'Gasolina', litros: 18, recurrente: null },
  { fecha: '2026-11-05', importe: 48, categoria: 'itv', concepto: 'ITV', recurrente: { cadaMeses: 12 } },
  { fecha: '2026-11-10', importe: 5, categoria: 'peajes', concepto: 'Aparcamiento', recurrente: null }
];
const PROG = [
  { id: 'ivtm', concepto: 'IVTM', categoria: 'impuestos', fecha: '2026-11-20', importe: { min: 34.08, max: 68.16 }, cadaMeses: 12 },
  { id: 'aceite', concepto: 'Aceite', categoria: 'mantenimiento', fecha: '2027-03-01', km: 165652, importe: { min: 90, max: 150 } },
  { id: 'seguro', concepto: 'Seguro', categoria: 'seguro', fecha: null, importe: null, cadaMeses: 12 }
];
const ODO = { km: 165360, fecha: '2026-11-02' };

caso('cuantil interpola como una hoja de cálculo', () => {
  cerca(P.cuantil([40, 10, 20, 30], 0.25), 17.5);
  cerca(P.cuantil([40, 10, 20, 30], 0.75), 32.5);
  cerca(P.cuantil([7], 0.25), 7);
});

caso('semanas: de lunes a domingo, la última en curso', () => {
  const s = P.semanas(F, HOY);
  assert.equal(s.length, 13);
  assert.deepEqual([s[12].inicio, s[12].fin, s[12].enCurso], ['2026-11-09', '2026-11-15', true]);
  assert.deepEqual(s.slice(8, 12).map(x => x.total), [40, 10, 80, 78]);
  assert.deepEqual(s.slice(8, 12).map(x => x.uso), [40, 10, 20, 30]);
  assert.equal(s[12].total, 5);
});

caso('ventana: empieza en la primera semana con gasto', () => {
  const v = P.ventana(F, HOY);
  assert.deepEqual([v.length, v[0].inicio, v[3].fin], [4, '2026-10-12', '2026-11-08']);
});

caso('medias: corriente = media de las semanas; los fijos se prorratean aparte', () => {
  const m = P.medias(F, PROG, HOY);
  cerca(m.corriente.semana, (40 + 10 + 80 + 30) / 4);
  cerca(m.corriente.mes, 40 * 365.25 / 7 / 12);
  cerca(m.fijos.mes, 48 / 12 + 51.12 / 12);
  assert.deepEqual(m.fijos.sinImporte, ['Seguro']);
  cerca(m.total.mes, 173.93 + 8.26);
  cerca(m.usoDia, 100 / 28);
  assert.equal(m.pocoHistorial, false);
});

caso('fechaEvento: fecha o km, lo que llegue antes', () => {
  assert.deepEqual(P.fechaEvento(PROG[1], ODO, 14.6), { fecha: '2026-11-22', por: 'km' });
  assert.deepEqual(P.fechaEvento({ fecha: '2026-11-15', km: 165652 }, ODO, 14.6), { fecha: '2026-11-15', por: 'fecha' });
  assert.equal(P.fechaEvento(PROG[2], ODO, 14.6), null);
});

caso('previsión del mes: gastado + ritmo × días + eventos, con rango', () => {
  const p = P.previsionMes({ gastos: F, programados: PROG, hoy: HOY, odometro: ODO, kmDia: 14.6 });
  cerca(p.gastado, 83);
  assert.equal(p.variable.diasRestantes, 19);
  cerca(p.variable.central, 100 / 28 * 19);
  cerca(p.variable.min, 17.5 / 7 * 19);
  cerca(p.variable.max, 32.5 / 7 * 19);
  assert.deepEqual(p.eventos.map(e => [e.id, e.fecha, e.por]), [['ivtm', '2026-11-20', 'fecha'], ['aceite', '2026-11-22', 'km']]);
  assert.deepEqual(p.sinFecha, [{ id: 'seguro', concepto: 'Seguro', falta: 'fecha' }]);
  cerca(p.min, 83 + 47.5 + 34.08 + 90);
  cerca(p.central, 83 + 67.86 + 51.12 + 120);
  cerca(p.max, 83 + 88.21 + 68.16 + 150);
  assert.ok(p.min <= p.central && p.central <= p.max);
});

caso('previsión: un evento ya pagado no se cuenta dos veces', () => {
  const pagado = [...F, { fecha: '2026-11-11', importe: 61.4, categoria: 'impuestos', concepto: 'IVTM', programadoId: 'ivtm', recurrente: { cadaMeses: 12 } }];
  const p = P.previsionMes({ gastos: pagado, programados: PROG, hoy: HOY, odometro: ODO, kmDia: 14.6 });
  cerca(p.gastado, 144.4);
  assert.deepEqual(p.eventos.map(e => e.id), ['aceite']);
});

caso('previsión de un mes futuro: todos sus días y sus eventos', () => {
  const p = P.previsionMes({ gastos: F, programados: PROG, hoy: HOY, mes: '2026-12', odometro: ODO, kmDia: 14.6 });
  assert.deepEqual([p.gastado, p.variable.diasRestantes, p.eventos.length], [0, 31, 0]);
  cerca(p.central, 100 / 28 * 31);
});

caso('sin historial: previsión 0 y aviso de poco historial', () => {
  const p = P.previsionMes({ gastos: [], hoy: HOY, odometro: ODO, kmDia: 14.6 });
  assert.deepEqual([p.central, p.min, p.max, p.pocoHistorial], [0, 0, 0, true]);
});

caso('alta: última categoría primero y repetir el último repostaje', () => {
  assert.deepEqual(P.ordenCategorias(F).slice(0, 2), ['peajes', 'combustible']);
  const r = P.repetirRepostaje(F, HOY, 1.6);
  assert.deepEqual([r.fecha, r.importe, r.categoria, r.litros], [HOY, 30, 'combustible', 18.75]);
  assert.equal(P.repetirRepostaje([], HOY), null);
});

caso('reparto por categoría suma el total', () => {
  const r = P.porCategoria(F, '2026-11-01', HOY);
  assert.deepEqual(r.map(x => [x.categoria, x.importe]), [['itv', 48], ['combustible', 30], ['peajes', 5]]);
  cerca(r.reduce((s, x) => s + x.parte, 0), 1);
});

caso('datos de ejemplo de la pantalla: cifras que se ven en gastos.png', () => {
  const m = P.medias(D.gastos, D.programados, D.hoy);
  const p = P.previsionMes({ gastos: D.gastos, programados: D.programados, hoy: D.hoy, odometro: D.odometro, kmDia: D.kmDia });
  assert.equal(m.semanas, 12);
  cerca(m.corriente.semana, 293.15 / 12);
  cerca(p.gastado, 58.85);
  assert.deepEqual([p.variable.diasRestantes, p.eventos.length], [19, 0]);
  const ene = P.previsionMes({ gastos: D.gastos, programados: D.programados, hoy: D.hoy, mes: '2027-01', odometro: D.odometro, kmDia: D.kmDia });
  assert.deepEqual(ene.eventos.map(e => [e.id, e.por]), [['ivtm-2027', 'fecha'], ['aceite-2027', 'fecha']]);
  const con = [...D.gastos, P.repetirRepostaje(D.gastos, D.hoy, D.precioLitro.valor)];
  const q = P.previsionMes({ gastos: con, programados: D.programados, hoy: D.hoy, odometro: D.odometro, kmDia: D.kmDia });
  cerca(q.gastado, 88.85);
  cerca(q.central - p.central, 30);
  console.log(`  ejemplo: media ${m.total.semana} €/sem · ${m.total.mes} €/mes; nov ${p.central} € (${p.min}-${p.max}) → ${q.central} € (${q.min}-${q.max}); ene 2027 ${ene.central} € (${ene.min}-${ene.max})`);
});

let fallos = 0;
for (const [nombre, f] of casos) {
  try { f(); console.log('ok   ' + nombre); } catch (e) { fallos++; console.log('FALLA ' + nombre + '\n      ' + e.message); }
}
console.log(`${casos.length - fallos}/${casos.length} pruebas`);
process.exit(fallos ? 1 : 0);
