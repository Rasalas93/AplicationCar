/** Arranque: crea el núcleo local, el cliente, la skin y las tres pantallas; enruta por #hash (atrás de Android incluido). */
import './estilos/base.css';
import './estilos/inicio.css';
import './estilos/gastos.css';
import './estilos/guantera.css';
import semilla from '../../datos/semilla.json';
import { crearApi } from '../nucleo/api.js';
import { repositorioLocal, almacenArchivos } from '../nucleo/almacen.js';
import { hoyLocal } from '../nucleo/fechas.js';
import { clienteLocal } from './cliente.js';
import { tema, aplicarTema, listaTemas, TEMA_POR_DEFECTO } from './skin/motor.js';
import { reproductor } from './sonido/reproductor.js';
import { usarSonido, tocar, abrirHoja, cerrarHoja, hojaAbierta, icono } from './ui.js';
import { pantallaInicio } from './pantallas/inicio.js';
import { pantallaGastos } from './pantallas/gastos.js';
import { pantallaGuantera } from './pantallas/guantera.js';

const q = new URLSearchParams(location.search);
const repo = repositorioLocal(q.has('limpio') ? `demo${Date.now()}:` : 'coche:v1:');
const hoy = () => q.get('hoy') || hoyLocal();
const api = crearApi({ semilla, repo, archivos: almacenArchivos(), hoy });
const cliente = clienteLocal(api, semilla.vehiculos[0].id);
const sonido = reproductor();
usarSonido(sonido);

let idTema = q.get('tema') || localStorage.getItem('coche:tema') || TEMA_POR_DEFECTO, T = tema(idTema);
const temaActual = () => T;
function ponerTema(id) {
  idTema = id; T = tema(id); localStorage.setItem('coche:tema', id);
  aplicarTema(T); sonido.usarTema(T); pintarNav(); refrescar();
}

const ir = destino => { location.hash = destino; };
function abrirAspecto() {
  const h = abrirHoja(`<div class="hcab"><h2>Aspecto</h2><span class="chip">${listaTemas().length} temas</span></div>
    <div class="temas">${listaTemas().map(t => `<button class="${t.id === idTema ? 'on' : ''}" data-tema="${t.id}" style="--a:${t.acento};--f:${t.fondo}"><i></i>${t.nombre}</button>`).join('')}</div>
    <label class="interruptor">Sonidos de la app<input type="checkbox" id="sonidoOn" ${sonido.silencio ? '' : 'checked'}></label>`);
  h.querySelectorAll('[data-tema]').forEach(b => b.onclick = () => { ponerTema(b.dataset.tema); tocar('toque'); h.querySelectorAll('[data-tema]').forEach(x => x.classList.toggle('on', x === b)); });
  h.querySelector('#sonidoOn').onchange = e => { sonido.silencio = !e.target.checked; tocar('toque'); };
}

const pantallas = {
  inicio: pantallaInicio({ raiz: document.getElementById('inicio'), cliente, temaActual, ir, abrirAspecto }),
  gastos: pantallaGastos({ raiz: document.getElementById('gastos'), cliente, temaActual }),
  guantera: pantallaGuantera({ raiz: document.getElementById('guantera'), cliente, temaActual })
};
let actual = null, faltanDocs = 0;

function pintarNav() {
  const V = T.voz, items = [['inicio', V.inicio], ['gastos', V.gastos], ['anotar', V.anotar], ['guantera', V.guantera], ['aspecto', 'Aspecto']];
  const nav = document.getElementById('nav');
  nav.innerHTML = items.map(([k, txt]) => `<button data-nav="${k}" class="${k === 'anotar' ? 'fab' : k === actual ? 'on' : ''}" aria-label="${txt}"><i>${icono(k)}${k === 'guantera' && faltanDocs ? `<u>${faltanDocs}</u>` : ''}</i>${txt}</button>`).join('');
  nav.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => {
    tocar('toque');
    const k = b.dataset.nav;
    if (k === 'anotar') { if (actual !== 'gastos') ir('gastos'); setTimeout(() => pantallas.gastos.abrirAlta(), actual === 'gastos' ? 0 : 60); }
    else if (k === 'aspecto') abrirAspecto();
    else ir(k);
  });
}

async function refrescar() {
  const r = await cliente.documentos();
  faltanDocs = r.resumen.faltan;
  await Promise.all(Object.values(pantallas).map(p => p.pintar()));
  pintarNav();
}

function mostrar() {
  const destino = (location.hash || '#inicio').slice(1);
  const id = pantallas[destino] ? destino : 'inicio';
  if (hojaAbierta()) cerrarHoja(true);
  for (const k in pantallas) document.getElementById(k).hidden = k !== id;
  if (actual !== id) document.getElementById(id).scrollTop = 0;
  actual = id;
  pantallas.inicio.activar(id === 'inicio' && !document.hidden);
  pintarNav();
}

window.addEventListener('hashchange', mostrar);
window.addEventListener('popstate', () => { if (hojaAbierta()) cerrarHoja(true); });
document.getElementById('sombra').onclick = () => cerrarHoja();
document.addEventListener('visibilitychange', () => pantallas.inicio.activar(actual === 'inicio' && !document.hidden));
cliente.alCambiar(() => refrescar());

aplicarTema(T); sonido.usarTema(T);
await document.fonts.ready;
await refrescar();
mostrar();
window.__app = { pantallas, cliente, sonido, ponerTema, ir, listo: true };
if ('serviceWorker' in navigator && import.meta.env.PROD && !q.has('sin-sw')) navigator.serviceWorker.register('sw.js');
