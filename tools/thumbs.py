"""Turns tools/thumbs.js's renders (white lines on black) into WebP masks for the home page: white, with the lines'
brightness as alpha, so the dark fills and background drop out and CSS can colour the lines with any theme.

    python3 tools/thumbs.py <render dir> thumbs
"""
import os, sys
from PIL import Image, ImageChops

src, out = sys.argv[1], sys.argv[2]
CROP = {"ps5": 0.72}   # fraction of the drawing's height to keep, from the top
os.makedirs(out, exist_ok=True)
for f in sorted(os.listdir(src)):
    if not f.endswith(".png"):
        continue
    im = Image.open(os.path.join(src, f)).convert("L")
    # the dark theme's fill is near black: lift everything below it to zero, stretch the rest to full
    a = im.point(lambda v: 0 if v < 26 else min(255, int((v - 26) * 255 / 200)))
    box = a.getbbox()
    if box and f[:-4] in CROP:   # some pages set a part well apart (the PS5's controller): keep to the main one
        k = CROP[f[:-4]]; box = (box[0], box[1], box[2], int(box[1] + (box[3] - box[1]) * k))
        box = a.crop(box).getbbox() and tuple(c + o for c, o in zip(a.crop(box).getbbox(), (box[0], box[1], box[0], box[1])))
    if box:   # trim to the drawing with a margin, keeping 4:3
        cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
        w, h = box[2] - box[0], box[3] - box[1]
        w = max(w, h * 4 / 3) * 1.12; h = w * 3 / 4
        a = a.crop((int(cx - w / 2), int(cy - h / 2), int(cx + w / 2), int(cy + h / 2))).resize((960, 720), Image.LANCZOS)
    rgba = Image.merge("RGBA", (Image.new("L", a.size, 255),) * 3 + (a,))
    rgba.save(os.path.join(out, f[:-4] + ".webp"), "WEBP", quality=82, method=6)
    print("wrote", f[:-4] + ".webp")
