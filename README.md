# AplicationCar · Copiloto

App Android (y PWA) para llevar el coche: qué toca pronto, papeles en la guantera y gastos con previsión. Funciona sin conexión y no tiene servidor: todo se guarda en el móvil.

## Pantallas
- **Inicio**: el Focus en 3D (girar con el dedo, pellizcar para acercar) con zonas rojo/ámbar/verde de lo que vence en 3 meses; tocar una zona abre su tarea. Otro vehículo sale en su silueta (coche o moto). Tocar el nombre abre el **Garaje**: cambiar de vehículo o añadir uno.
- **Gastos**: gastado del mes, previsión y alta rápida.
- **Guantera**: documentos del coche y qué falta; cada hueco admite foto (cámara) o PDF, que se abre en la app y se puede borrar; archivos sueltos del vehículo; **datos útiles** con su fuente (documento, verbal, ejemplo), editables.
- **Taller**: historial de visitas (fecha, km, taller, trabajos, importe, ticket). Una visita pone al día sus tareas y su importe entra en Gastos.
- **Aspecto**: cambia el tema (por defecto, Copiloto · Atardecer); botón arriba a la derecha en Inicio.

## Cómo arrancarla
```bash
npm install
npm run dev          # http://127.0.0.1:5173  (?hoy=2026-11-11 fija la fecha, ?limpio empieza de cero)
npm test             # núcleo + previsión + humo en Chromium headless
npm run build        # dist/ es la PWA (manifest + service worker)
npm run android      # build + cap sync + APK de depuración (necesita JDK 21 y Android SDK 36)
```
APK: `android/app/build/outputs/apk/debug/app-debug.apk`.
Demo y lámina de T1642: `node herramientas/demo/grabar-archivos.mjs <carpeta>` y `node herramientas/demo/lamina-archivos.mjs <png>`.

## Arquitectura
Ver [`docs/arquitectura.md`](docs/arquitectura.md) (módulos, interfaces, flujo de datos, SOLID) , el diseño de origen en [`docs/diseno-t1625.md`](docs/diseno-t1625.md) y el mapa de datos genérico en [`docs/mapa-datos.md`](docs/mapa-datos.md). Los requisitos legales de T1625 se quedan fuera del repositorio porque nombran el municipio.

## Privacidad
Repositorio público: sin titular, bastidor, domicilio, DNI, número de póliza ni imágenes de documentos. La matrícula solo vive en `datos/semilla.json`. Hay una prueba que lo comprueba.
