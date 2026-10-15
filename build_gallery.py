"""
Combine every blueprint landing page into one self-contained file, blueprints/index.html.

Each model page (with its geometry inlined) is embedded as a string and shown in a full-window
frame. A model dropdown is added to each page's header, next to its theme swatches; the chosen
theme carries over between models. Re-run after any page changes:

    python3 build_gallery.py
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
# (id, dropdown label, page folder, localStorage theme key the page uses)
MODELS = [
    ("cpu", "X9 Processor", "cpu_landing", "x9-theme"),
    ("turbofan", "TF-9 Turbofan", "turbofan_landing", "tf9-theme"),
    ("spectre", "Spectre x360 14", "spectre_landing", "sx360-theme"),
    ("macintosh", "Macintosh 128K", "macintosh_landing", "mac128k-theme"),
]
DEFAULT = "macintosh"


def page(folder):
    d = os.path.join(ROOT, folder)
    html = open(os.path.join(d, "index.html")).read()

    def inline(m):          # local <script src="x.js"> -> inline script
        return "<script>\n" + open(os.path.join(d, m.group(1))).read() + "</script>"
    html = re.sub(r'<script src="(?!https?:)([^"]+)"></script>', inline, html)
    return html


models = []
for mid, label, folder, key in MODELS:
    models.append(dict(id=mid, label=label, key=key, html=page(folder)))

shell = open(os.path.join(HERE, "gallery_shell.html")).read()
data = json.dumps(models).replace("<", "\\u003c")  # no "</script>" or "<!--" inside the script
out = shell.replace("/*MODELS*/[]", data).replace("/*DEFAULT*/\"\"", json.dumps(DEFAULT))
open(os.path.join(HERE, "index.html"), "w").write(out)
print(f"index.html {os.path.getsize(os.path.join(HERE, 'index.html')) / 1e6:.2f} MB, models: " + ", ".join(m["label"] for m in models))
