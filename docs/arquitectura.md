# ARQUITECTURA

Implementa el diseño de T1625 (`diseno-t1625.md`): el **núcleo** calcula y guarda, la **app** solo pinta lo que llega por el **contrato**, y la **skin** son datos.

## Desviación consciente de T1625
T1625 proponía TypeScript en un monorepo de 4 paquetes. Aquí son **módulos ES en JavaScript con tipos JSDoc** y carpetas en vez de paquetes: misma frontera, cero paso de compilación para el núcleo, y `prevision.js` (T1634) se usa sin tocar. Pasar a TS es renombrar y tipar; las interfaces no cambian.

## Módulos
| Carpeta | Papel | Interfaz pública |
|---|---|---|
| `src/contrato/` | Lo único compartido: estados, niveles, rutas, tipos JSDoc | `ESTADOS`, `NIVEL`, `RUTAS` |
| `src/nucleo/reglas.js` | Vencimientos por fecha o km (lo que llegue antes), zonas del coche | `proximosVencimientos(vehiculo, hoy, meses)`, `zonas(lista)` |
| `src/nucleo/gastos.js` + `prevision.js` | Previsión del mes (T1634, sin cambios) | `Prevision.*` |
| `src/nucleo/almacen.js` | Puertos de guardado | `repositorioLocal()` (localStorage), `almacenArchivos()` (IndexedDB) |
| `src/nucleo/api.js` | Única entrada al núcleo; valida y emite `cambio` | `crearApi({semilla, repo, archivos, hoy})` → `{despachar, alCambiar}` |
| `src/app/cliente.js` | Transporte local hacia el API (mañana, `http`) | `clienteLocal(api, vehiculoId)` → `{panel(), vencimientos(), …}` |
| `src/app/pantallas/` | Inicio, Gastos, Guantera: vista-modelo (`vistaInicio`) + pintado | `pantallaX({raiz, cliente, temaActual})` → `{pintar()}` |
| `src/app/presentadores/` | `coche3d` (three.js) y `zonas-focus` (dónde cae cada zona en el modelo) | `crearCoche3D({...})` → `{zonas, pintar, matricula, activar, paso}` |
| `src/app/skin/` | `temas.js` (datos de T1634) + `motor.js` (tokens → variables CSS) | `aplicarTema(id)`, `listaTemas()` |
| `src/app/sonido/` | Voces sintetizadas puras + reproductor Web Audio | `voces(S)`, `reproductor()` → `{tocar}` |
| `src/app/ui.js` | Hoja inferior (con atrás de Android), aviso, iconos | `abrirHoja`, `cerrarHoja`, `avisar`, `tocar` |
| `datos/semilla.json` | El coche de ejemplo; **único sitio con la matrícula** | — |

## Flujo de datos
1. Pantalla → `cliente.panel()` (u otra ruta) → `api.despachar({metodo, ruta, cuerpo})` → reglas / previsión → respuesta JSON plana.
2. Escritura (`POST gastos`, `POST documentos/{id}/archivo`) → repositorio → `api` emite `cambio` → `main.js` repinta las pantallas.
3. Inicio pasa `zonas` del núcleo al presentador 3D; tocar una zona abre su tarea en la hoja inferior.
4. Tema: `aplicarTema` vuelca tokens a `--variables`; las pantallas solo leen variables.

## SOLID
- **S**: reglas, almacén, API, pantallas y presentador 3D tienen un único motivo para cambiar; ningún archivo pasa de ~500 líneas.
- **O**: un tema o una zona nueva es un dato (`temas.js`, `zonas-focus.js`), no código.
- **L**: `repositorioLocal` y el repositorio en memoria (pruebas) son intercambiables.
- **I**: la app solo conoce `despachar`/`alCambiar`; el presentador 3D solo recibe `zonas` y colores.
- **D**: la API recibe sus puertos (`repo`, `archivos`, `hoy`) por parámetro; nada importa IndexedDB directamente salvo `almacen.js`.

## Recursos 3D
`herramientas/focus/focus.py` (Blender, T1632) → `exportar.sh` → `public/modelo/focus.glb` (meshopt, 0,6 MB), `estudio.hdr` (luz de estudio) y `poster.jpg` (carga y sin WebGL).

## T1642: archivos, taller, datos útiles y varios vehículos
Amplía lo anterior sin rediseñar: el núcleo gana cuatro módulos pequeños y `api.js` sigue siendo solo el enrutador.

| Módulo | Papel | Interfaz pública |
|---|---|---|
| `src/nucleo/tipos.js` | Plantillas por tipo de vehículo (`coche`, `moto`): tareas con su intervalo, zonas, huecos de la Guantera, campos de la ficha, presentador | `TIPOS`, `vehiculoDesdePlantilla(datos, base)` |
| `src/nucleo/migracion.js` | Esquema local v1 → v2 sin perder nada (los ficheros no se mueven) | `migrar(repo)` → versión |
| `src/nucleo/archivos.js` | Índice de adjuntos por vehículo: a qué van (vehículo, documento o visita), tipo, tamaño | `registroArchivos(repo, almacen)` → `{listar, adjuntar, leer, borrar}` |
| `src/nucleo/taller.js` | Visitas al taller (puras): validar, convertir en gasto, recalcular las tareas que tocan | `validarVisita(c)`, `aplicarVisitas(v, visitas, archivos)`, `gastoDeVisita(visita)` |
| `src/nucleo/ficha.js` | Datos útiles: plantilla + lo editado; cada valor con su fuente | `fichaDe(v, editados)`, `validarCampo(c)` |
| `src/nucleo/garaje.js` | Lista de vehículos (semilla + creados en el móvil) y el ensamblado de cada uno | `crearGaraje({semilla, repo, archivos})` → `{lista, crear, vehiculo}` |
| `src/app/presentadores/silueta.js` | Dibujo plano (SVG) de coche o moto con sus zonas, para todo lo que no es el Focus | Misma forma que `crearCoche3D`: `{listo, zonas, pintar, matricula, activar, paso}` |
| `src/app/pantallas/taller.js` | Historial de visitas y alta de una visita con su ticket | `pantallaTaller({raiz, cliente, temaActual})` |
| `src/app/visor.js` | Selector (cámara o archivo), visor de foto y PDF (pdf.js, carga diferida) y borrado | `elegirArchivo({camara})`, `abrirVisor({cliente, archivo})` |

### Datos (todo en el móvil)
- `localStorage` con el mismo prefijo `coche:v1:` (cambiarlo perdería datos). Claves: `esquema` (2), `garaje` (vehículos creados), `activo`, y por vehículo `{id}:gastos`, `{id}:archivos`, `{id}:visitas`, `{id}:ficha`.
- Ficheros en IndexedDB (`almacen.js`), como `Blob`: sin paso por base64 ni plugin. `navigator.storage.persist()` pide que el sistema no los borre.
- Migración v1 → v2: cada `{id}:documentos` de v1 pasa a una entrada de `{id}:archivos` que apunta a la misma clave de fichero (`{id}:{doc}`); se apunta `garaje = []` y `activo = focus`. Los gastos no cambian de clave.

### Rutas nuevas del contrato
`GET/POST /vehiculos` · `GET/POST /vehiculos/{id}/archivos` · `GET/DELETE /vehiculos/{id}/archivos/{a}` · `GET/POST /vehiculos/{id}/taller` · `GET/POST /vehiculos/{id}/ficha`. `POST documentos/{doc}/archivo` sigue igual y ahora pasa por `archivos.js`.

### Flujo de una visita
1. Taller → `cliente.anotarVisita({fecha, km, taller, trabajos, importe, archivo?})` → `api` valida (`taller.js`), guarda la visita y, si hay ticket, el fichero (`archivos.js`, destino `visita`).
2. Al leer el vehículo, `garaje.vehiculo(id)` aplica las visitas: cada tarea hecha pasa a «fecha o km» desde esa visita (su intervalo de la plantilla), el programado enlazado se mueve, la visita entra en Gastos como `mantenimiento` y su km mueve el odómetro.
3. Un hueco de la Guantera se llena con un archivo suyo o con el ticket de una visita que lo cubre (`llenaVisita`); al borrar el último vuelve el testigo «falta».
4. `cambio` → `main.js` repinta: la zona pasa a verde en Inicio y el importe sale en Gastos.

### Varios vehículos
- El tipo manda: plantilla de tareas, zonas, huecos de documentos y presentador. El Focus es el primero y sigue en 3D; lo demás usa `silueta.js` (coche o moto).
- `cliente.usar(id)` cambia el vehículo activo; las pantallas no saben cuántos hay.

### SOLID en lo nuevo
- **S**: archivos, taller, ficha, garaje y migración cambian por motivos distintos; `api.js` solo enruta.
- **O**: un tipo nuevo (furgoneta, quad) es una entrada de `TIPOS`, no código nuevo.
- **L**: `silueta.js` y `coche3d.js` son intercambiables para Inicio.
- **I**: las pantallas siguen hablando solo con `cliente`; el visor solo recibe `{leer, borrar}`.
- **D**: `registroArchivos` recibe `repo` y `almacen`; nada nuevo toca IndexedDB fuera de `almacen.js`.

## T1656: cada vehículo del Garaje en 3D
### Módulos
- `presentadores/modelos3d.js`: registro `MODELOS` (`focus`, `coche`, `moto`): GLB, zonas, material de pintura, acento y encuadre (objetivo, media longitud, vista de entrada). `modeloDe(v)`: el Focus el suyo; los demás, el genérico de su tipo.
- `zonas-coche.js`, `zonas-moto.js`: anclas por rayo, como `zonas-focus.js`; la moto tiene las suyas (cadena, frenos, neumáticos, faro, depósito, colín).
- `coche3d.js`: un solo visor (un contexto WebGL) con `cargar(modelo)`; cada GLB se monta una vez y se guarda; el cambio funde el lienzo (0,25 s fuera, 0,6 s dentro) y vuelve a la vista de entrada del modelo.
- `inicio.js`: elige el modelo con `modeloDe`; sin WebGL o si el GLB falla, la silueta SVG de su tipo (el Focus, su póster).

### Flujo
Garaje → `cliente.usar(id)` → `pintar()` → `coche.cargar(MODELOS[id])` + `pintar(color)` + `matricula(texto)` + `zonas(lista)`. Lo pedido durante el fundido se guarda y se aplica al modelo nuevo antes de mostrarlo.

### Datos y peso
- Color y matrícula salen del vehículo (`pintura.color`, `matricula`); el alta del Garaje los pide (opcionales). Sin color: Blanco Perla la moto y Azul Cobalto el coche (T1645).
- Solo se baja el GLB del vehículo activo: `precache.json` no lleva `moto.glb` ni `coche.glb`; el service worker los guarda al usarlos.

### SOLID en lo nuevo
- **S**: el registro dice qué modelo y dónde; el visor solo dibuja; Inicio solo elige.
- **O**: un modelo nuevo es una entrada de `MODELOS` y su archivo de zonas.
- **L**: `coche3d.js` y `silueta.js` siguen intercambiables para Inicio.
- **I**: el visor expone `cargar`, `pintar`, `matricula`, `zonas`, `activar`; las pruebas leen `modelo`, `color`, `placa` y `anclas()`.
- **D**: el visor recibe la configuración del modelo; no importa el registro.
