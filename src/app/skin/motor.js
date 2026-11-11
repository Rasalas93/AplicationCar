/** Motor de skin: el tema (datos de temas.js) es lo único que pone color, fuente y forma; la pantalla lee variables CSS. */
import './temas.js';
import './piezas.js';
import './paisaje.js';

const une = (b, t) => { const o = { ...b }; for (const k in t) o[k] = t[k] && typeof t[k] === 'object' && !Array.isArray(t[k]) && b[k] ? une(b[k], t[k]) : t[k]; return o; };
export const TEMA_POR_DEFECTO = 'atardecer';

/** Temas disponibles, en el orden de temas.js. */
export function listaTemas() {
  return Object.values(window.TEMAS).map(t => ({ id: t.id, nombre: t.nombre, acento: t.acento, fondo: t.texto.fondo }));
}

/** Tema completo: TEMA_BASE + el tema elegido. */
export function tema(id) {
  return une(window.TEMA_BASE, window.TEMAS[id] || window.TEMAS[TEMA_POR_DEFECTO]);
}

/** Vuelca los tokens del tema en variables CSS (copiado de gastos.html, T1634). */
export function aplicarTema(t, raiz = document.documentElement) {
  const s = raiz.style, x = t.texto, c = t.marco.corte, k = Math.round(c * 0.66);
  const corte = n => n ? `polygon(${n}px 0,100% 0,100% calc(100% - ${n}px),calc(100% - ${n}px) 100%,0 100%,0 ${n}px)` : 'none';
  const v = {
    acento: t.acento, acento2: t.acento2, bg: x.fondo, card1: x.tarjeta[0], card2: x.tarjeta[1], tinta: x.tinta, tenue: x.tenue,
    odo1: x.odometro[0], odo2: x.odometro[1], odo3: x.odometro[2], sombra: x.sombra, alerta: t.estados.alerta, falta: t.estados.falta, ok: t.estados.ok,
    fTitulo: t.fuentes.titulo, fTexto: t.fuentes.texto, fDato: t.fuentes.dato, esp: t.fuentes.espaciado, may: t.fuentes.mayusculas,
    radio: t.marco.radio + 'px', radioLuz: t.marco.radio ? '50%' : '1px', linea: t.marco.linea, recorte: corte(c), recorteS: corte(k),
    grosor: t.marco.grosor + 'px', bisel: t.marco.bisel || t.marco.linea, relieve: t.marco.relieve, placa: t.material.placa, banda: t.material.banda,
    recorteFab: t.formas.fab === 'engranaje' ? window.Piezas.recorte(12) : corte(c), brillo: t.brillo, lineas: t.lineas,
    fabFondo: t.material.fab || `linear-gradient(180deg,color-mix(in srgb,${t.acento} 78%,#fff),${t.acento2})`
  };
  for (const n in v) s.setProperty('--' + n, v[n]);
  document.body.dataset.escena = t.escena.tipo;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', x.fondo);
}

/** Pinta el fondo de cabecera del tema: paisaje (Copiloto) o degradado (Puente, Taller). */
export function pintarFondo(canvas, t, dpr = Math.min(window.devicePixelRatio || 2, 2)) {
  if (t.escena.tipo === 'paisaje') return window.Paisaje.pintar(canvas, t, dpr);
  const w = canvas.width = Math.round(390 * dpr), h = canvas.height = Math.round(452 * dpr), g = canvas.getContext('2d');
  const lg = g.createLinearGradient(0, 0, w, h * 0.5);
  const [l0, l1] = t.escena.luz || t.escena.nebulosa || [t.texto.tarjeta[0], t.texto.fondo];
  [[0, l1], [0.3, l0], [0.6, l1], [1, t.texto.fondo]].forEach(([o, col]) => lg.addColorStop(o, col));
  g.fillStyle = lg; g.fillRect(0, 0, w, h);
}
