/** Presentador «coche-zonas» en 3D: el Focus (GLB de focus.py) con pintura PBR, estudio HDR, órbita táctil y zonas tocables. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const OBJETIVO = new THREE.Vector3(0.05, 0.78, 0);
const VISTA = new THREE.Vector3(7.9, 1.45, -5.5).normalize();

/** ¿Hay WebGL? Si no, la pantalla se queda con el póster. */
export function hayWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

function placa(texto) {
  const c = document.createElement('canvas'); c.width = 520; c.height = 112;
  const g = c.getContext('2d');
  g.fillStyle = '#E9E9E4'; g.fillRect(0, 0, 520, 112);
  g.fillStyle = '#0B2C9A'; g.fillRect(0, 0, 46, 112);
  g.fillStyle = '#F2D21B'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.arc(23 + 11 * Math.cos(a), 36 + 11 * Math.sin(a), 1.8, 0, 7); g.fill(); }
  g.fillStyle = '#fff'; g.font = '700 26px "Inter", sans-serif'; g.textAlign = 'center'; g.fillText('E', 23, 92);
  g.fillStyle = '#111'; g.font = '700 74px "Roboto Condensed", "Inter", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(texto, 284, 60, 450);
  g.strokeStyle = '#222'; g.lineWidth = 4; g.strokeRect(2, 2, 516, 108);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/** Crea el visor. `alTocarZona(zona)` se llama al tocar una zona. */
export function crearCoche3D({ contenedor, lienzo, modelo, entorno, alTocarZona, definiciones }) {
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  const controles = new OrbitControls(camara, lienzo);
  Object.assign(controles, { enableDamping: true, dampingFactor: 0.08, enablePan: false, minDistance: 6, maxDistance: 16, minPolarAngle: 0.5, maxPolarAngle: 1.52, autoRotate: true, autoRotateSpeed: 0.55, rotateSpeed: 0.8 });
  controles.target.copy(OBJETIVO);
  let quieto = 0;
  controles.addEventListener('start', () => { controles.autoRotate = false; quieto = 0; });

  const capa = document.createElement('div'); capa.className = 'zonas3d'; contenedor.appendChild(capa);
  const puntos = new Map();
  let coche = null, pintura = null, placas = [], activo = true, ultimo = 0, distancia = 10;

  const listo = (async () => {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const hdr = await new HDRLoader().loadAsync(entorno);
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    escena.environment = pmrem.fromEquirectangular(hdr).texture;
    escena.environmentRotation.set(0, Math.PI * 0.5, 0);
    hdr.dispose();
    const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(modelo);
    coche = gltf.scene;
    coche.traverse(o => {
      if (!o.isMesh) return;
      const n = o.material.name;
      if (n === 'paint') {
        pintura = pintura || new THREE.MeshPhysicalMaterial({ name: 'paint', color: 0x8e0a14, metalness: 0.62, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.035, envMapIntensity: 1.15 });
        o.material = pintura;
      }
      if (n === 'glass') Object.assign(o.material, { roughness: 0.02, envMapIntensity: 1.4 });
      if (n === 'chrome' || n === 'alloy') o.material.envMapIntensity = 1.3;
      if (n === 'plate') placas.push(o);
    });
    escena.add(coche);
    const reflejo = coche.clone(); reflejo.scale.y = -1; reflejo.position.y = -0.002; escena.add(reflejo);
    escena.add(suelo());
    return true;
  })();

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
    distancia = Math.max(6.4, 2.3 / Math.tan(hfov / 2));
    controles.maxDistance = distancia * 1.5; controles.minDistance = distancia * 0.62;
    camara.updateProjectionMatrix();
  }

  function colocarPuntos() {
    if (!coche) return;
    const ray = new THREE.Raycaster(), cuerpos = [];
    coche.traverse(o => o.isMesh && cuerpos.push(o));
    coche.updateMatrixWorld(true);
    for (const [id, p] of puntos) {
      const d = definiciones[id]; if (!d) continue;
      ray.set(new THREE.Vector3(...d.rayo[0]), new THREE.Vector3(...d.rayo[1]).normalize());
      const hit = ray.intersectObjects(cuerpos, false)[0];
      if (!hit) continue;
      p.pos = hit.point.clone();
      p.normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    }
  }

  const v = new THREE.Vector3(), aCam = new THREE.Vector3();
  function moverPuntos() {
    const w = contenedor.clientWidth, h = contenedor.clientHeight, vistos = [];
    for (const p of puntos.values()) {
      if (!p.pos) { p.el.style.opacity = 0; continue; }
      v.copy(p.pos).project(camara);
      aCam.copy(camara.position).sub(p.pos).normalize();
      p.x = (v.x + 1) / 2 * w; p.y = (1 - v.y) / 2 * h; p.ve = p.normal.dot(aCam) > 0.02;
      p.el.classList.toggle('oculta', !p.ve);
      if (p.ve) vistos.push(p);
    }
    for (const p of vistos) { const a = p.el.offsetWidth, izq = p.x + a - 8 > w - 6; p.el.classList.toggle('izq', izq); p.l = izq ? p.x + 8 - a : p.x - 8; p.r = p.l + a; }
    vistos.sort((a, b) => a.y - b.y);
    for (let i = 0; i < vistos.length; i++) {
      const p = vistos[i]; p.dy = 0;
      for (let j = 0; j < i; j++) { const o = vistos[j]; if (p.l < o.r + 4 && o.l < p.r + 4 && p.y + p.dy - (o.y + o.dy) < 40) p.dy = o.y + o.dy + 40 - p.y; }
    }
    for (const p of puntos.values()) if (p.x != null) { p.el.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)`; p.el.style.setProperty('--dy', `${(p.dy || 0).toFixed(1)}px`); }
  }

  function render(dt) {
    if (!coche) return;
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

  new ResizeObserver(() => { encuadrar(); if (coche) render(0); }).observe(contenedor);
  encuadrar();
  camara.position.copy(OBJETIVO).addScaledVector(VISTA, distancia);

  return {
    listo,
    /** Color de la pintura (dato del vehículo). */
    pintar(hex) { listo.then(() => pintura.color.set(hex)); },
    /** Matrícula del vehículo en las dos placas (dato de la semilla, nunca en la pantalla). */
    matricula(texto) {
      listo.then(() => document.fonts.ready).then(() => {
        const t = placa(texto);
        for (const p of placas) p.material = new THREE.MeshStandardMaterial({ map: t, roughness: 0.4, metalness: 0 });
        for (const p of placas) {
          const pos = p.geometry.attributes.position, uv = new Float32Array(pos.count * 2), b = new THREE.Box3().setFromBufferAttribute(pos);
          const t = new THREE.Vector3(), mundo = new THREE.Vector3(), cen = b.getCenter(new THREE.Vector3()).applyMatrix4(p.matrixWorld);
          const ancho = [], alto = [];
          for (let i = 0; i < pos.count; i++) { mundo.fromBufferAttribute(pos, i).applyMatrix4(p.matrixWorld).sub(cen); ancho.push(mundo.z * (cen.x > 0 ? 1 : -1)); alto.push(mundo.y); }
          const [a0, a1, h0, h1] = [Math.min(...ancho), Math.max(...ancho), Math.min(...alto), Math.max(...alto)];
          for (let i = 0; i < pos.count; i++) { uv[i * 2] = (ancho[i] - a0) / (a1 - a0); uv[i * 2 + 1] = (alto[i] - h0) / (h1 - h0); }
          p.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
          void t;
        }
      });
    },
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
      listo.then(() => { colocarPuntos(); render(0); });
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
