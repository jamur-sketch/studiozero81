# Junta o app num único HTML para visualizar como Artifact no claude.ai.
import re, sys, pathlib
d = pathlib.Path(__file__).parent
html = (d / 'index.html').read_text()
body = html[html.index('<body>') + 6: html.index('</body>')]
body = body.replace('<script src="parser.js"></script>', '<script>\n' + (d / 'parser.js').read_text() + '</script>')
body = body.replace('<script src="app.js"></script>', '<script>\n' + (d / 'app.js').read_text() + '</script>')
css = (d / 'style.css').read_text() + '\n.topbar { top: env(safe-area-inset-top, 0px); padding-top: 10px; }\n'
out = f'''<title>Cartões da Família</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap">
<style>
{css}</style>
{body}'''
pathlib.Path(sys.argv[1]).write_text(out)
