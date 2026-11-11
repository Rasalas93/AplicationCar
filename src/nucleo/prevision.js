/* Medias y previsión de gastos: funciones puras, sin pantalla ni reloj (fechas 'AAAA-MM-DD', importes en euros). */
(function (raiz) {
  const DIA = 864e5, SEMANAS = 12, MIN_SEMANAS = 4, SEMANAS_ANIO = 365.25 / 7;
  const CATEGORIAS = ['combustible', 'mantenimiento', 'seguro', 'impuestos', 'itv', 'peajes', 'multas', 'otros'];
  const DE_USO = ['combustible', 'peajes', 'otros'];

  const ms = f => { const [a, m, d] = f.split('-').map(Number); return Date.UTC(a, m - 1, d); };
  const iso = t => new Date(t).toISOString().slice(0, 10);
  const mas = (f, n) => iso(ms(f) + n * DIA);
  const dias = (a, b) => Math.round((ms(b) - ms(a)) / DIA);
  const lunes = f => mas(f, -((new Date(ms(f)).getUTCDay() + 6) % 7));
  const finMes = mes => { const [a, m] = mes.split('-').map(Number); return iso(Date.UTC(a, m, 0)); };
  const euros = n => Math.round(n * 100) / 100;
  const suma = (l, f = x => x) => l.reduce((s, x) => s + f(x), 0);
  const esFijo = g => !!g.recurrente;

  /** Cuantil con interpolación lineal (el de una hoja de cálculo). */
  function cuantil(lista, p) {
    const o = [...lista].sort((a, b) => a - b), i = (o.length - 1) * p, k = Math.floor(i);
    return o.length ? o[k] + (o[Math.min(k + 1, o.length - 1)] - o[k]) * (i - k) : 0;
  }

  /** Semanas de lunes a domingo que acaban en la de `hoy`; la última va marcada `enCurso`. */
  function semanas(gastos, hoy, n = SEMANAS + 1) {
    const actual = lunes(hoy);
    return Array.from({ length: n }, (_, k) => {
      const inicio = mas(actual, (k - n + 1) * 7), fin = mas(inicio, 6);
      const suyos = gastos.filter(g => g.fecha >= inicio && g.fecha <= fin && g.fecha <= hoy);
      const porCategoria = {};
      for (const g of suyos) porCategoria[g.categoria] = euros((porCategoria[g.categoria] || 0) + g.importe);
      return {
        inicio, fin, enCurso: inicio === actual, porCategoria,
        total: euros(suma(suyos, g => g.importe)),
        corriente: euros(suma(suyos.filter(g => !esFijo(g)), g => g.importe)),
        uso: euros(suma(suyos.filter(g => !esFijo(g) && DE_USO.includes(g.categoria)), g => g.importe))
      };
    });
  }

  /** Semanas completas que sirven de ventana: de la primera con gasto a la anterior a `hoy`, 12 como mucho. */
  function ventana(gastos, hoy) {
    const todas = semanas(gastos, hoy).filter(s => !s.enCurso);
    const primera = todas.findIndex(s => s.total > 0);
    return primera < 0 ? [] : todas.slice(primera);
  }

  /** Cuota mensual de los gastos periódicos: el último pagado de cada concepto, o el programado si aún no hay pago. */
  function fijosMensuales(gastos, programados = []) {
    const por = {};
    for (const p of programados) if (p.cadaMeses && p.importe) por[p.concepto] = { concepto: p.concepto, importe: (p.importe.min + p.importe.max) / 2, cadaMeses: p.cadaMeses, estimado: true };
    for (const g of [...gastos].sort((a, b) => a.fecha < b.fecha ? -1 : 1)) if (esFijo(g)) por[g.concepto] = { concepto: g.concepto, importe: g.importe, cadaMeses: g.recurrente.cadaMeses, estimado: false };
    const lineas = Object.values(por).map(l => ({ ...l, alMes: euros(l.importe / l.cadaMeses) }));
    const sinImporte = programados.filter(p => p.cadaMeses && !p.importe && !por[p.concepto]).map(p => p.concepto);
    return { alMes: euros(suma(lineas, l => l.alMes)), lineas, sinImporte };
  }

  /** Gasto medio por semana y por mes: corriente (media de las semanas de la ventana) más fijos prorrateados. */
  function medias(gastos, programados, hoy) {
    const v = ventana(gastos, hoy), n = v.length;
    const semanal = n ? suma(v, s => s.corriente) / n : 0, usoSemanal = n ? suma(v, s => s.uso) / n : 0;
    const fijos = fijosMensuales(gastos, programados), aMes = SEMANAS_ANIO / 12;
    return {
      semanas: n, pocoHistorial: n < MIN_SEMANAS, desde: n ? v[0].inicio : null, hasta: n ? v[n - 1].fin : null,
      corriente: { semana: euros(semanal), mes: euros(semanal * aMes) },
      fijos: { semana: euros(fijos.alMes / aMes), mes: fijos.alMes, lineas: fijos.lineas, sinImporte: fijos.sinImporte },
      total: { semana: euros(semanal + fijos.alMes / aMes), mes: euros(semanal * aMes + fijos.alMes) },
      usoDia: usoSemanal / 7
    };
  }

  /** Fecha efectiva de un evento programado: su fecha o el día en que se alcanzan sus km, lo que llegue antes. */
  function fechaEvento(evento, odometro, kmDia) {
    const porKm = evento.km != null && kmDia > 0 ? mas(odometro.fecha, Math.max(0, Math.ceil((evento.km - odometro.km) / kmDia))) : null;
    if (evento.fecha && porKm) return porKm < evento.fecha ? { fecha: porKm, por: 'km' } : { fecha: evento.fecha, por: 'fecha' };
    return evento.fecha ? { fecha: evento.fecha, por: 'fecha' } : porKm ? { fecha: porKm, por: 'km' } : null;
  }

  /** Previsión de un mes ('AAAA-MM'): gastado + uso que queda (ritmo diario, rango P25-P75 semanal) + eventos programados. */
  function previsionMes({ gastos, programados = [], hoy, mes = hoy.slice(0, 7), odometro, kmDia }) {
    const inicio = mes + '-01', fin = finMes(mes);
    const delMes = gastos.filter(g => g.fecha >= inicio && g.fecha <= fin && g.fecha <= hoy);
    const gastado = euros(suma(delMes, g => g.importe));
    const desde = hoy < inicio ? inicio : mas(hoy, 1);
    const diasRestantes = Math.max(0, dias(desde, fin) + 1);

    const v = ventana(gastos, hoy), usos = v.map(s => s.uso);
    const ritmo = v.length ? suma(usos) / (v.length * 7) : 0;
    const central = ritmo * diasRestantes;
    const variable = {
      diasRestantes, ritmoDia: ritmo, semanas: v.length, central: euros(central),
      min: euros(Math.min(central, cuantil(usos, 0.25) / 7 * diasRestantes)),
      max: euros(Math.max(central, cuantil(usos, 0.75) / 7 * diasRestantes))
    };

    const pagados = new Set(gastos.map(g => g.programadoId).filter(Boolean));
    const eventos = [], sinFecha = [];
    for (const p of programados) {
      if (pagados.has(p.id)) continue;
      const cuando = fechaEvento(p, odometro, kmDia);
      if (!cuando || !p.importe) { sinFecha.push({ id: p.id, concepto: p.concepto, falta: !cuando ? 'fecha' : 'importe' }); continue; }
      if (cuando.fecha >= desde && cuando.fecha <= fin) eventos.push({ id: p.id, concepto: p.concepto, categoria: p.categoria, fecha: cuando.fecha, por: cuando.por, min: p.importe.min, max: p.importe.max, ejemplo: !!p.ejemplo, fuente: p.fuente });
    }
    eventos.sort((a, b) => a.fecha < b.fecha ? -1 : 1);

    const evMin = suma(eventos, e => e.min), evMax = suma(eventos, e => e.max);
    return {
      mes, gastado, variable, eventos, sinFecha,
      min: euros(gastado + variable.min + evMin),
      central: euros(gastado + variable.central + (evMin + evMax) / 2),
      max: euros(gastado + variable.max + evMax),
      pocoHistorial: v.length < MIN_SEMANAS
    };
  }

  /** Reparto por categoría de los gastos entre dos fechas, de mayor a menor. */
  function porCategoria(gastos, desde, hasta) {
    const por = {};
    for (const g of gastos) if (g.fecha >= desde && g.fecha <= hasta) por[g.categoria] = (por[g.categoria] || 0) + g.importe;
    const total = suma(Object.values(por));
    return Object.entries(por).map(([categoria, importe]) => ({ categoria, importe: euros(importe), parte: total ? importe / total : 0 })).sort((a, b) => b.importe - a.importe);
  }

  /** Categorías para los chips del alta: la última usada primero, luego por frecuencia. */
  function ordenCategorias(gastos) {
    const n = {}, o = [...gastos].sort((a, b) => a.fecha < b.fecha ? -1 : 1);
    for (const g of o) n[g.categoria] = (n[g.categoria] || 0) + 1;
    const ultima = o.length ? o[o.length - 1].categoria : null;
    return [...CATEGORIAS].sort((a, b) => (b === ultima) - (a === ultima) || (n[b] || 0) - (n[a] || 0));
  }

  /** Copia del último repostaje con fecha de hoy; los litros salen del importe y del precio por litro dado o del anterior. */
  function repetirRepostaje(gastos, hoy, precioLitro) {
    const u = [...gastos].filter(g => g.categoria === 'combustible' && g.litros).sort((a, b) => a.fecha < b.fecha ? -1 : 1).pop();
    if (!u) return null;
    const precio = precioLitro || u.importe / u.litros;
    return { fecha: hoy, importe: u.importe, categoria: 'combustible', concepto: u.concepto, litros: Math.round(u.importe / precio * 100) / 100, fuente: 'manual', recurrente: null };
  }

  const api = { CATEGORIAS, DE_USO, SEMANAS, cuantil, semanas, ventana, fijosMensuales, medias, fechaEvento, previsionMes, porCategoria, ordenCategorias, repetirRepostaje };
  if (typeof module === 'object' && module.exports) module.exports = api; else raiz.Prevision = api;
})(typeof window !== 'undefined' ? window : globalThis);
