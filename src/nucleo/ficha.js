/** Datos útiles del vehículo: la plantilla más lo editado en el móvil; cada valor lleva su fuente. */
export const FUENTES = ['documento', 'verbal', 'ejemplo'];

export function validarCampo(c) {
  if (!c || !c.clave) return 'clave';
  if (typeof c.valor !== 'string' || c.valor.length > 160) return 'valor';
  if (c.valor && !FUENTES.includes(c.fuente)) return 'fuente';
  return null;
}

/** Grupos de la ficha; la matrícula sale solo de la semilla del vehículo. */
export function fichaDe(v, editados = {}) {
  const grupos = (v.ficha || []).map(g => ({ grupo: g.grupo, campos: g.campos.map(c => {
    const e = editados[c.clave];
    return e ? { ...c, valor: e.valor, fuente: e.valor ? { tipo: e.fuente, cita: `Editado el ${e.fecha.split('-').reverse().join('/')}` } : null, editado: true } : { ...c, fuente: c.valor ? c.fuente : null };
  }) }));
  if (v.matricula && grupos[0]) grupos[0].campos.unshift({ clave: 'matricula', etiqueta: 'Matrícula', valor: v.matricula, fuente: { tipo: 'documento', cita: 'Informe DGT' }, fija: true });
  const campos = grupos.flatMap(g => g.campos);
  return { grupos, resumen: { total: campos.length, conDato: campos.filter(c => c.valor).length, ejemplo: campos.filter(c => c.fuente && c.fuente.tipo === 'ejemplo').length } };
}
