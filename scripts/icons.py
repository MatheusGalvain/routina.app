"""
Gera os ícones do Habbit Do em public/ a partir do símbolo do coelho (o mesmo de src/components/ui/BunnyMark.tsx).

    python scripts/icons.py

Precisa do Google Chrome (ou Edge) instalado, para desenhar o SVG em PNG, e do Pillow (pip install pillow), para o .ico.
Gera: favicon.svg, favicon.ico (16/32/48), apple-touch-icon.png (180), icon-192.png, icon-512.png,
icon-maskable-192.png, icon-maskable-512.png e coelho.png (192, fundo transparente, para os e-mails).
"""
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public'

# Rosto do coelho, viewBox 0 0 64 64 (igual ao BunnyMark.tsx).
BUNNY = """
  <g transform="rotate(-12 24.5 30)">
    <ellipse cx="24.5" cy="17" rx="5.6" ry="13" fill="#F2F0ED"/>
    <ellipse cx="24.5" cy="18.5" rx="2.6" ry="9" fill="url(#ear)"/>
  </g>
  <g transform="rotate(12 39.5 30)">
    <ellipse cx="39.5" cy="17" rx="5.6" ry="13" fill="#F2F0ED"/>
    <ellipse cx="39.5" cy="18.5" rx="2.6" ry="9" fill="url(#ear)"/>
  </g>
  <ellipse cx="32" cy="39" rx="17" ry="15" fill="#F2F0ED"/>
  <ellipse cx="21.5" cy="44.5" rx="3" ry="1.8" fill="#FF9EC7" opacity=".6"/>
  <ellipse cx="42.5" cy="44.5" rx="3" ry="1.8" fill="#FF9EC7" opacity=".6"/>
  <rect x="24.2" y="34" width="4.6" height="7" rx="2.3" fill="#0A0D14"/>
  <rect x="35.2" y="34" width="4.6" height="7" rx="2.3" fill="#0A0D14"/>
  <circle cx="27.4" cy="35.8" r=".95" fill="#FFFFFF"/>
  <circle cx="38.4" cy="35.8" r=".95" fill="#FFFFFF"/>
  <path d="M30.6,44.2 Q32,43.4 33.4,44.2 Q32.8,45.8 32,46 Q31.2,45.8 30.6,44.2 Z" fill="#F59BC4"/>
  <path d="M32,46 Q31.2,47.6 29.6,47.1 M32,46 Q32.8,47.6 34.4,47.1" fill="none" stroke="#0A0D14" stroke-width=".9" stroke-linecap="round"/>
"""

DEFS = """
  <defs>
    <radialGradient id="halo" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#CDB8FF" stop-opacity=".26"/>
      <stop offset="1" stop-color="#CDB8FF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ear" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F7B8D6"/>
      <stop offset="1" stop-color="#CDB8FF"/>
    </linearGradient>
  </defs>"""


def svg(kind: str) -> str:
    """tile: cantos arredondados (favicon e ícone comum); full: fundo inteiro (apple e maskable); bare: só o coelho."""
    if kind == 'tile':
        body = f'<rect width="64" height="64" rx="14" fill="#141414"/><circle cx="32" cy="34" r="27" fill="url(#halo)"/><g transform="translate(0 3)">{BUNNY}</g>'
    elif kind == 'apple':
        # O iOS arredonda sozinho: fundo inteiro e o coelho um pouco menor.
        body = f'<rect width="64" height="64" fill="#141414"/><circle cx="32" cy="33" r="27" fill="url(#halo)"/><g transform="translate(32 33) scale(.86) translate(-32 -29)">{BUNNY}</g>'
    elif kind == 'maskable':
        # Margem de segurança: o coelho fica dentro do círculo central de 80% (o sistema recorta o resto).
        body = f'<rect width="64" height="64" fill="#141414"/><circle cx="32" cy="32" r="24" fill="url(#halo)"/><g transform="translate(32 32) scale(.64) translate(-32 -29)">{BUNNY}</g>'
    elif kind == 'bare':
        body = f'<g transform="translate(32 32) scale(1.18) translate(-32 -29)">{BUNNY}</g>'
    else:
        raise ValueError(kind)
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">{DEFS}\n  {body}\n</svg>\n'


def find_browser() -> str:
    for p in [
        os.environ.get('CHROME', ''),
        r'C:\Program Files\Google\Chrome\Application\chrome.exe',
        r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
        r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        shutil.which('google-chrome') or '',
        shutil.which('chromium') or '',
    ]:
        if p and Path(p).exists():
            return p
    sys.exit('Chrome/Edge não encontrado (defina a variável CHROME com o caminho).')


def render(browser: str, markup: str, size: int, out: Path, tmp: Path):
    html = tmp / f'{out.stem}.html'
    html.write_text(
        f'<!doctype html><html><head><style>html,body{{margin:0;background:transparent;overflow:hidden}}svg{{display:block;width:{size}px;height:{size}px}}</style></head><body>{markup}</body></html>',
        encoding='utf-8',
    )
    subprocess.run(
        [browser, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--default-background-color=00000000',
         f'--window-size={size},{size}', f'--screenshot={out}', html.as_uri()],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    # Garante o tamanho exato.
    from PIL import Image
    img = Image.open(out).convert('RGBA')
    if img.size != (size, size):
        img.crop((0, 0, size, size)).save(out)


def main():
    from PIL import Image
    PUBLIC.mkdir(exist_ok=True)
    (PUBLIC / 'favicon.svg').write_text(svg('tile'), encoding='utf-8')
    browser = find_browser()
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        jobs = [
            ('tile', 192, 'icon-192.png'),
            ('tile', 512, 'icon-512.png'),
            ('maskable', 192, 'icon-maskable-192.png'),
            ('maskable', 512, 'icon-maskable-512.png'),
            ('apple', 180, 'apple-touch-icon.png'),
            ('bare', 192, 'coelho.png'),
            ('tile', 256, '_ico.png'),
        ]
        for kind, size, name in jobs:
            render(browser, svg(kind), size, tmp / name, tmp)
            if not name.startswith('_'):
                shutil.copy(tmp / name, PUBLIC / name)
            print('ok', name)
        ico = Image.open(tmp / '_ico.png').convert('RGBA')
        ico.save(PUBLIC / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
        print('ok favicon.ico')


if __name__ == '__main__':
    main()
