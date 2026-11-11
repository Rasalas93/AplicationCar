/** Presentador «coche-zonas» en 3D: el modelo del vehículo activo (Focus, coche o moto) con pintura PBR, estudio HDR, órbita táctil y zonas tocables. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const VISTA = new THREE.Vector3(7.9, 1.45, -5.5).normalize();
const ROJO_CANDY = 0x8e0a14;
const espera = ms => new Promise(r => setTimeout(r, ms));

/** ¿Hay WebGL? Si no, la pantalla se queda con el póster. */
export function hayWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** Placa española: una línea (coche) o dos (moto: números arriba, letras abajo). */
function placa(texto, dosLineas) {
  const [w, h] = dosLineas ? [330, 230] : [520, 112];
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#E9E9E4'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#0B2C9A'; g.fillRect(0, 0, 46, h);
  g.fillStyle = '#F2D21B'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.arc(23 + 11 * Math.cos(a), 36 + 11 * Math.sin(a), 1.8, 0, 7); g.fill(); }
  g.fillStyle = '#fff'; g.font = '700 26px "Inter", sans-serif'; g.textAlign = 'center'; g.fillText('E', 23, h - 20);
  g.fillStyle = '#111'; g.font = '700 74px "Roboto Condensed", "Inter", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (dosLineas) { const [a, b = ''] = texto.split(/\s+/); g.font = '700 92px "Roboto Condensed", "Inter", sans-serif'; g.fillText(a, 188, 66, 270); g.fillText(b, 188, 168, 270); }
  else g.fillText(texto, 284, 60, 450);
  g.strokeStyle = '#222'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/** Crea el visor. `alTocarZona(zona)` se llama al tocar una zona. */
/** Crea el visor; `cargar(modelo)` pone el modelo del vehículo (uno de MODELOS). `alTocarZona(zona)` se llama al tocar una zona. */
export function crearCoche3D({ contenedor, lienzo, entorno, base = '', alTocarZona }) {
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  const controles = new OrbitControls(camara, lienzo);
  Object.assign(controles, { enableDamping: true, dampingFactor: 0.08, enablePan: false, minDistance: 6, maxDistance: 16, minPolarAngle: 0.5, maxPolarAngle: 1.52, autoRotate: true, autoRotateSpeed: 0.55, rotateSpeed: 0.8 });
  let quieto = 0;
  controles.addEventListener('start', () => { controles.autoRotate = false; quieto = 0; });

  const capa = document.createElement('div'); capa.className = 'zonas3d'; contenedor.appendChild(capa);
  const puntos = new Map();
  const objetivo = new THREE.Vector3(), cargador = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder), modelos = new Map();
  let visible = null, cambiando = false, listo = Promise.resolve(null), turno = 0, activo = true, ultimo = 0, distancia = 10, mitad = 2.3;
  const deseo = { color: null, placa: '' };

  const estudio = (async () => {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const hdr = await new HDRLoader().loadAsync(entorno);
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    escena.environment = pmrem.fromEquirectangular(hdr).texture;
    escena.environmentRotation.set(0, Math.PI * 0.5, 0);
    hdr.dispose();
    escena.add(suelo());
  })();

  /** Prepara un modelo una sola vez: pintura PBR propia, acento Rojo Candy, reflejo en el suelo. */
  function montar(raiz, m) {
    let pintura = null, acento = null;
    const placas = [];
    raiz.traverse(o => {
      if (!o.isMesh) return;
      const n = o.material.name;
      if (n === m.pintura.material) {
        pintura = pintura || new THREE.MeshPhysicalMaterial({ name: n, color: ROJO_CANDY, metalness: m.pintura.metal, roughness: m.pintura.rugosidad, clearcoat: 1, clearcoatRoughness: 0.035, envMapIntensity: 1.15 });
        o.material = pintura;
      }
      if (n === m.acento) o.material = acento = acento || new THREE.MeshPhysicalMaterial({ name: n, color: ROJO_CANDY, metalness: 0.62, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.035, envMapIntensity: 1.15 });
      if (n === 'glass') Object.assign(o.material, { roughness: 0.02, envMapIntensity: 1.4 });
      if (n === 'chrome' || n === 'alloy') o.material.envMapIntensity = 1.3;
      if (n === 'plate') placas.push(o);
    });
    const grupo = new THREE.Group(), reflejo = raiz.clone();
    reflejo.scale.y = -1; reflejo.position.y = -0.002;
    grupo.add(raiz, reflejo);
    return { m, raiz, grupo, pintura, placas, lisas: placas.map(p => p.material), texto: null };
  }

  function preparar(m) {
    if (!modelos.has(m.id)) modelos.set(m.id, cargador.loadAsync(base + m.glb).then(g => montar(g.scene, m)).catch(e => { modelos.delete(m.id); throw e; }));
    return modelos.get(m.id);
  }

  /** Cambia al modelo `m` con un fundido: solo se descarga el GLB del modelo que se pide. */
  function cargar(m) {
    const t = ++turno;
    if (visible && visible.m === m) { listo = Promise.resolve(visible); aplicar(); return listo; }
    const habia = !!visible;
    cambiando = true; contenedor.classList.add('cambiando');
    listo = Promise.all([preparar(m), estudio, habia && espera(260)]).then(([e]) => {
      if (t !== turno) return null;
      if (visible) escena.remove(visible.grupo);
      visible = e; escena.add(e.grupo);
      objetivo.fromArray(m.objetivo); mitad = m.mitad; encuadrar();
      controles.target.copy(objetivo);
      camara.position.copy(objetivo).addScaledVector(m.vista ? new THREE.Vector3(...m.vista).normalize() : VISTA, distancia);
      controles.autoRotate = true; quieto = 0;
      cambiando = false; aplicar();
      contenedor.classList.remove('cambiando');
      return e;
    }, err => { if (t === turno) { cambiando = false; contenedor.classList.remove('cambiando'); } throw err; });
    return listo;
  }

  /** Lleva al modelo visible la pintura, la matrícula y las zonas pedidas. */
  function aplicar() {
    if (!visible) return;
    if (deseo.color && visible.pintura) visible.pintura.color.set(deseo.color);
    ponerPlaca(visible, deseo.placa);
    colocarPuntos(); render(0);
  }

  function suelo() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 10, 128, 128, 128);
    r.addColorStop(0, 'rgba(4,3,6,.9)'); r.addColorStop(0.12, 'rgba(4,3,6,.95)'); r.addColorStop(0.24, 'rgba(4,3,6,1)'); r.addColorStop(0.85, 'rgba(4,3,6,1)'); r.addColorStop(1, 'rgba(4,3,6,0)');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
    const s = g.createRadialGradient(128, 128, 0, 128, 128, 60);
    s.addColorStop(0, 'rgba(0,0,0,.5)'); s.addColorStop(1, 'rgba(0,0,0,0)');
    g.save(); g.scale(1, 0.46); g.translate(0, 150); g.fillStyle = s; g.fillRect(0, 0, 256, 256); g.restore();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, color: 0xffffff, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.renderOrder = 1;
    m.name = 'suelo';
    return m;
  }

  function encuadrar() {
    const w = contenedor.clientWidth, h = contenedor.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camara.fov / 2)) * camara.aspect);
    distancia = Math.max(6.4 * mitad / 2.3, mitad / Math.tan(hfov / 2));
    controles.maxDistance = distancia * 1.5; controles.minDistance = distancia * 0.62;
    camara.updateProjectionMatrix();
  }

  function colocarPuntos() {
    if (!visible) return;
    const ray = new THREE.Raycaster(), cuerpos = [], definiciones = visible.m.zonas;
    visible.raiz.traverse(o => o.isMesh && cuerpos.push(o));
    visible.raiz.updateMatrixWorld(true);
    for (const [id, p] of puntos) {
      p.pos = null;
      const d = definiciones[id]; if (!d) continue;
      ray.set(new THREE.Vector3(...d.rayo[0]), new THREE.Vector3(...d.rayo[1]).normalize());
      const hit = ray.intersectObjects(cuerpos, false)[0];
      if (!hit) continue;
      p.pos = hit.point.clone();
      p.normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    }
  }

  const v = new THREE.Vector3(), aCam = new THREE.Vector3();
  let tapas = null;
  function moverPuntos() {
    const w = contenedor.clientWidth, h = contenedor.clientHeight, vistos = [];
    for (const p of puntos.values()) {
      p.el.style.opacity = p.pos ? '' : 0;
      if (!p.pos) continue;
      v.copy(p.pos).project(camara);
      aCam.copy(camara.position).sub(p.pos).normalize();
      p.x = (v.x + 1) / 2 * w; p.y = (1 - v.y) / 2 * h; p.ve = p.normal.dot(aCam) > 0.02;
      p.el.classList.toggle('oculta', !p.ve);
      if (p.ve) vistos.push(p);
    }
    vistos.sort((a, b) => a.y - b.y);
    const G = 4, R = 8 + G, todos = [...puntos.values()].filter(p => p.pos), c0 = contenedor.getBoundingClientRect(), cajas = [];
    tapas ??= [...contenedor.children].filter(e => +getComputedStyle(e).zIndex > +getComputedStyle(capa).zIndex).flatMap(e => e.children.length ? [...e.children] : [e]).map(e => ({ e, blanda: getComputedStyle(e).pointerEvents === 'none' }));
    const sobre = tapas.map(({ e, blanda }) => ({ blanda, r: e.getBoundingClientRect() })).filter(t => t.r.width).map(({ blanda, r }) => ({ blanda, l: r.left - c0.left, r: r.right - c0.left, t: r.top - c0.top, b: r.bottom - c0.top }));
    for (const p of vistos) {
      const a = p.el.offsetWidth, hs = p.el.querySelector('span').offsetHeight, cabe = izq => izq ? p.x + 8 - a >= 6 : p.x + a - 8 <= w - 6;
      let mejor = null;
      for (const izq of [!cabe(false), cabe(false)]) {
        if (mejor && !cabe(izq)) continue;
        const l = izq ? p.x + 8 - a : p.x + 14, r = izq ? p.x - 12 : p.x - 8 + a;
        const estorbos = conBlandas => [...cajas, ...sobre.filter(c => conBlandas || !c.blanda)].filter(c => l < c.r + G && c.l < r + G).map(c => [c.t - G, c.b + G])
          .concat(todos.filter(o => o !== p && l < o.x + R && o.x - R < r).map(o => [o.y - R, o.y + R]));
        const huecos = e => [0, ...e.flatMap(([t, b]) => [b - p.y + hs / 2, t - p.y - hs / 2])].filter(dy => e.every(([t, b]) => p.y + dy + hs / 2 <= t || p.y + dy - hs / 2 >= b)).sort((m, n) => Math.abs(m) - Math.abs(n));
        const dentro = d => p.y + d - hs / 2 >= 0 && p.y + d + hs / 2 <= h, todas = huecos(estorbos(true)), duras = huecos(estorbos(false));
        const [nivel, dy] = todas.some(dentro) ? [0, todas.find(dentro)] : duras.some(dentro) ? [1, duras.find(dentro)] : [2, todas[0]];
        if (!mejor || nivel < mejor.nivel || nivel === mejor.nivel && Math.abs(dy) < Math.abs(mejor.dy)) mejor = { izq, l, r, dy, nivel };
      }
      Object.assign(p, mejor); p.el.classList.toggle('izq', p.izq);
      cajas.push({ l: p.l, r: p.r, t: p.y + p.dy - hs / 2, b: p.y + p.dy + hs / 2 });
    }
    for (const p of puntos.values()) if (p.x != null) { p.el.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)`; p.el.style.setProperty('--dy', `${(p.dy || 0).toFixed(1)}px`); }
  }

  function render(dt) {
    if (!visible) return;
    if (!controles.autoRotate && (quieto += dt) > 4) controles.autoRotate = true;
    controles.update(dt);
    renderer.render(escena, camara);
    moverPuntos();
  }

  function bucle(t) {
    if (!activo) return;
    const dt = ultimo ? Math.min(0.1, (t - ultimo) / 1000) : 0.016; ultimo = t;
    render(dt);
    requestAnimationFrame(bucle);
  }

  /** Dibuja la matrícula en las placas del modelo; sin texto, las placas quedan lisas. */
  function ponerPlaca(e, texto) {
    if (e.texto === texto) return;
    e.texto = texto;
    if (!texto) { e.placas.forEach((p, i) => { p.material = e.lisas[i]; }); return; }
    document.fonts.ready.then(() => {
      if (e.texto !== texto) return;
      const t = placa(texto, e.m.id === 'moto');
      for (const p of e.placas) p.material = new THREE.MeshStandardMaterial({ map: t, roughness: 0.4, metalness: 0 });
      for (const p of e.placas) {
        const pos = p.geometry.attributes.position, uv = new Float32Array(pos.count * 2), b = new THREE.Box3().setFromBufferAttribute(pos);
        const t = new THREE.Vector3(), mundo = new THREE.Vector3(), cen = b.getCenter(new THREE.Vector3()).applyMatrix4(p.matrixWorld);
        const ancho = [], alto = [];
        for (let i = 0; i < pos.count; i++) { mundo.fromBufferAttribute(pos, i).applyMatrix4(p.matrixWorld).sub(cen); ancho.push(mundo.z * (cen.x > 0 ? 1 : -1)); alto.push(mundo.y); }
        const [a0, a1, h0, h1] = [Math.min(...ancho), Math.max(...ancho), Math.min(...alto), Math.max(...alto)];
        for (let i = 0; i < pos.count; i++) { uv[i * 2] = (a1 - ancho[i]) / (a1 - a0); uv[i * 2 + 1] = (alto[i] - h0) / (h1 - h0); }
        p.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        void t;
      }
      if (visible === e) render(0);
    });
  }

  new ResizeObserver(() => { encuadrar(); if (visible) render(0); }).observe(contenedor);
  encuadrar();

  return {
    cargar,
    /** Promesa del último modelo pedido (null si otro lo sustituyó). */
    get listo() { return listo; },
    /** Id del modelo visible. */
    get modelo() { return visible ? visible.m.id : null; },
    /** Color de la pintura (dato del vehículo). */
    pintar(hex) { deseo.color = hex; if (!cambiando && visible && visible.pintura) { visible.pintura.color.set(hex); render(0); } },
    /** Color de la pintura visible, en hex. */
    get color() { return visible && visible.pintura ? `#${visible.pintura.color.getHexString()}` : null; },
    /** Matrícula del vehículo en sus placas (dato del vehículo, nunca en la pantalla). */
    matricula(texto) { deseo.placa = texto || ''; if (!cambiando && visible) ponerPlaca(visible, deseo.placa); },
    /** Texto dibujado en las placas del modelo visible. */
    get placa() { return visible ? visible.texto : null; },
    /** Zonas que vienen del núcleo: [{ zona, nivel, titulo, dato }]. */
    zonas(lista) {
      capa.innerHTML = ''; puntos.clear();
      for (const z of lista) {
        const el = document.createElement('button');
        el.className = 'zona'; el.dataset.nivel = z.nivel; el.dataset.zona = z.zona;
        el.innerHTML = `<i></i><span><b>${z.titulo}</b><small>${z.dato}</small></span>`;
        el.setAttribute('aria-label', `${z.titulo}: ${z.dato}`);
        el.addEventListener('click', e => { e.stopPropagation(); alTocarZona(z); });
        capa.appendChild(el);
        puntos.set(z.zona, { el });
      }
      if (!cambiando && visible) { colocarPuntos(); render(0); }
    },
    activar(si) { if (si === activo) return; activo = si; ultimo = 0; if (si) requestAnimationFrame(bucle); },
    /** Avanza el tiempo a mano (vídeo de demostración, fotograma a fotograma). */
    paso(dt) { activo = false; render(dt); },
    get controles() { return controles; },
    /** Punto 3D de cada zona en el mundo (para medir dónde cae su etiqueta). */
    anclas() { return [...puntos].filter(([, p]) => p.pos).map(([zona, p]) => ({ zona, pos: p.pos.clone() })); },
    iniciar() { requestAnimationFrame(bucle); }
  };
}
