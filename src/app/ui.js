/** Piezas de interfaz compartidas: hoja inferior (con botón atrás de Android), aviso y sonido. */
export const ICONOS = {
  inicio: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  gastos: 'M4 19V9M10 19V5M16 19v-7M21 19H3',
  anotar: 'M12 5v14M5 12h14',
  guantera: 'M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z',
  aspecto: 'M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-.9-.7-1.2-.7-2 0-.8.7-1.5 1.5-1.5H17a4 4 0 0 0 4-4c0-5-4-9-9-9zM7.5 11.5h.01M10 7.5h.01M15 7.5h.01',
  taller: 'M14.7 6.3a4 4 0 0 0-5.4 5.2L3.6 17.2a1.9 1.9 0 0 0 2.7 2.7l5.7-5.7a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.5-.5-2.4z',
  camara: 'M4 8a1 1 0 0 1 1-1h3l1.5-2h5L16 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  archivo: 'M6 3h8l4 4v14H6zM14 3v4h4M9 13h6M9 16.5h6',
  clip: 'M20 11.5l-8 8a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.4 8.4a1.7 1.7 0 0 1-2.4-2.4l7.6-7.6',
  borrar: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10.5 11v6M13.5 11v6',
  bajar: 'M6 9l6 6 6-6',
  editar: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  tel: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z',
  ok: 'M4 12.5l5 5L20 6.5',
  atras: 'M12 4l-6 6 6 6M6 10h11'
};
export const icono = (n, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24"><path d="${ICONOS[n]}"/></svg>`;

let sonido = null, alCerrarHoja = null;
export const usarSonido = s => { sonido = s; };
export const tocar = n => sonido && sonido.tocar(n);

const $ = id => document.getElementById(id);

/** Abre la hoja inferior con `html`; el botón atrás o tocar fuera la cierra. */
export function abrirHoja(html, { alCerrar, clase = '' } = {}) {
  const h = $('hoja');
  if (!h.classList.contains('on')) history.pushState({ hoja: true }, '');
  h.className = 'hoja on ' + clase; h.innerHTML = html; h.scrollTop = 0;
  $('sombra').classList.add('on');
  alCerrarHoja = alCerrar || null;
  tocar('abrir');
  return h;
}

/** Cierra la hoja (el atrás del sistema llega por popstate); la promesa se cumple cuando el historial ya volvió. */
export function cerrarHoja(desdeHistoria = false) {
  const h = $('hoja');
  if (!h.classList.contains('on')) return Promise.resolve();
  h.classList.remove('on'); $('sombra').classList.remove('on');
  tocar('cerrar');
  const f = alCerrarHoja; alCerrarHoja = null; f && f();
  if (desdeHistoria || !(history.state && history.state.hoja)) return Promise.resolve();
  return new Promise(listo => { addEventListener('popstate', () => listo(), { once: true }); history.back(); });
}

export function hojaAbierta() { return $('hoja').classList.contains('on'); }

/** Aviso breve arriba (guardado, error). */
export function avisar(texto) {
  const a = $('aviso');
  a.innerHTML = `<svg viewBox="0 0 24 24"><path d="${ICONOS.ok}"/></svg>${texto}`;
  a.classList.add('on');
  clearTimeout(avisar.t); avisar.t = setTimeout(() => a.classList.remove('on'), 2200);
}
