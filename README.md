# Voltio

App para aprender electrónica: un curso base de 15 módulos y seis especialidades
(AVR, ESP32, Raspberry Pi Pico, STM32, IoT, Radio y RF), ejercicios interactivos, multímetro
manual, simulador de protoboard con Arduino emulado, retos, proyectos reales y sistema de rachas.
Funciona sin servidor: todo el progreso se guarda en el propio dispositivo.

## Estructura

- `src/` código fuente (JavaScript sin dependencias de compilación).
- `build.py` une todo en un único `www/index.html`.
- `www/` lo que empaqueta Capacitor.
- `src/base/` el curso base, un módulo por archivo (`mNN.js`, en orden de nombre).
- `src/tracks/` una especialidad por archivo (ver abajo).
- `src/fx.js` sonidos sintetizados, partículas y la mascota Chispa.
- `src/study.js` exámenes de nivel, repaso de temario por módulo y resumen semanal.
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

## Lecciones

Una lección enseña antes de preguntar: gancho de predicción → explora → explica → ejemplo resuelto → práctica → resumen.
Además de los ejercicios de siempre hay pasos que no puntúan:

- `{ t: 'explore', viz, params, tasks: [{ q, min, max, text, done, hint }] }`: visualización con mini-retos.
- `{ t: 'steps', text, steps: [...], result }`: ejemplo resuelto que se descubre paso a paso.
- `Q(..., { predict: true })`: pregunta de predicción que no penaliza.
- `I(texto, { more })`: tarjeta con «Cuéntame más».

Todo ejercicio puntuable lleva `c` (concepto exacto) y `h` (pista sin la respuesta, que da Chispa al tocarla).
Los SVG de las explicaciones pueden animarse con las clases `a-flow`, `a-pulse`, `a-blink`, `a-spin`, `a-bob`, `a-drift`, `a-fade` y `a-draw`.
Sonido y mascota se pueden apagar en Perfil.

## Exámenes de nivel, repaso y resumen semanal

- Cada módulo (base y especialidades) termina con un **examen de nivel** (nodo `x-<módulo>`, añadido en `app.js`).
  Hay que sacar un **90 %** para desbloquear el siguiente módulo; el de `m12` abre las especialidades.
  Sin Chispa, sin pistas y sin corrección hasta la nota final, que se revisa pregunta a pregunta.
- El examen se arma en cada intento (`buildExam`): unas 3 preguntas por lección (entre 12 y 40) del banco propio del
  módulo (`exam: [...]` en el objeto del módulo, preguntas nuevas con `c`, `e` y `h`), generadores con números nuevos
  y ejercicios de las lecciones. Las notas se guardan en `S.exam[módulo]`; los fallos pasan a Repasar.
- **Repasar → Repasar temario**: una lección larga por módulo con el resumen y el ejemplo de cada lección y ejercicios;
  «Lo flojo» repasa solo los conceptos fallados en el último examen.
- **Resumen semanal** (Perfil y aviso en Aprender): se calcula con `S.wk[fecha]` (XP, minutos, lecciones, exámenes y
  aciertos por concepto), que se guarda 70 días.
