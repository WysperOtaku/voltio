import sys, os, glob
# Las especialidades van después de checks.js (pueden ampliar PROJECTS, CHECKS, CONCEPTS,
# ESP_SKETCHES, SCH y Widgets.VIZ) y antes de app.js. TRACK_ORDER fija el orden del carrusel.
TRACK_ORDER = ['avr', 'esp32', 'rp2040', 'stm32', 'iot', 'radio']
tracks = [f'src/tracks/{t}.js' for t in TRACK_ORDER if os.path.exists(f'src/tracks/{t}.js')]
tracks += sorted(f.replace('\\', '/') for f in glob.glob('src/tracks/*.js') if f.replace('\\', '/') not in tracks)
# El curso base va en src/base/mNN.js, uno por módulo, en orden de nombre de archivo.
base = sorted(f.replace('\\', '/') for f in glob.glob('src/base/*.js'))
order = ['avr.js', 'src/solver.js', 'src/schem.js', 'src/sketches.js', 'src/sketches_esp.js', 'src/view3d.js', 'src/sim.js', 'src/route.js', 'src/fx.js', 'src/widgets.js', 'src/concepts.js', 'src/gen.js', 'src/content.js'] + base + ['src/checks.js'] + tracks + ['src/app.js']
js = '\n;\n'.join(open(f, encoding='utf-8').read() for f in order).replace('</script', '<\\/script')
html = open('src/index.html', encoding='utf-8').read().replace('/*CSS*/', open('src/styles.css', encoding='utf-8').read()).replace('/*JS*/', js)
open(sys.argv[1] if len(sys.argv) > 1 else 'www/index.html', 'w', encoding='utf-8').write(html)
print(len(html))
