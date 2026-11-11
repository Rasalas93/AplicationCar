# Aplicación Coche: arquitectura (back y front separados, skins intercambiables)

T1625 · 11 nov 2026 · solo diseño, sin código. Parte de T1620-T1623 y los amplía. Diagrama: `diseno-t1625.svg`.
**En una frase**: el backend (`nucleo`) calcula y guarda; el frontend (`app`) solo pinta lo que le llega por un contrato JSON; una skin es una carpeta de datos que cambia el aspecto sin tocar ninguno de los dos.

## 1. Estudio previo
- **Existe**: offline-first con Capacitor + SQLite [1], PocketBase (un binario con SQLite, tiempo real y ficheros) [2], Supabase (Postgres) [3]; tokens de diseño en formato DTCG 2025.10 [4] con Style Dictionary, que los exporta a CSS, Android o iOS [5]; apps abiertas LubeLogger (MIT, web autoalojada) [6] y Hammond (AGPL, última versión 2022.07.06) [7]; avisos sin servidor con Capacitor Local Notifications [8].
- **Se elige**: TypeScript en un monorepo de 4 paquetes; Capacitor para Android; IndexedDB tras `Repositorio<T>` (T1621); tokens DTCG compilados con Style Dictionary; modelo de datos heredado de LubeLogger (T1620); sin servidor en el MVP.
- **Por qué**: todo funciona sin cobertura y nada sale del móvil; los tokens son un estándar, no un invento; PocketBase y Supabase solo hacen falta para sincronizar, y eso es fase 3 (candidato: PocketBase, por ser un solo binario).

## 2. Módulos e interfaces
```
paquetes/contrato/  tipos y esquemas JSON del API: lo único que comparten back y front
paquetes/nucleo/    BACKEND, TypeScript puro, sin pantalla (módulos de T1621 + api + fuentes + sync)
paquetes/app/       FRONTEND: pantallas, vista-modelo, motor de skin, presentadores
skins/<id>/         skin.json + tokens.json + recursos/ + sonidos/   (datos, cero lógica)
android/            envoltorio Capacitor: avisos, Bluetooth, archivos
```
| Backend (`nucleo`) | Responsabilidad | Interfaz |
|---|---|---|
| `dominio` | Vehículo, `Dato<T>` con fuente, Registro, Documento, Tarea (T1621) | Tipos y validaciones |
| `reglas` (motor) | Vencimientos por fecha o km, lo que llegue antes; reglas y perfiles son datos con fuente | `proximosVencimientos(vehiculo, plan, registros, reglas, hoy)` |
| `almacen` | Guardar y leer por vehículo | `Repositorio<T>`, `AlmacenArchivos` (IndexedDB y ficheros hoy) |
| `fuentes` | De dónde llegan lecturas del coche (T1623) | `FuenteVehiculo`, `RegistroFuentes` |
| `avisos` | Programar recordatorios | `Avisador` (notificación local; `.ics` como plan B) |
| `sync` (después) | Cola de cambios y fusión por registro | `PuertoSync`: `enviar(cambios)`, `recibir(desde)` |
| `api` | Única entrada: valida, llama a los casos de uso, emite el evento `cambio` | `despachar(peticion): respuesta` |

| Frontend (`app`) | Responsabilidad | Interfaz |
|---|---|---|
| `pantallas` | Estructura fija: Inicio, Taller, Agenda, Guantera, Repostar, Conexión, Garaje. Cada una es una lista de **huecos** con nombre (`heroe`, `vencimientos`, `consumo`…) | Componentes que solo leen tokens |
| `vista-modelo` | Uno por pantalla: pide al API y entrega estado plano (textos, cifras, `estado`); ni colores ni píxeles | `usarInicio(vehiculoId)` → `{ odometro, proximos[], pendientes }` |
| `skin` (capa) | Carga la skin, vuelca sus tokens a variables CSS, registra recursos y sonidos | `MotorSkin.aplicar(id, variante)`, `Sonido.reproducir('aviso')` |
| `presentadores` | Formas de pintar un hueco: `paisaje` (T1622), `coche-zonas` (T1624). La skin elige uno por nombre | `Presentador.pintar(hueco, datos, parametros)` |
| `cliente` | Habla con el backend | `ClienteApi` con dos transportes: `local` (misma app) y `http` (después) |

## 3. Flujo de datos
1. Pantalla → vista-modelo → `ClienteApi` → `nucleo/api` → caso de uso → `Repositorio` → IndexedDB.
2. Tras cada escritura, el motor de reglas recalcula; `api` emite `cambio`; los vista-modelo suscritos se refrescan.
3. Fuente (manual, Bluetooth, OBD) → `Lectura` con origen y fecha → mismo camino que una escritura.
4. El motor entrega `estado` (`al-dia`, `proximo`, `vencido`, `a-verificar`) y `zona`; la skin decide el color (`color.estado.*`) y el dibujo. **El backend nunca sabe qué skin hay; cambiar de skin no hace ni una llamada al API.**

## 4. Contrato del API (igual dentro del móvil que por HTTP)
| Recurso | Métodos | Contenido |
|---|---|---|
| `/vehiculos`, `/vehiculos/{id}` | GET, POST, PATCH | Vehículo y ficha; cada valor con su fuente |
| `/vehiculos/{id}/panel` | GET | Inicio en una llamada: odómetro, 3 próximos, documentos pendientes, consumo |
| `/vehiculos/{id}/vencimientos?horizonteDias=90` | GET | Salida del motor, con `zona` (zonas rojas de T1624) |
| `/vehiculos/{id}/plan/{clave}` | GET, PATCH | Tareas e intervalos editables |
| `/vehiculos/{id}/registros`, `/repostajes` | GET, POST | Historial y consumo |
| `/vehiculos/{id}/documentos`, `/documentos/pendientes` | GET, POST | Guantera y testigo |
| `/reglas?pais=ES` · `/fuentes/{id}/lecturas` · `/cambios?desde=` | GET, POST | Normas con fuente · lecturas · sincronización (después) |

`GET /vehiculos/focus/vencimientos?horizonteDias=90` (datos reales del Focus a 11/11/2026):
```json
{ "hoy": "2026-11-11", "vencimientos": [
  { "clave": "ivtm", "titulo": "IVTM 2027", "origen": "norma", "zona": null, "estado": "proximo",
    "vence": { "fecha": "2027-01-01", "km": null }, "faltan": { "dias": 51, "km": null },
    "fuente": { "tipo": "norma", "cita": "TRLRHL art. 96", "url": "https://www.boe.es/buscar/act.php?id=BOE-A-2004-4214", "verificado": "2026-11-11" } },
  { "clave": "correa", "titulo": "Correa de distribución", "origen": "plan", "zona": "motor", "estado": "a-verificar",
    "vence": null, "faltan": null, "fuente": { "tipo": "verbal", "quien": "concesionario" }, "pendiente": ["factura"] } ] }
```
`POST /vehiculos/focus/repostajes` (valores de ejemplo) → `201` con el registro y `"recalculado": ["consumo", "vencimientos"]`:
```json
{ "fecha": "2026-11-11", "odometroKm": 165720, "litros": 41.2, "importe": 63.9, "lleno": true, "fuente": { "tipo": "ejemplo" } }
```
Error (un dato sin fuente no se guarda, T1621): `{ "error": { "codigo": "dato-sin-fuente", "campo": "odometroKm" } }`

## 5. Patrones y por qué
- **Puertos y adaptadores** (hexagonal) en `nucleo`: almacén, avisos, fuentes y sync se cambian sin tocar reglas ni dominio.
- **Contrato primero + fachada** (`api`, `ClienteApi`): la frontera back/front es un fichero de tipos; hoy en memoria, mañana por HTTP.
- **MVVM** en `app`: la pantalla no calcula; el vista-modelo se prueba sin pantalla y sin skin.
- **Reglas como datos** (especificación `aplicaSi`): una norma nueva es una entrada con su fuente, no código.
- **Estrategia + registro**: `FuenteVehiculo`, `Presentador` y `Repositorio<T>` son familias enchufables.
- **Tokens en tres niveles** (primitivo → semántico → componente): los componentes solo leen los semánticos, así toda skin los cubre.
- **Observador** (`cambio`) y **cola de salida** para sync: la app nunca espera a la red.

## 6. SOLID
- **S**: cada paquete cambia por un solo motivo: la norma (`reglas`), el dato (`dominio`), la pantalla (`app`), el aspecto (`skins`).
- **O**: coche, regla, fuente, presentador o skin nuevos se añaden sin editar lo existente.
- **L**: cualquier `Repositorio<T>`, `FuenteVehiculo`, transporte de `ClienteApi` o skin válida sirve donde se espera otro.
- **I**: puertos pequeños (`Avisador`, `AlmacenArchivos`, `PuertoSync`), no un «servicio» gigante.
- **D**: `app` depende de `contrato`, no de `nucleo`; `nucleo` depende de sus puertos, no de Capacitor ni de IndexedDB.

## 7. Cómo se añade una skin
Una skin = `skin.json` (id, nombre, presentador por hueco, variantes) + `tokens.json` (DTCG: color, tipografía, espacio, radio, sombra, movimiento) + `recursos/` opcional (fuentes, iconos, imágenes) + `sonidos/` opcional (`toque`, `aviso`, `exito`, `transicion`). **Sin lógica.**
1. Copiar `skins/_plantilla/` a `skins/<id>/`.
2. Rellenar `tokens.json`; el acento de Copiloto es `{ "color": { "acento": { "$type": "color", "$value": "#FFB01F" } } }`.
3. En `skin.json`, elegir presentador por hueco (`"heroe": "paisaje"` o `"coche-zonas"`) y sus parámetros.
4. Añadir recursos y sonidos si los hay (una clave sin fichero es silencio).
5. `npm run skins`: valida el esquema, que estén todos los tokens semánticos, el contraste del texto y que no haya ficheros de código; genera el CSS.
6. Aparece en Ajustes → Aspecto. Cero cambios en `app` y `nucleo`.

- **Copiloto y Puente de mando** comparten datos y pantallas: mismos huecos, distinto `tokens.json` y distinto presentador del hueco `heroe`.
- **Los 4 temas de T1622** pasan a ser las `variantes` de la skin Copiloto: `acento` y `texto` son tokens; `cielo`, `terreno` y `carretera` son parámetros del presentador `paisaje`. `temas.js` no cambia de forma.
- **Límite honesto**: si un aspecto pide un dibujo que no existe (otro `Presentador`), eso es código de `app`, una clase nueva; la skin sigue siendo datos.

## 8. Android: qué es local y qué es servidor
| Pieza | MVP (todo dentro del APK) | Después |
|---|---|---|
| Datos y documentos | En el móvil: IndexedDB y ficheros | Copia cifrada y sync con `/cambios` (PocketBase candidato) |
| Motor de reglas y API | En el móvil (`ClienteApi` local) | El mismo `nucleo` puede servir por HTTP |
| Avisos | Notificación local de Capacitor (Android 13 pide permiso; exactos desde Android 12, permiso aparte) [8] | Push |
| Coche | Manual + Bluetooth del coche (T1623) | OBD-II BLE |
| Skins | Copiloto (4 variantes) y Puente de mando, empaquetadas | Descarga de skins |
| Servidor | **Ninguno** | Uno, opcional, solo copia y sync |

## 9. Cambios sobre T1620-T1623, criterios y preguntas
- **Cambia**: `ui` (T1621) pasa a ser `app` y habla solo por `contrato`; Capacitor desde el inicio (T1623) da avisos locales, así que el `.ics` de T1620 queda como plan B y exportación; `PlantillaTarea` gana `zona`. Lo demás de T1621 entra tal cual en `nucleo`.
- **Criterios de aceptación**: `nucleo` no importa nada de `app` ni del DOM, y `app` solo importa `contrato` (regla de lint); las pruebas de vista-modelo pasan igual con las dos skins; una skin de prueba se añade tocando 0 ficheros fuera de `skins/`.
- **Preguntas abiertas**: (1) ¿Capacitor desde el principio? Recomendado; sin él vale la misma arquitectura como PWA, sin Bluetooth ni avisos fiables. (2) ¿Skin por defecto: Copiloto o Puente de mando? (3) ¿Quién aloja el servidor de sync en fase 3? (4) ¿Monorepo con *workspaces* en Rasalas93/AplicationCar?

**Fuentes** (acceso 11/11/2026): [1] https://github.com/capacitor-community/sqlite · [2] https://pocketbase.io/docs/ · [3] https://supabase.com/docs/guides/getting-started/architecture · [4] https://www.designtokens.org/tr/drafts/format/ · [5] https://styledictionary.com/ · [6] https://github.com/hargata/lubelog · [7] https://github.com/akhilrex/hammond · [8] https://capacitorjs.com/docs/apis/local-notifications
