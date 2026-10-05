# Voltio

App para aprender electrónica: 15 módulos, ejercicios interactivos, multímetro manual,
simulador de protoboard con Arduino emulado, retos, proyectos reales y sistema de rachas.
Funciona sin servidor: todo el progreso se guarda en el propio dispositivo.

## Estructura

- `src/` código fuente (JavaScript sin dependencias de compilación).
- `build.py` une todo en un único `www/index.html`.
- `www/` lo que empaqueta Capacitor.
- `tools/sketches/` programas de Arduino y sus `.hex` compilados (ya incluidos en `src/sketches.js`).
- `.github/workflows/android.yml` compila y firma el APK en cada `push` a `main` y lo publica en Releases.

## Primera subida

Necesitas `git` y `gh` con sesión iniciada (`gh auth login`).

- macOS / Linux / Git Bash: `./subir.sh`
- Windows (PowerShell): `powershell -ExecutionPolicy Bypass -File subir.ps1`

El script crea el repositorio privado `voltio`, guarda la clave de firma como secreto,
sube el código y espera a que termine la compilación.

## Instalar en el móvil

Abre `https://github.com/TU_USUARIO/voltio/releases/latest` con la sesión de GitHub iniciada,
descarga `voltio.apk` y ábrelo. Android pedirá permitir instalar apps de esa fuente.
Las nuevas versiones se instalan encima y conservan el progreso, porque siempre se firman
con la misma clave.

## Clave de firma

Está en `signing/` (excluida de git). **Guárdala en un lugar seguro**: si la pierdes,
las siguientes versiones no podrán instalarse encima y habría que desinstalar
(exporta antes el progreso desde Perfil).

## Desarrollo

Cambia lo que quieras en `src/`, luego `git commit` y `git push`: Actions genera un APK nuevo.
Para probar en local: `python3 build.py` y abre `www/index.html` en el navegador.
