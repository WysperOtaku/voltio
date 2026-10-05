import sys
order=['avr.js','src/solver.js','src/schem.js','src/sketches.js','src/sketches_esp.js','src/view3d.js','src/sim.js','src/route.js','src/widgets.js','src/concepts.js','src/gen.js','src/content.js','src/checks.js','src/app.js']
js='\n;\n'.join(open(f).read() for f in order).replace('</script','<\\/script')
html=open('src/index.html').read().replace('/*CSS*/',open('src/styles.css').read()).replace('/*JS*/',js)
open(sys.argv[1] if len(sys.argv)>1 else 'www/index.html','w').write(html)
print(len(html))
