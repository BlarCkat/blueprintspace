"""
Exports a .blend file's meshes for a gallery model's build.js: every mesh object with its modifiers applied (subdivision
capped at one level), in world space, split by material. Each group has its positions in units of 0.05 mm (scaled so
the model is `width` mm across, centred on X and Y with its lowest point at Z = 0), its triangles, and its feature
edges: open edges and edges where the faces meet at more than `angle` degrees. Written as gzipped JSON.

    blender -b --factory-startup --disable-autoexec model.blend --python tools/blend_export.py -- \
        out.json.gz <objects to skip, comma separated> <degrees to turn about X> <feature angle> <width mm>
"""
import bpy, sys, json, math, gzip
from mathutils import Matrix

argv = sys.argv[sys.argv.index("--") + 1:]
out, skip = argv[0], set(filter(None, argv[1].split(",")))
rotx, angle, width = float(argv[2]), float(argv[3]), float(argv[4])
for o in bpy.data.objects:
    for m in o.modifiers:
        if m.type == "SUBSURF":
            m.levels = min(m.levels, 1)
            m.render_levels = m.levels
dg = bpy.context.evaluated_depsgraph_get()
R = Matrix.Rotation(math.radians(rotx), 4, "X")
cos_t = math.cos(math.radians(angle))
groups = []
for o in bpy.context.scene.objects:
    if o.type != "MESH" or o.name in skip or o.hide_render:
        continue
    ev = o.evaluated_get(dg)
    me = ev.to_mesh()
    me.calc_loop_triangles()
    M = R @ o.matrix_world
    N = M.to_3x3().inverted().transposed()
    P = [tuple(M @ v.co) for v in me.vertices]
    pn = [(N @ p.normal).normalized() for p in me.polygons]
    faces = {}
    for p in me.polygons:
        for ek in p.edge_keys:
            faces.setdefault(ek, []).append(p.index)
    mats = [s.material.name if s.material else "none" for s in o.material_slots] or ["none"]
    pm = [min(p.material_index, len(mats) - 1) for p in me.polygons]
    tris, lines = {}, {}
    for t in me.loop_triangles:
        tris.setdefault(pm[t.polygon_index], []).append(tuple(t.vertices))
    for ek, fs in faces.items():
        if len(fs) != 2 or pn[fs[0]].dot(pn[fs[1]]) < cos_t:
            lines.setdefault(pm[fs[0]], []).append(ek)
    for mi in sorted(set(tris) | set(lines)):
        T, L = tris.get(mi, []), lines.get(mi, [])
        used = sorted({i for t in T for i in t} | {i for e in L for i in e})
        at = {v: k for k, v in enumerate(used)}
        groups.append({"name": o.name, "mat": mats[mi], "pos": [P[v] for v in used],
                       "tris": [at[i] for t in T for i in t], "lines": [at[i] for e in L for i in e]})
    ev.to_mesh_clear()

xs = [p[0] for g in groups for p in g["pos"]]
ys = [p[1] for g in groups for p in g["pos"]]
zs = [p[2] for g in groups for p in g["pos"]]
k = width / (max(xs) - min(xs)) / 0.05
c = ((max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, min(zs))
for g in groups:
    g["pos"] = [round((p[i] - c[i]) * k) for p in g["pos"] for i in range(3)]
with gzip.open(out, "wt") as f:
    json.dump({"unit": 0.05, "groups": groups}, f, separators=(",", ":"))
for g in groups:
    print("GROUP %-14s %-24s %6d vertices %6d triangles %5d edges" % (g["name"], g["mat"], len(g["pos"]) // 3, len(g["tris"]) // 3, len(g["lines"]) // 2))
