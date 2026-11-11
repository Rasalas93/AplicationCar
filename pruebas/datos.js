/* Datos de Gastos tal como los daría el backend: hechos de refs/ y gastos de EJEMPLO (rotulados en pantalla). */
(function (raiz) {
  const g = (fecha, importe, categoria, concepto, extra) => ({ fecha, importe, categoria, concepto, fuente: 'manual', recurrente: null, ...extra });
  raiz.GASTOS = {
    hoy: '2026-11-11', ejemplo: true,
    vehiculo: { modelo: 'Focus MK3', version: '1.6 EcoBoost 150', anio: 2011 },
    odometro: { km: 165360, fecha: '2026-11-02', fuente: 'DGT · ITV 02/11/2026' },
    kmDia: 14.6,
    precioLitro: { valor: 1.679, fecha: '2026-11-11', fuente: 'Mediana nacional gasolina 95 E5, Geoportal Gasolineras (MITECO)' },
    gastos: [
      g('2026-08-19', 3.20, 'peajes', 'Aparcamiento'),
      g('2026-08-22', 30.00, 'combustible', 'Gasolina 95', { litros: 18.29, km: 164308 }),
      g('2026-08-26', 7.45, 'peajes', 'Peaje'),
      g('2026-08-29', 4.10, 'peajes', 'Aparcamiento'),
      g('2026-09-02', 2.60, 'peajes', 'Aparcamiento'),
      g('2026-09-05', 9.00, 'otros', 'Lavado'),
      g('2026-09-08', 30.00, 'combustible', 'Gasolina 95', { litros: 18.18, km: 164556 }),
      g('2026-09-12', 11.50, 'mantenimiento', 'Bombilla H7'),
      g('2026-09-16', 3.80, 'peajes', 'Aparcamiento'),
      g('2026-09-19', 12.90, 'peajes', 'Peaje'),
      g('2026-09-25', 35.00, 'combustible', 'Gasolina 95', { litros: 21.08, km: 164804 }),
      g('2026-09-26', 5.00, 'peajes', 'Aparcamiento'),
      g('2026-09-30', 2.60, 'peajes', 'Aparcamiento'),
      g('2026-10-03', 7.45, 'peajes', 'Peaje'),
      g('2026-10-07', 4.40, 'peajes', 'Aparcamiento'),
      g('2026-10-10', 9.00, 'otros', 'Lavado'),
      g('2026-10-12', 30.00, 'combustible', 'Gasolina 95', { litros: 17.96, km: 165052 }),
      g('2026-10-17', 24.90, 'mantenimiento', 'Escobillas'),
      g('2026-10-21', 3.20, 'peajes', 'Aparcamiento'),
      g('2026-10-24', 12.90, 'peajes', 'Peaje'),
      g('2026-10-29', 30.00, 'combustible', 'Gasolina 95', { litros: 17.91, km: 165300 }),
      g('2026-10-31', 4.10, 'peajes', 'Aparcamiento'),
      g('2026-11-02', 45.00, 'itv', 'ITV', { km: 165360, recurrente: { cadaMeses: 12 } }),
      g('2026-11-04', 2.60, 'peajes', 'Aparcamiento'),
      g('2026-11-07', 7.45, 'peajes', 'Peaje'),
      g('2026-11-10', 3.80, 'peajes', 'Aparcamiento')
    ],
    programados: [
      { id: 'ivtm-2027', concepto: 'IVTM', categoria: 'impuestos', fecha: '2027-01-01', importe: { min: 34.08, max: 68.16 }, cadaMeses: 12, fuente: 'Devengo 1 ene · 11,63 CVF: 34,08 € × coeficiente municipal de 1 a 2 (TRLRHL art. 95)' },
      { id: 'aceite-2027', concepto: 'Aceite y filtros', categoria: 'mantenimiento', fecha: '2027-01-15', km: 170000, importe: { min: 90, max: 150 }, ejemplo: true, fuente: 'Regla «fecha o km, lo que llegue antes»' },
      { id: 'itv-2027', concepto: 'ITV', categoria: 'itv', fecha: '2027-11-25', importe: { min: 45, max: 45 }, cadaMeses: 12, ejemplo: true, fuente: 'DGT 10/11/2026: antes del 25/11/2027' },
      { id: 'seguro', concepto: 'Seguro', categoria: 'seguro', fecha: null, importe: null, cadaMeses: 12, fuente: 'DGT 10/11/2026: vigente; renovación y prima a confirmar' }
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
