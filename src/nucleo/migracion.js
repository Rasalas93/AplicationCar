/** Migración del guardado local: v1 (T1636, un coche) → v2 (varios vehículos, índice de archivos). */
export const ESQUEMA = 2;

/** Pone el repositorio al día sin perder datos; devuelve la versión final. Los ficheros no se mueven. */
export function migrar(repo, ids = ['focus']) {
  const v = repo.obtener('esquema', 1);
  if (v >= ESQUEMA) return v;
  for (const id of ids) {
    const docs = repo.obtener(`${id}:documentos`, null);
    if (!docs) continue;
    const archivos = repo.obtener(`${id}:archivos`, []);
    for (const [doc, d] of Object.entries(docs)) {
      if (archivos.some(a => a.clave === `${id}:${doc}`)) continue;
      archivos.push({ id: `v1-${doc}`, clave: `${id}:${doc}`, nombre: d.tipo === 'pdf' ? `${doc}.pdf` : `${doc}.jpg`, tipo: d.tipo, mime: d.tipo === 'pdf' ? 'application/pdf' : 'image/*', tamano: null, fecha: null, meta: d.meta, destino: { tipo: 'doc', id: doc } });
    }
    repo.guardar(`${id}:archivos`, archivos);
  }
  if (!repo.obtener('garaje', null)) repo.guardar('garaje', []);
  if (!repo.obtener('activo', null)) repo.guardar('activo', ids[0]);
  repo.guardar('esquema', ESQUEMA);
  return ESQUEMA;
}
