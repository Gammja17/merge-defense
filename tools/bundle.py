"""js/ 로 나눈 게임 코드를 다시 한 장으로 합친다.

  python tools/bundle.py html <출력.html> [--artifact]   index.html의 <script src="js/..."> 를 인라인으로
      --artifact: 맨 앞 doctype, charset 두 줄과 SKEAM SDK 줄을 뺀다 (Claude 아티팩트용)
  python tools/bundle.py js <출력.js>                     게임 코드만 순서대로 이어 붙인다 (시뮬레이션용)
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def game_files():
    html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    return re.findall(r'<script src="(js/[^"]+)"></script>', html), html


def joined_js():
    files, _ = game_files()
    return '\n'.join(open(os.path.join(ROOT, f), encoding='utf-8').read() for f in files)


def main():
    mode, out = sys.argv[1], sys.argv[2]
    if mode == 'js':
        open(out, 'w', encoding='utf-8', newline='\n').write(joined_js())
        return
    files, html = game_files()
    tags = '\n'.join(f'<script src="{f}"></script>' for f in files)
    assert tags in html, 'index.html의 스크립트 줄을 찾지 못했어요'
    html = html.replace(tags, '<script>\n' + joined_js() + '\n</script>')
    if '--artifact' in sys.argv:
        lines = html.split('\n')[2:]
        html = '\n'.join(l for l in lines if 'skeam-sdk.js' not in l)
    open(out, 'w', encoding='utf-8', newline='\n').write(html)


if __name__ == '__main__':
    main()
