/* Temas de Copiloto: cada tema es un objeto de datos con la forma `Tema` (ver notas.md). */
window.TEMAS = {
  atardecer: {
    id: 'atardecer', nombre: 'Atardecer en la sierra',
    cielo: {
      gradiente: [[0, '#04050C'], [60, '#090D26'], [112, '#191A48'], [150, '#40245C'], [176, '#873A5E'], [194, '#D25E3E'], [205, '#F29646'], [212, '#FFC873']],
      sol: { x: 195, y: 209, radio: 44, disco: 8, color: '#FFE2A6', halo: '#FF7A2E', fuerza: 0.95 },
      nubes: { cobertura: 0.47, escala: 0.0021, estira: 0.42, altura: 520, luz: '#FF9C62', sombra: '#35234E', opacidad: 0.92, semilla: 11 },
      estrellas: 0.55
    },
    bruma: '#D9683C',
    terreno: {
      capas: [
        { tipo: 'sierra', alto: 30, pie: 0, frec: 0.011, semilla: 3, valle: 0.82, anchoValle: 85, sombra: '#8B4A66', luz: '#D07A5C', bruma: 0.5, relieve: 0.5 },
        { tipo: 'sierra', alto: 58, pie: 0, frec: 0.013, semilla: 9, valle: 0.86, anchoValle: 78, sombra: '#522A58', luz: '#A8565A', bruma: 0.26, relieve: 0.8 },
        { tipo: 'sierra', alto: 48, pie: 0, frec: 0.019, semilla: 21, valle: 0.93, anchoValle: 96, sombra: '#2B153C', luz: '#6E3550', bruma: 0.1, relieve: 1, arbol: { tipo: 'copa', alto: 2.2, ancho: 3.5 } },
        { tipo: 'sierra', alto: 17, pie: 0, frec: 0.034, semilla: 40, valle: 0.97, anchoValle: 70, sombra: '#150B1F', luz: '#3A1C34', bruma: 0, relieve: 0.7, arbol: { tipo: 'copa', alto: 3.4, ancho: 5 } }
      ],
      suelo: { colores: ['#17121C', '#3B2A26', '#6A4A28'], densidad: 1 / 15000, oscuro: 0.34, resplandor: 0.75 },
      vegetacion: [
        { tipo: 'encina', n: 16, z: [4200, 17000], x: [1000, 7000], alto: [300, 520], semilla: 5, color: '#160C1C', luz: '#7A3A34' },
        { tipo: 'arbusto', n: 34, z: [1500, 9000], x: [520, 3200], alto: [50, 130], semilla: 8, color: '#1A0F1C', luz: '#6A3A2C' },
        { tipo: 'valla', z: [380, 9000], x: 545, paso: 420, alto: 170, color: '#1B1218', luz: '#C9703C' },
        { tipo: 'mata', n: 90, z: [150, 2600], x: [462, 900], alto: [26, 70], semilla: 2, color: '#3A2A22', luz: '#B77A3C' }
      ]
    },
    carretera: { asfalto: '#1B1B22', linea: '#EDEAE0', pintura: '#F1EEE4', pinturaAcento: '#FFB01F', mojado: 0.1, brillo: 0.75 },
    acento: '#FFB01F', acento2: '#FF8A1F',
    texto: { fondo: '#07080C', tarjeta: ['#141722', '#0E1017'], odometro: ['#FFFFFF', '#FFD9A0', '#FF8A3C'], sombra: 'rgba(255,120,40,.38)', tenue: '#9AA0BC' },
    grano: 0.085
  },

  costa: {
    id: 'costa', nombre: 'Mañana en la costa',
    cielo: {
      gradiente: [[0, '#072A5C'], [50, '#124B8B'], [92, '#2E7BB8'], [114, '#8CC2DD'], [124, '#D9ECE8'], [127, '#F4E8CE']],
      sol: { x: 26, y: 113, radio: 30, disco: 5, color: '#FFF6DC', halo: '#FFE0AE', fuerza: 0.6 },
      nubes: { cobertura: 0.36, escala: 0.0017, estira: 0.36, altura: 620, luz: '#FFFFFF', sombra: '#8FB2D2', opacidad: 0.85, semilla: 4 },
      estrellas: 0
    },
    bruma: '#CFE3E6',
    mar: { horizonte: 127, lejos: '#7FB6CF', cerca: '#0B5880', destello: 1.1, espuma: '#F4FBFA' },
    terreno: {
      capas: [
        { tipo: 'sierra', alto: 11, pie: 85, frec: 0.02, semilla: 12, forma: 'izq', sombra: '#6F97AE', luz: '#A9C4CC', bruma: 0.55, relieve: 0.3 },
        { tipo: 'sierra', alto: 46, pie: 78, frec: 0.012, semilla: 31, forma: 'der', inicio: 215, sombra: '#587F8E', luz: '#B9C7B0', bruma: 0.42, relieve: 0.6 },
        { tipo: 'sierra', alto: 84, pie: 34, frec: 0.016, semilla: 7, forma: 'der', inicio: 262, sombra: '#2F4E4C', luz: '#B9B089', bruma: 0.14, relieve: 1, arbol: { tipo: 'copa', alto: 1.8, ancho: 3 }, orilla: '#F2F6EE' },
        { tipo: 'sierra', alto: 9, pie: 0, frec: 0.05, semilla: 44, valle: 0.75, anchoValle: 40, sombra: '#17301F', luz: '#6F8A4A', bruma: 0, relieve: 0.6, arbol: { tipo: 'copa', alto: 4, ancho: 6 } }
      ],
      suelo: { colores: ['#2A3B26', '#7A7446', '#C9B68A'], densidad: 1 / 26000, oscuro: 0.5, resplandor: 0.15 },
      vegetacion: [
        { tipo: 'pinonero', n: 13, z: [2100, 11000], x: [700, 3600], alto: [640, 980], semilla: 23, color: '#12301F', luz: '#8FAE4E' },
        { tipo: 'arbusto', n: 40, z: [1500, 9000], x: [520, 3000], alto: [50, 130], semilla: 6, color: '#1B3A22', luz: '#9DB25A' },
        { tipo: 'guardarrail', z: [260, 12000], x: -535, paso: 300, alto: 120, color: '#5C666A', luz: '#EEF3F2' },
        { tipo: 'mata', n: 90, z: [150, 2600], x: [462, 900], alto: [24, 64], semilla: 9, color: '#4B5A30', luz: '#D8C98A' }
      ]
    },
    carretera: { asfalto: '#3A3D44', linea: '#F4F2EA', pintura: '#F6F4EC', pinturaAcento: '#FFC83D', mojado: 0.06, brillo: 0.3 },
    acento: '#5CF0DC', acento2: '#19B9C9',
    texto: { fondo: '#050C12', tarjeta: ['#0F1E28', '#0A141B'], odometro: ['#FFFFFF', '#F6FCFF', '#C9F1F6'], sombra: 'rgba(3,38,70,.6)', tenue: '#DCEBF2' },
    grano: 0.07
  },

  bosque: {
    id: 'bosque', nombre: 'Bosque con niebla',
    cielo: {
      gradiente: [[0, '#162226'], [70, '#30464A'], [140, '#5C7674'], [190, '#819A93'], [212, '#93AAA1']],
      sol: { x: 195, y: 186, radio: 95, disco: 0, color: '#D6E4D8', halo: '#B9CDC2', fuerza: 0.42 },
      nubes: { cobertura: 0.78, escala: 0.0019, estira: 0.5, altura: 380, luz: '#8EA69F', sombra: '#3B5053', opacidad: 0.7, semilla: 6 },
      estrellas: 0
    },
    bruma: '#8FA7A0',
    terreno: {
      capas: [
        { tipo: 'sierra', alto: 74, pie: 0, frec: 0.009, semilla: 14, valle: 0.72, anchoValle: 80, sombra: '#6C8782', luz: '#86A098', bruma: 0.62, relieve: 0.25, arbol: { tipo: 'pino', alto: 3.5, ancho: 2.4 } },
        { tipo: 'sierra', alto: 62, pie: 0, frec: 0.014, semilla: 27, valle: 0.88, anchoValle: 62, sombra: '#4A6562', luz: '#6C8782', bruma: 0.4, relieve: 0.3, arbol: { tipo: 'pino', alto: 6, ancho: 3.4 } }
      ],
      suelo: { colores: ['#0E1915', '#1D3324', '#3C4E30'], densidad: 1 / 4200, oscuro: 0.42, resplandor: 0.3 },
      vegetacion: [
        { tipo: 'pino', n: 120, z: [1500, 14000], x: [640, 5200], alto: [900, 1750], semilla: 17, color: '#0B1714', luz: '#2E4A3A' },
        { tipo: 'mata', n: 120, z: [150, 2600], x: [462, 950], alto: [30, 80], semilla: 4, color: '#16281C', luz: '#5C7A44' }
      ],
      velos: [{ z: 9000, alfa: 0.4 }, { z: 5600, alfa: 0.34 }, { z: 3400, alfa: 0.26 }, { z: 2200, alfa: 0.16 }]
    },
    carretera: { asfalto: '#1C2224', linea: '#DDE3DC', pintura: '#E6EBE4', pinturaAcento: '#F2C84B', mojado: 0.42, brillo: 0.2 },
    acento: '#BFE36C', acento2: '#7FC25A',
    texto: { fondo: '#060A09', tarjeta: ['#111B18', '#0A1210'], odometro: ['#FFFFFF', '#F1F8F2', '#C4DCCB'], sombra: 'rgba(6,22,18,.7)', tenue: '#D5E2DC' },
    grano: 0.09
  },

  noche: {
    id: 'noche', nombre: 'Noche de lluvia en la ciudad',
    cielo: {
      gradiente: [[0, '#04050D'], [80, '#0A0D28'], [150, '#1B1846'], [192, '#41245C'], [212, '#74345E']],
      sol: null,
      nubes: { cobertura: 0.72, escala: 0.0018, estira: 0.45, altura: 400, luz: '#5B2F68', sombra: '#090A1C', opacidad: 0.8, semilla: 19 },
      estrellas: 0
    },
    bruma: '#3D2552',
    terreno: {
      capas: [
        { tipo: 'ciudad', alto: 62, pie: 0, semilla: 5, valle: 0.6, anchoValle: 62, sombra: '#1E1B46', bruma: 0.45, ventanas: 0.22, ancho: [7, 16] },
        { tipo: 'ciudad', alto: 104, pie: 0, semilla: 13, valle: 0.9, anchoValle: 52, sombra: '#0B0C1E', bruma: 0.12, ventanas: 0.3, ancho: [13, 30] }
      ],
      suelo: { colores: ['#0B0C16', '#14162A', '#1F2140'], densidad: 1 / 9000, oscuro: 0.6, resplandor: 0.5 },
      vegetacion: [
        { tipo: 'farola', z: [1250, 12000], x: 560, paso: 1150, alto: 920, color: '#0A0B14', luz: '#FFC98A' }
      ],
      luces: [
        { x: -95, z: 2900, h: 110, color: '#FF2A3C', i: 1.2, r: 3.2 }, { x: -235, z: 2900, h: 110, color: '#FF2A3C', i: 1.2, r: 3.2 },
        { x: 70, z: 6400, h: 110, color: '#FF2A3C', i: 1, r: 2.4 }, { x: 190, z: 6400, h: 110, color: '#FF2A3C', i: 1, r: 2.4 },
        { x: -2500, z: 8200, h: 900, color: '#FF4D9A', i: 1.5, r: 7 }, { x: 2900, z: 9000, h: 1250, color: '#35D7FF', i: 1.5, r: 7 },
        { x: 1500, z: 5200, h: 620, color: '#FFB347', i: 1.1, r: 6 }, { x: -1250, z: 4300, h: 520, color: '#7C6BFF', i: 1.1, r: 6 },
        { x: 640, z: 15000, h: 1500, color: '#3CFF9A', i: 1.3, r: 2.6 }
      ]
    },
    carretera: { asfalto: '#0F1119', linea: '#D9DBE8', pintura: '#E9E9F2', pinturaAcento: '#FFC83D', mojado: 0.92, brillo: 0 },
    lluvia: 1,
    acento: '#FF5C8E', acento2: '#C13CFF',
    texto: { fondo: '#06060C', tarjeta: ['#141428', '#0C0C17'], odometro: ['#FFFFFF', '#EBDFFF', '#FF9BBB'], sombra: 'rgba(255,60,150,.36)', tenue: '#A9A5CC' },
    grano: 0.08
  }
};

/* Tokens que un tema antiguo no trae: aspecto Copiloto por defecto (`categorias` y las voces de Gastos son de T1634; `null` = color de acento). */
window.TEMA_BASE = {
  texto: { tinta: '#F5F2E9' },
  estados: { alerta: '#FF4D5E', falta: '#FFB01F', ok: '#39D98A' },
  categorias: { combustible: null, peajes: '#5AA9FF', mantenimiento: '#B58CFF', otros: '#9AA0BC', itv: '#3FD6C6', impuestos: '#FF7A9E', seguro: '#8FD14F', multas: '#FF4D5E' },
  fuentes: { titulo: '"Inter Display","Inter"', texto: '"Inter"', dato: '"JetBrains Mono"', espaciado: '.02em', mayusculas: 'none' },
  marco: { corte: 0, radio: 16, linea: 'rgba(255,255,255,.12)', esquinas: 0, grosor: 1, bisel: null, tinte: 80, relieve: 0, tornillo: 'none' },
  brillo: 0.35,
  lineas: 0,
  escena: { tipo: 'paisaje', velo: 0.62 },
  nave: { trazo: '#F5F2E9', relleno: 0.05, trama: 0, material: 'trazo' },
  formas: { ventana: 'linea', guia: 'linea', odometro: 'cifra', luz: 'cuadro', fab: 'marco', arranque: 'trazado', entrada: 'parpadeo' },
  material: { cromo: [[0, '#FFFFFF'], [1, '#888888']], cristal: [[0, '#111111'], [1, '#000000']], goma: [[0, '#333333'], [1, '#000000']], acero: '#999999', aceroFondo: '#666666', aceroOsc: '#222222', gomaBase: '#222222', hueco: '#000000', placa: 'none', banda: 'none', tambor: 'none', titulo: null, fab: null },
  voz: { marca: 'Copiloto', inicio: 'Inicio', taller: 'Taller', repostar: 'Repostar', agenda: 'Agenda', guantera: 'Guantera', motor: 'Motor', casco: 'Papeles', bitacora: 'Próximas fechas', telemetria: 'Consumo y km', archivo: 'Guantera', alerta: 'Aviso', falta: 'Falta dato', ok: 'En regla', cuenta: 'En', escaner: 'Revisión del coche', gastos: 'Gastos', anotar: 'Anotar', gastado: 'Gastado este mes', prevision: 'Previsión', medias: 'Gasto medio del coche', semanas: 'Semana a semana', reparto: 'Por categoría', ultimos: 'Últimos gastos', porque: 'Por qué' },
  sonidos: { ambiente: [110, 164.81, 220.2], barrido: [240, 2600, 500], tic: 1850, alerta: [587.3, 440], cierre: [880, 1318.5, 1760] }
};

/* Skin «Puente de mando»: la misma pantalla, leída como el puente de una nave. */
window.TEMAS.puente = {
  id: 'puente', nombre: 'Puente de mando',
  acento: '#6FE6FF', acento2: '#2A9DFF',
  texto: { fondo: '#02050B', tarjeta: ['#0B1626', '#050B15'], odometro: ['#FFFFFF', '#C9F6FF', '#6FE6FF'], sombra: 'rgba(60,200,255,.4)', tenue: '#7F9BB8', tinta: '#E8F8FF' },
  estados: { alerta: '#FF3B52', falta: '#FFB52E', ok: '#4DF0C0' },
  fuentes: { titulo: '"Chakra Petch"', texto: '"Roboto Condensed"', dato: '"JetBrains Mono"', espaciado: '.12em', mayusculas: 'uppercase' },
  marco: { corte: 9, radio: 0, linea: 'rgba(111,230,255,.36)', esquinas: 1 },
  brillo: 1,
  lineas: 0.04,
  escena: { tipo: 'rejilla', estrellas: 150, nebulosa: ['#123A6B', '#3A1140'] },
  nave: { trazo: '#C9F6FF', relleno: 0.13, trama: 0.22 },
  voz: { marca: 'Puente de mando', inicio: 'Puente', taller: 'Hangar', repostar: 'Repostar', agenda: 'Bitácora', guantera: 'Archivo', motor: 'Motor', casco: 'Casco', bitacora: 'Bitácora', telemetria: 'Telemetría', archivo: 'Archivo de a bordo', alerta: 'Alerta', falta: 'Sin dato', ok: 'En regla', cuenta: 'T-', escaner: 'Escáner de nave' },
  sonidos: { ambiente: [55, 82.4, 110.3], barrido: [180, 3200, 420], tic: 2350, alerta: [740, 554.4], cierre: [659.3, 987.8, 1318.5] }
};

/* Skin «Taller mecánico»: la misma pantalla, hecha de cromo, acero mecanizado, engranajes y goma. */
(function () {
  const uri = svg => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  const cromo = 'linear-gradient(180deg,#F7FAFC 0%,#C3CCD6 18%,#8893A0 40%,#F2F6F9 47%,#5B646F 52%,#1B1E22 54%,#57504A 60%,#AAA197 82%,#E9E4DC 100%)';
  const veta = uri('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120"><filter id="n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".006 .85" numOctaves="2" seed="4" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .85  0 0 0 0 .9  0 0 0 0 1  .34 0 0 0 -.07"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>');
  const banda = uri('<svg xmlns="http://www.w3.org/2000/svg" width="9" height="8"><rect width="9" height="8" fill="#050607"/><path d="M.6 0h4.2l3.4 4-3.4 4H.6L4 4z" fill="#2E3237"/><path d="M.6 0h4.2l.9 1H1.5z" fill="#565C63"/></svg>');
  const tornillo = uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F4F7FA"/><stop offset=".5" stop-color="#8C96A1"/><stop offset="1" stop-color="#2A2E33"/></linearGradient></defs><circle cx="7" cy="7" r="6.6" fill="#050607"/><circle cx="7" cy="7" r="5.8" fill="url(#g)"/><path d="M7 3.6l2.9 1.7v3.400L7 10.400 4.100 8.700V5.300z" fill="#0B0D0F"/></svg>');
  window.TEMAS.mecanica = {
    id: 'mecanica', nombre: 'Taller mecánico',
    acento: '#C9DAE8', acento2: '#6F8496',
    texto: { fondo: '#090B0D', tarjeta: ['#20252A', '#121518'], odometro: ['#FFFFFF', '#DCE6EE', '#8FA0B0'], sombra: 'rgba(0,0,0,.6)', tenue: '#A3AEB9', tinta: '#F1F4F6' },
    estados: { alerta: '#FF3B30', falta: '#FFB020', ok: '#34D17C' },
    fuentes: { titulo: '"Barlow Condensed"', texto: '"Roboto Condensed"', dato: '"JetBrains Mono"', espaciado: '.11em', mayusculas: 'uppercase' },
    marco: { corte: 0, radio: 7, linea: 'rgba(205,222,238,.2)', esquinas: 0, grosor: 2.5, bisel: cromo, tinte: 58, relieve: 0.75, tornillo },
    brillo: 0.6,
    lineas: 0,
    escena: { tipo: 'chapa', veta: '#B4C0CC', luz: ['#353D46', '#101316'], tren: { modulo: 3.2, ruedas: [{ x: 62, y: 181, z: 30 }, { de: 0, ang: -50, z: 12 }, { de: 1, ang: -8, z: 9 }] } },
    nave: { trazo: '#0B0D0F', relleno: 0, trama: 0, material: 'cromo' },
    formas: { ventana: 'neumatico', guia: 'eje', odometro: 'tambor', luz: 'tuerca', fab: 'engranaje', arranque: 'rodaje', entrada: 'encaje' },
    material: {
      cromo: [[0, '#FFFFFF'], [0.08, '#DCE9F5'], [0.3, '#86A6C4'], [0.42, '#3A5876'], [0.445, '#FFFFFF'], [0.52, '#E6F0F8'], [0.62, '#7392AD'], [0.69, '#22374C'], [0.705, '#0A0C0F'], [0.735, '#3B2F25'], [0.85, '#A38B6D'], [0.94, '#EADDCB'], [1, '#4A4036']],
      cristal: [[0, '#0A0E12'], [0.42, '#1B2733'], [0.5, '#6C8399'], [0.57, '#16202A'], [1, '#050709']],
      goma: [[0.5, '#2A2C30'], [0.72, '#4A4E55'], [0.9, '#1C1D20'], [1, '#000000']],
      acero: '#A4AEB8', aceroFondo: '#737D88', aceroOsc: '#111417', gomaBase: '#26282C', hueco: '#090A0C',
      placa: `${veta} 0 0/240px 120px`, banda: `${banda} 0 0/9px 8px repeat-x`,
      tambor: 'linear-gradient(180deg,#000 0,#2B2F34 24%,#40454B 50%,#1B1E21 78%,#000 100%)',
      titulo: 'linear-gradient(180deg,#FFFFFF 0%,#F2F6F9 40%,#AEBBC7 54%,#8E9CAA 58%,#DCE4EB 78%,#FFFFFF 100%)',
      fab: 'conic-gradient(from 25deg,#F6F9FB,#7F8A96,#F6F9FB,#4F5862,#EEF2F5,#8A95A1,#F6F9FB,#5B646F,#F6F9FB)'
    },
    voz: { marca: 'Taller mecánico', inicio: 'Inicio', taller: 'Taller', repostar: 'Repostar', agenda: 'Agenda', guantera: 'Guantera', motor: 'Motor', casco: 'Papeles', bitacora: 'Hoja de taller', telemetria: 'Rodaje', archivo: 'Guantera', alerta: 'Aviso', falta: 'Sin dato', ok: 'En regla', cuenta: 'En', escaner: 'Diagnosis' },
    sonidos: { timbre: 'metal', ambiente: [50, 100, 150.3], barrido: [140, 900, 260], tic: 2900, alerta: [1244.5, 932.3], cierre: [523.3, 784, 1174.7], golpe: 82, goma: [240, 1250] }
  };
})();
