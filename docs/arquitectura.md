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
