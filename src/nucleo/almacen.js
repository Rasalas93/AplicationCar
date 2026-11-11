/** Puertos de almacenamiento local: Repositorio (JSON por clave) y AlmacenArchivos (ficheros). Sin servidor. */

/** Repositorio sobre localStorage; en memoria si no hay localStorage (pruebas, modo privado). */
export function repositorioLocal(prefijo = 'coche:v1:', ls = globalThis.localStorage) {
  const memoria = new Map();
  const leer = k => { try { return ls ? ls.getItem(prefijo + k) : memoria.get(k) ?? null; } catch { return memoria.get(k) ?? null; } };
  const escribir = (k, v) => { try { if (ls) ls.setItem(prefijo + k, v); else memoria.set(k, v); } catch { memoria.set(k, v); } };
  return {
    obtener(k, porDefecto = null) { const v = leer(k); return v == null ? porDefecto : JSON.parse(v); },
    guardar(k, v) { escribir(k, JSON.stringify(v)); }
  };
}

/** Ficheros (fotos, PDF) en IndexedDB; en memoria si no hay IndexedDB. */
export function almacenArchivos(nombre = 'coche-archivos', idb = globalThis.indexedDB) {
  const memoria = new Map();
  if (!idb) return { guardar: async (k, b) => void memoria.set(k, b), leer: async k => memoria.get(k) || null };
  const abrir = () => new Promise((ok, mal) => {
    const r = idb.open(nombre, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('archivos');
    r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error);
  });
  const op = async (modo, f) => { const db = await abrir(); return new Promise((ok, mal) => { const t = db.transaction('archivos', modo), r = f(t.objectStore('archivos')); t.oncomplete = () => ok(r.result); t.onerror = () => mal(t.error); }); };
  return { guardar: (k, blob) => op('readwrite', s => s.put(blob, k)), leer: k => op('readonly', s => s.get(k)) };
}
