# AplicationCar · Copiloto

App Android (y PWA) para llevar el coche: qué toca pronto, papeles en la guantera y gastos con previsión. Funciona sin conexión y no tiene servidor: todo se guarda en el móvil.

## Pantallas
- **Inicio**: el Focus en 3D (girar con el dedo, pellizcar para acercar) con zonas rojo/ámbar/verde de lo que vence en 3 meses; tocar una zona abre su tarea.
- **Gastos**: gastado del mes, previsión y alta rápida.
- **Guantera**: documentos del coche y qué falta.
- **Aspecto**: cambia el tema (por defecto, Copiloto · Atardecer).

## Cómo arrancarla
```bash
npm install
npm run dev          # http://127.0.0.1:5173  (?hoy=2026-11-11 fija la fecha, ?limpio empieza de cero)
npm test             # núcleo + previsión + humo en Chromium headless
npm run build        # dist/ es la PWA (manifest + service worker)
npm run android      # build + cap sync + APK de depuración (necesita JDK 21 y Android SDK 36)
```
APK: `android/app/build/outputs/apk/debug/app-debug.apk`.

## Arquitectura
Ver [`docs/arquitectura.md`](docs/arquitectura.md) (módulos, interfaces, flujo de datos, SOLID) y el diseño de origen en [`docs/diseno-t1625.md`](docs/diseno-t1625.md).

## Privacidad
Repositorio público: sin titular, bastidor, domicilio, DNI, número de póliza ni imágenes de documentos. La matrícula solo vive en `datos/semilla.json`. Hay una prueba que lo comprueba.
