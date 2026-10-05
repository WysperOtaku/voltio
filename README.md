# Voltio

App para aprender electrónica: un curso base de 15 módulos y seis especialidades
(AVR, ESP32, Raspberry Pi Pico, STM32, IoT, Radio y RF), ejercicios interactivos, multímetro
manual, simulador de protoboard con Arduino emulado, retos, proyectos reales y sistema de rachas.
Funciona sin servidor: todo el progreso se guarda en el propio dispositivo.

## Estructura

- `src/` código fuente (JavaScript sin dependencias de compilación).
- `build.py` une todo en un único `www/index.html`.
- `www/` lo que empaqueta Capacitor.
- `src/tracks/` una especialidad por archivo (ver abajo).
- `tools/validate.js` revisa el temario entero (ids, conceptos, generadores, visualizaciones, proyectos…).
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
Antes de subir cambios de contenido: `node tools/validate.js` (debe terminar en “OK: sin errores”).

## Especialidades

Cada archivo de `src/tracks/` registra una especialidad con `TRACKS.push({ id, title, short, desc, color, icon, level, units })`.
Se cargan después de `checks.js` y antes de `app.js` (orden del carrusel en `TRACK_ORDER` de `build.py`), así que
pueden ampliar `CONCEPTS`, `PROJECTS`, `CHECKS`, `ESP_SKETCHES`, `SCH` y `Widgets.VIZ` con `Object.assign`, y añadir
generadores con `Gen.add(clave, fn, concepto)`. Todo lo de una especialidad lleva su prefijo (`av`, `es`, `rp`, `st`, `io`, `rf`).

- Se desbloquean al terminar los pasos (no los proyectos) del módulo `m12`, Microcontroladores (`GATE_UNIT` en `app.js`).
  Bloqueadas se pueden abrir para ver el temario.
- Aparecen en un carrusel justo debajo de ese módulo; el curso base continúa debajo.
- Dentro de cada especialidad el avance es lineal, como en el curso base. Un nodo ya completado nunca se bloquea,
  así que se pueden intercalar lecciones nuevas sin romper el progreso.
- Rango por especialidad según proyectos completados: Aprendiz, Iniciado (1), Técnico (3), Especialista (6),
  Experto (10) y Maestro (todo completado).

Proyectos: además del formato plano (`steps`, `checks`) admiten `level` (1–5), `hours`, `skills`, `extra` y
`phases: [{ title, steps, checks, code? }]`. Las comprobaciones se guardan aplanadas en `S.chk[id]`.
La recompensa crece con el nivel.
