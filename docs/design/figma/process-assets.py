"""Turns raw Figma image exports into shippable app assets.

python3 -I process_figma_assets.py SRC_DIR OUT_DIR
SRC_DIR holds the raw exports named by content hash (see docs/design/figma/README.md).
Trims to visible pixels (alpha > 24, so stray near-transparent specks don't inflate
the box), pads to a square, resizes with Lanczos and quantises to 256 colours.
"""
import os, sys
from PIL import Image

SRC, OUT = sys.argv[1], sys.argv[2]

def trimmed(h):
    im = Image.open(os.path.join(SRC, h + '.png')).convert('RGBA')
    mask = im.split()[3].point(lambda v: 255 if v > 24 else 0)
    return im.crop(mask.getbbox())

def squared(im, pad=0.04):
    s = int(max(im.size) * (1 + 2 * pad))
    c = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    c.paste(im, ((s - im.width) // 2, (s - im.height) // 2), im)
    return c

def save(im, rel):
    path = os.path.join(OUT, rel); os.makedirs(os.path.dirname(path), exist_ok=True)
    im.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(path, optimize=True)
    print(f'{rel:32s} {im.size[0]}x{im.size[1]} {os.path.getsize(path):>7,} B')

PASSY = {'wave': 'fee5724d', 'celebrate': '56c776c4', 'trophy': '71fccddb', 'fire': '98324ee6',
         'ai': '9833bc20', 'study': '68ea898f', 'encourage': '686b96e2', 'read': '33a91e15'}
TIERS = {'novice': 'd2b5d365', 'scholar': 'e66164f0', 'strategist': '6443782a',
         'sharpshooter': '08c5870f', 'legend': 'ffbfa409'}

for name, h in PASSY.items():
    save(squared(trimmed(h)).resize((512, 512), Image.LANCZOS), f'passy/{name}.png')
for name, h in TIERS.items():
    im = trimmed(h); im.thumbnail((320, 320), Image.LANCZOS); save(im, f'tiers/{name}.png')
# Wordmark lockups (mark + "PassEscort"), navy/sky on light and all-white on dark.
for name, h in {'lockup': 'e020efa0', 'lockup-white': 'bac8876a'}.items():
    im = trimmed(h); im.thumbnail((960, 960), Image.LANCZOS); save(im, f'brand/{name}.png')
# Splash mountain-and-flag (transparent version).
im = trimmed('3830e3b4'); im.thumbnail((900, 900), Image.LANCZOS); save(im, 'brand/mountain.png')
# Book stack beside Passy on the score share card.
im = trimmed('a253a9e8'); im.thumbnail((240, 240), Image.LANCZOS); save(im, 'brand/books.png')
