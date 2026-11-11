/** Piezas de interfaz compartidas: hoja inferior (con botón atrás de Android), aviso y sonido. */
export const ICONOS = {
  inicio: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  gastos: 'M4 19V9M10 19V5M16 19v-7M21 19H3',
  anotar: 'M12 5v14M5 12h14',
  guantera: 'M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z',
  aspecto: 'M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-.9-.7-1.2-.7-2 0-.8.7-1.5 1.5-1.5H17a4 4 0 0 0 4-4c0-5-4-9-9-9zM7.5 11.5h.01M10 7.5h.01M15 7.5h.01',
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

/** Cierra la hoja (desde la app; el atrás del sistema llega por popstate). */
export function cerrarHoja(desdeHistoria = false) {
  const h = $('hoja');
  if (!h.classList.contains('on')) return;
  h.classList.remove('on'); $('sombra').classList.remove('on');
  tocar('cerrar');
  const f = alCerrarHoja; alCerrarHoja = null; f && f();
  if (!desdeHistoria && history.state && history.state.hoja) history.back();
}

export function hojaAbierta() { return $('hoja').classList.contains('on'); }

/** Aviso breve arriba (guardado, error). */
export function avisar(texto) {
  const a = $('aviso');
  a.innerHTML = `<svg viewBox="0 0 24 24"><path d="${ICONOS.ok}"/></svg>${texto}`;
  a.classList.add('on');
  clearTimeout(avisar.t); avisar.t = setTimeout(() => a.classList.remove('on'), 2200);
}
