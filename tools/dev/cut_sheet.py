"""VARCO 시트에서 적 그림 잘라내기 (단색 배경 제거, 자르기, 크기 맞춤).
Cut sprites from a solid-color-background sheet.
usage: python3 tools/dev/cut_sheet.py sheet.png key(magenta|green) out_dir name1,name2,... longside1,longside2,...
Sprites are found as connected blobs (left to right, biggest N kept)."""
import sys, numpy as np
from PIL import Image
from scipy import ndimage

src, key, out, names, sizes = sys.argv[1:6]
names = names.split(','); sizes = [int(x) for x in sizes.split(',')]
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
r, g, b = im[..., 0], im[..., 1], im[..., 2]
if key == 'magenta':
    k = np.minimum(r, b) - g          # how much "magenta" a pixel has
else:
    k = g - np.maximum(r, b)
# alpha: 0 where strongly key colored, 1 where not, soft ramp between
a = np.clip((150 - k) / 90, 0, 1)
# despill: pull the key channel(s) down toward the others on soft edges
out_rgb = im.copy()
edge = a < 1
if key == 'magenta':
    out_rgb[..., 0] = np.where(edge, np.minimum(r, g + 40), r)
    out_rgb[..., 2] = np.where(edge, np.minimum(b, g + 40), b)
else:
    out_rgb[..., 1] = np.where(edge, np.minimum(g, np.maximum(r, b) + 20), g)
mask = a > 0.5
mask = ndimage.binary_closing(mask, iterations=3)
lab, n = ndimage.label(ndimage.binary_dilation(mask, iterations=12))
objs = ndimage.find_objects(lab)
areas = [(int((lab[o] == i + 1).sum()), i, o) for i, o in enumerate(objs)]
areas.sort(reverse=True)
keep = sorted(areas[:len(names)], key=lambda t: t[2][1].start)
rgba = np.dstack([out_rgb, a * 255]).clip(0, 255).astype(np.uint8)
for (area, i, o), name, L in zip(keep, names, sizes):
    sub = rgba[o].copy()
    sub[..., 3] = np.where(lab[o] == i + 1, sub[..., 3], 0)
    img = Image.fromarray(sub, 'RGBA')
    img = img.crop(img.getbbox())
    s = L / max(img.size)
    img = img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)
    img.save(f'{out}/{name}.webp', 'WEBP', quality=90, method=6)
    print(name, img.size)
