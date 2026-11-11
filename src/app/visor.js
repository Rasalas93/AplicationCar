/** Archivos en la app: elegir (cámara o archivo), ver foto o PDF (pdf.js, carga diferida) y borrar con confirmación. */
import { abrirHoja, cerrarHoja, tocar, avisar, icono } from './ui.js';
import { esc, dma } from './formato.js';

const ACEPTA = 'image/*,application/pdf';

/** Abre el selector del sistema; con `camara`, la cámara trasera. Resuelve con el File o null. */
export function elegirArchivo({ camara = false } = {}) {
  return new Promise(listo => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = camara ? 'image/*' : ACEPTA; i.hidden = true;
    if (camara) i.setAttribute('capture', 'environment');
    i.onchange = () => { listo(i.files[0] || null); i.remove(); };
    i.oncancel = () => { listo(null); i.remove(); };
    document.body.appendChild(i); i.click();
  });
}

/** Botones «Foto» y «Archivo» para una hoja; `alElegir(file)` recibe lo elegido. */
export const botonesAdjuntar = (txt = 'Adjuntar') => `<div class="adjuntar"><button class="boton pri" data-elegir="camara">${icono('camara')}Hacer foto</button><button class="boton" data-elegir="archivo">${icono('archivo')}${txt}</button></div>`;
export function enlazarAdjuntar(raiz, alElegir) {
  raiz.querySelectorAll('[data-elegir]').forEach(b => b.onclick = async () => {
    tocar('toque');
    const f = await elegirArchivo({ camara: b.dataset.elegir === 'camara' });
    if (f) alElegir(f);
  });
}

const peso = n => n == null ? '' : n < 1e6 ? `${Math.max(1, Math.round(n / 1e3))} kB` : `${(n / 1e6).toFixed(1).replace('.', ',')} MB`;
export const filaArchivo = a => `<button class="arch" data-archivo="${a.id}"><i class="ico t-${a.tipo}">${icono(a.tipo === 'foto' ? 'camara' : 'archivo')}</i><div><h4>${esc(a.nombre)}</h4><p>${[a.tipo === 'pdf' ? 'PDF' : a.tipo === 'foto' ? 'Foto' : 'Archivo', a.fecha ? dma(a.fecha) : '', peso(a.tamano)].filter(Boolean).join(' · ')}</p></div><span class="chip">Ver</span></button>`;

async function pintarPdf(blob, caja) {
  const [pdfjs, { default: trabajador }] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
  pdfjs.GlobalWorkerOptions.workerSrc = trabajador;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise, dpr = Math.min(devicePixelRatio || 1, 2);
  caja.innerHTML = '';
  for (let n = 1; n <= Math.min(doc.numPages, 12); n++) {
    const p = await doc.getPage(n), v0 = p.getViewport({ scale: 1 }), v = p.getViewport({ scale: (caja.clientWidth || 360) * dpr / v0.width });
    const c = document.createElement('canvas'); c.width = v.width; c.height = v.height;
    caja.appendChild(c);
    await p.render({ canvas: c, viewport: v }).promise;
  }
  return doc.numPages;
}

/** Visor en la hoja inferior; «Borrar» pide un segundo toque. */
export async function abrirVisor({ cliente, id, titulo }) {
  const r = await cliente.leerArchivo(id);
  if (!r || !r.archivo) { avisar('Ese archivo ya no está'); return; }
  const a = r.archivo, url = r.blob instanceof Blob ? URL.createObjectURL(r.blob) : null;
  const h = abrirHoja(`<div class="hcab"><h2>${esc(titulo || a.nombre)}</h2><span class="chip ok">en el móvil</span></div>
    <p class="visorMeta">${esc(a.nombre)}${a.fecha ? ` · ${dma(a.fecha)}` : ''}${a.tamano ? ` · ${peso(a.tamano)}` : ''}</p>
    <div class="visor">${!url ? '<p class="vacioV">Archivo de ejemplo sin contenido</p>' : a.tipo === 'foto' ? `<img src="${url}" alt="${esc(a.nombre)}">` : a.tipo === 'pdf' ? '<p class="vacioV">Abriendo el PDF…</p>' : '<p class="vacioV">Vista previa no disponible</p>'}</div>
    <div class="acciones"><button class="boton peligro" data-borrar>${icono('borrar')}Borrar</button><button class="boton" data-cerrar>Cerrar</button></div>`, { clase: 'hVisor', alCerrar: () => url && setTimeout(() => URL.revokeObjectURL(url), 400) });
  if (url && a.tipo === 'pdf') pintarPdf(r.blob, h.querySelector('.visor')).catch(() => { h.querySelector('.visor').innerHTML = '<p class="vacioV">No se pudo leer el PDF</p>'; });
  h.querySelector('[data-cerrar]').onclick = () => { tocar('toque'); cerrarHoja(); };
  const b = h.querySelector('[data-borrar]');
  b.onclick = async () => {
    tocar('toque');
    if (!b.classList.contains('seguro')) { b.classList.add('seguro'); b.lastChild.textContent = '¿Borrar? Toca otra vez'; return; }
    await cerrarHoja();
    const x = await cliente.borrarArchivo(id);
    if (x.estado === 200) { tocar('cerrar'); avisar('Archivo borrado del móvil'); }
  };
}
