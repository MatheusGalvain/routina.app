"""
Gera public/og.png (1200x630), a imagem de compartilhamento da landing (Open Graph e Twitter Card).

    python scripts/og.py

Como o scripts/icons.py: precisa do Google Chrome (ou Edge) para desenhar o HTML em PNG e do
Pillow (pip install pillow). Usa as fontes do Google Fonts, então precisa de internet.
Fundo #141414, "Habbit Do" e a frase do hero à esquerda, o coelho da landing à direita.
"""
import subprocess
import tempfile
from pathlib import Path

from icons import PUBLIC, find_browser

W, H = 1200, 630

# O coelho da landing (src/pages/Landing.tsx), viewBox 0 0 100 100.
BUNNY = """
<svg viewBox="0 0 100 100" width="440" height="440" style="overflow:visible">
  <defs>
    <radialGradient id="halo" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#A9BFFF" stop-opacity=".28"/>
      <stop offset="1" stop-color="#A9BFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="56" r="58" fill="url(#halo)"/>
  <path d="M30,52 C24,34 24,14 32,8 C38,4 44,10 44,22 C44,32 42,42 40,50 Z M70,52 C76,34 76,14 68,8 C62,4 56,10 56,22 C56,32 58,42 60,50 Z" fill="#F2F0ED"/>
  <path d="M33,46 C29,32 30,18 35,13 C38,11 40,15 40,22 C40,30 39,38 38,46 Z" fill="#F7B8D6" opacity=".8"/>
  <path d="M67,46 C71,32 70,18 65,13 C62,11 60,15 60,22 C60,30 61,38 62,46 Z" fill="#CDB8FF" opacity=".8"/>
  <ellipse cx="50" cy="66" rx="30" ry="26" fill="#F2F0ED"/>
  <rect x="39" y="57" width="6.5" height="12" rx="3.25" fill="#141414"/>
  <rect x="54.5" y="57" width="6.5" height="12" rx="3.25" fill="#141414"/>
  <circle cx="43.6" cy="59.4" r="1.3" fill="#FFFFFF"/>
  <circle cx="59.1" cy="59.4" r="1.3" fill="#FFFFFF"/>
  <path d="M47.5,75 L52.5,75 L50,78 Z" fill="#F59AB0"/>
  <circle cx="35" cy="73" r="4" fill="#F7B8D6" opacity=".5"/>
  <circle cx="65" cy="73" r="4" fill="#F7B8D6" opacity=".5"/>
</svg>"""

HTML = f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=JetBrains+Mono:wght@400&display=block">
<style>
  html,body{{margin:0;width:{W}px;height:{H}px;overflow:hidden;background:#141414}}
  .card{{box-sizing:border-box;width:{W}px;height:{H}px;padding:72px 80px;display:flex;align-items:center;justify-content:space-between;gap:32px;
        background:radial-gradient(circle at 82% 50%, #1C2233 0, #141414 46%)}}
  .text{{display:flex;flex-direction:column;gap:34px;max-width:620px}}
  .pill{{align-self:flex-start;font-family:'JetBrains Mono',monospace;font-size:20px;letter-spacing:.14em;text-transform:uppercase;color:#A8E6B8;
        border:2px solid #2C3A30;border-radius:999px;padding:10px 20px}}
  .brand{{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:44px;letter-spacing:-.03em;color:#F2F0ED}}
  .brand span{{color:#A9BFFF}}
  h1{{margin:0;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:84px;line-height:.92;letter-spacing:-.05em;color:#F2F0ED}}
</style></head><body>
<div class="card">
  <div class="text">
    <div class="brand">Habbit <span>Do</span></div>
    <h1>Uma rotina que dá vontade de cuidar.</h1>
    <div class="pill">App de rotina com pets</div>
  </div>
  {BUNNY}
</div>
</body></html>"""


def main():
    from PIL import Image
    browser = find_browser()
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        html = tmp / 'og.html'
        html.write_text(HTML, encoding='utf-8')
        out = tmp / 'og.png'
        subprocess.run(
            [browser, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
             '--virtual-time-budget=8000', f'--window-size={W},{H}', f'--screenshot={out}', html.as_uri()],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        img = Image.open(out).convert('RGB')
        if img.size != (W, H):
            img = img.crop((0, 0, W, H))
        img.save(PUBLIC / 'og.png', optimize=True)
    print('ok og.png')


if __name__ == '__main__':
    main()
