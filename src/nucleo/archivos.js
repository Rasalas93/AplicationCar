/** Índice de adjuntos por vehículo (foto, PDF u otro) y a qué van: el vehículo, un hueco de la Guantera o una visita. */
const tipoDe = mime => /pdf/.test(mime || '') ? 'pdf' : /^image\//.test(mime || '') ? 'foto' : 'archivo';
let serie = 0;

export function registroArchivos(repo, almacen) {
  const lista = vid => repo.obtener(`${vid}:archivos`, []);
  return {
    /** Archivos del vehículo; `destino` filtra ({tipo, id}). */
    listar(vid, destino) {
      return lista(vid).filter(a => !destino || (a.destino.tipo === destino.tipo && (destino.id == null || a.destino.id === destino.id)));
    },
    async adjuntar(vid, destino, blob, { nombre, hoy }) {
      const id = `a${Date.now().toString(36)}${(serie++).toString(36)}`, clave = `${vid}:${id}`, mime = blob.type || '';
      await almacen.guardar(clave, blob);
      const a = { id, clave, nombre: nombre || blob.name || (tipoDe(mime) === 'pdf' ? 'documento.pdf' : 'foto.jpg'), tipo: tipoDe(mime), mime, tamano: blob.size ?? null, fecha: hoy, destino };
      repo.guardar(`${vid}:archivos`, [...lista(vid), a]);
      return a;
    },
    async leer(vid, aid) {
      const a = lista(vid).find(x => x.id === aid);
      return a ? { archivo: a, blob: await almacen.leer(a.clave) } : null;
    },
    async borrar(vid, aid) {
      const todos = lista(vid), a = todos.find(x => x.id === aid);
      if (!a) return null;
      repo.guardar(`${vid}:archivos`, todos.filter(x => x !== a));
      await almacen.borrar(a.clave);
      return a;
    }
  };
}
