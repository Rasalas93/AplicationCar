"""Ford Focus MK3 (2011) procedural hero render: body loft, ray-cast decals, wheels, studio, EEVEE."""
import argparse
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import delaunay_2d_cdt

ap = argparse.ArgumentParser()
ap.add_argument("out")
ap.add_argument("--view", default="hero")
ap.add_argument("--width", type=int, default=1920)
ap.add_argument("--samples", type=int, default=32)
ap.add_argument("--frames", default="")
ap.add_argument("--fps", type=int, default=24)
ap.add_argument("--seconds", type=float, default=10.0)
ap.add_argument("--clay", action="store_true")
ap.add_argument("--pt", action="store_true")
ap.add_argument("--glb", action="store_true")
ap.add_argument("--sin-matricula", action="store_true")
A = ap.parse_args(sys.argv[sys.argv.index("--") + 1:])
SEMILLA = Path(__file__).resolve().parents[2] / "datos" / "semilla.json"
MATRICULA = json.loads(SEMILLA.read_text())["vehiculos"][0]["matricula"]

XF, XR = 2.209, -2.149
AXF, AXR = 1.324, -1.324
TRACK = 0.772
RW = 0.316
D = bpy.data
bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene
COL = bpy.context.collection


def curve(pts, blur=0.035):
    """Dense smoothed lookup through (x, value) control points."""
    pts = sorted(pts)
    xs = np.linspace(XR - 0.3, XF + 0.3, 2400)
    ys = np.interp(xs, [p[0] for p in pts], [p[1] for p in pts])
    k = max(1, int(blur / (xs[1] - xs[0])))
    ker = np.hanning(2 * k + 1)
    ker /= ker.sum()
    ys = np.convolve(np.pad(ys, k, mode="edge"), ker, mode="valid")
    return lambda x: float(np.interp(x, xs, ys))


ZTOP = curve([(2.209, 0.645), (2.17, 0.715), (2.05, 0.785), (1.70, 0.868), (1.324, 0.935), (1.10, 0.985), (0.99, 1.008),
              (0.62, 1.21), (0.28, 1.365), (0.02, 1.425), (-0.40, 1.445), (-1.00, 1.43), (-1.50, 1.38),
              (-1.74, 1.335), (-1.80, 1.24), (-2.00, 1.00), (-2.09, 0.90), (-2.135, 0.74), (-2.149, 0.56)], 0.03)
ZBOT = curve([(2.209, 0.20), (2.05, 0.165), (-1.85, 0.165), (-2.05, 0.24), (-2.149, 0.33)])
WID = curve([(2.209, 0.60), (2.16, 0.735), (2.03, 0.825), (1.78, 0.88), (1.324, 0.905), (0.6, 0.9115), (-1.324, 0.9115),
             (-1.8, 0.885), (-2.03, 0.80), (-2.12, 0.70), (-2.149, 0.60)], 0.06)
ZSH = curve([(2.209, 0.52), (1.9, 0.66), (1.324, 0.74), (0.6, 0.76), (-0.6, 0.82), (-1.5, 0.90), (-2.149, 0.86)], 0.1)
BELT = curve([(2.3, 0.99), (1.1, 0.96), (0.9, 0.95), (-0.3, 0.985), (-1.2, 1.03), (-1.75, 1.075), (-2.2, 1.06)], 0.1)
WROOF = curve([(2.3, 0.62), (0.2, 0.62), (-0.5, 0.60), (-1.2, 0.585), (-1.8, 0.555), (-2.2, 0.54)], 0.1)


def sstep(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


NSEG = 9
RA = 0.372


def section(x):
    """Half cross-section (y >= 0) at station x, bottom centre to roof centre."""
    w, zb, zt = WID(x), ZBOT(x), ZTOP(x)
    belt = min(BELT(x), zt - 0.05)
    hgt = zt - belt
    wt = (w - 0.15) + (min(WROOF(x), w - 0.15) - (w - 0.15)) * sstep(0.03, 0.32, hgt)
    zsh = min(ZSH(x), belt - 0.06)
    c = [(w - 0.14, zb), (w - 0.03, zb + 0.05), (w - 0.02, zb + 0.20), (w - 0.004, zsh - 0.012), (w, zsh), (w - 0.022, zsh + 0.035),
         (w - 0.05, belt), (w - 0.055, belt + 0.004), (wt + 0.03, zt - 0.06), (wt - 0.05, zt - 0.022),
         (wt * 0.5, zt - 0.004)]
    c = [(0.0, zb)] + c + [(0.0, zt)]
    c = [(-c[1][0], c[1][1])] + c + [(-c[-2][0], c[-2][1])]
    out = []
    for i in range(len(c) - 3):
        p = c[i:i + 4]
        for k in range(NSEG):
            u = k / NSEG
            b = ((1 - u) ** 3 / 6, (3 * u ** 3 - 6 * u ** 2 + 4) / 6, (-3 * u ** 3 + 3 * u ** 2 + 3 * u + 1) / 6, u ** 3 / 6)
            out.append((sum(b[j] * p[j][0] for j in range(4)), sum(b[j] * p[j][1] for j in range(4))))
    p = c[-3:]
    out.append(((p[0][0] + 4 * p[1][0] + p[2][0]) / 6, (p[0][1] + 4 * p[1][1] + p[2][1]) / 6))
    ys = [max(0.0, q[0]) for q in out]
    zs = [q[1] for q in out]
    ky = w / max(ys)
    z0, z1 = min(zs), max(zs)
    return [(y * ky, zb + (z - z0) / (z1 - z0) * (zt - zb)) for y, z in zip(ys, zs)]


def new_obj(name, bm, mats=(), smooth=True):
    me = D.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    if smooth:
        for p in me.polygons:
            p.use_smooth = not (name == "body" and p.material_index == 1)
    o = D.objects.new(name, me)
    COL.objects.link(o)
    return o


def build_body():
    n = 330
    ts = [0.5 - 0.5 * math.cos(math.pi * i / (n - 1)) for i in range(n)]
    cap = 0.035
    stations = [(XR + cap + (XF - XR - 2 * cap) * (0.75 * t + 0.25 * i / (n - 1)), 1.0, 0.0) for i, t in enumerate(ts)]
    caps = [(0.96, 0.25), (0.86, 0.55), (0.68, 0.82), (0.42, 0.96), (0.18, 1.0)]
    front = [(stations[-1][0], s, cap * b) for s, b in caps]
    rear = [(stations[0][0], s, -cap * b) for s, b in reversed(caps)]
    rings = []
    for x, sc, dx in rear + stations + front:
        sec = section(x)
        zc = (sec[0][1] + sec[-1][1]) / 2 - 0.02
        half = [(x + dx, y * sc, zc + (z - zc) * sc) for y, z in sec]
        rings.append(half + [(p[0], -p[1], p[2]) for p in reversed(half[1:-1])])
    bm = bmesh.new()
    vr = [[bm.verts.new(p) for p in r] for r in rings]
    m = len(vr[0])
    for a, b in zip(vr, vr[1:]):
        for j in range(m):
            bm.faces.new((a[j], a[(j + 1) % m], b[(j + 1) % m], b[j]))
    for r in (vr[0], vr[-1]):
        bm.faces.new(r)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    NP = 72
    zc = RW + 0.012
    for ax in (AXF, AXR):
        cand = {f for f in bm.faces if abs(f.calc_center_median().x - ax) < 0.5 and abs(f.calc_center_median().y) > 0.5}
        for q in range(NP):
            a = 2 * math.pi * q / NP
            nrm = Vector((math.cos(a), 0, math.sin(a)))
            pt = Vector((ax, 0, zc)) + nrm * RA
            fs = [f for f in cand if f.is_valid and ((f.calc_center_median() - pt) * Vector((1, 0, 1))).length < 0.16]
            geom = list({e for f in fs for e in f.edges}) + list({v for f in fs for v in f.verts}) + fs
            res = bmesh.ops.bisect_plane(bm, geom=geom, dist=1e-6, plane_co=pt, plane_no=nrm)
            for g in res["geom_cut"]:
                if isinstance(g, bmesh.types.BMVert):
                    cand.update(g.link_faces)
        kill = []
        for f in cand:
            if not f.is_valid:
                continue
            c = f.calc_center_median()
            dx, dz = c.x - ax, c.z - zc
            dl = (math.atan2(dz, dx) + math.pi / NP) % (2 * math.pi / NP) - math.pi / NP
            if abs(c.y) > 0.5 and math.hypot(dx, dz) * math.cos(dl) < RA - 1e-5:
                kill.append(f)
        bmesh.ops.delete(bm, geom=kill, context="FACES")
        for sy in (1, -1):
            inner = {}
            edges = [e for e in bm.edges if len(e.link_faces) == 1 and all(
                v.co.y * sy > 0.5 and abs(v.co.x - ax) < 0.5 for v in e.verts)]
            for e in edges:
                for v in e.verts:
                    if v not in inner:
                        inner[v] = bm.verts.new((v.co.x, sy * 0.5, v.co.z))
                a, b = e.verts
                bm.faces.new((a, b, inner[b], inner[a])).material_index = 1
            ring = sorted(inner.values(), key=lambda v: math.atan2(v.co.z - zc, v.co.x - ax + 1e-9))
            if len(ring) > 2:
                bm.faces.new(ring).material_index = 1
    return bm


def chaikin(pts, n):
    pts = [Vector(p) for p in pts]
    for _ in range(n):
        out = []
        for a, b in zip(pts, pts[1:] + pts[:1]):
            out += [a.lerp(b, 0.25), a.lerp(b, 0.75)]
        pts = out
    return pts


def resample(pts, h):
    out = []
    for a, b in zip(pts, pts[1:] + pts[:1]):
        k = max(1, int((b - a).length / h))
        out += [a.lerp(b, i / k) for i in range(k)]
    return out


def inside(p, poly):
    c = False
    for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]):
        if (y1 > p[1]) != (y2 > p[1]) and p[0] < (x2 - x1) * (p[1] - y1) / (y2 - y1) + x1:
            c = not c
    return c


BVH = None


def decal(name, pts, d, mat, off=0.004, h=0.022, smooth=2, mirror=True, parent=None):
    """Polygon near the body, snapped onto it along direction d and lifted by off."""
    d = Vector(d).normalized()
    e1 = d.cross(Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))).normalized()
    e2 = d.cross(e1)
    ring = resample(chaikin(pts, smooth), h)
    b2 = [(p.dot(e1), p.dot(e2)) for p in ring]
    lo = (min(p[0] for p in b2), min(p[1] for p in b2))
    hi = (max(p[0] for p in b2), max(p[1] for p in b2))
    inner = []
    y = lo[1] + h / 2
    while y < hi[1]:
        x = lo[0] + h / 2
        while x < hi[0]:
            if inside((x, y), b2) and min((Vector(q) - Vector((x, y))).length for q in b2) > h * 0.45:
                inner.append((x, y))
            x += h
        y += h
    nb = len(b2)
    vs, _, fs, _, _, _ = delaunay_2d_cdt([Vector(p) for p in b2 + inner], [(i, (i + 1) % nb) for i in range(nb)],
                                         [list(range(nb))], 1, 1e-6)
    bm = bmesh.new()
    bv = []
    for v in vs:
        o = e1 * v.x + e2 * v.y - d * 8
        loc, nor, _, _ = BVH.ray_cast(o, d)
        if loc is None:
            loc, nor = o + d * 8, -d
        bv.append(bm.verts.new(loc + nor * off))
    for f in fs:
        try:
            bm.faces.new([bv[i] for i in f])
        except ValueError:
            pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bm.faces and sum((f.normal.dot(d) for f in bm.faces)) > 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    o = new_obj(name, bm, [mat])
    if mirror:
        o.modifiers.new("m", "MIRROR").use_axis = (False, True, False)
    return o


def strip(name, line, d, mat, w=0.007, off=0.0025, mirror=True):
    """Thin band along a 3D polyline (a shut line)."""
    d = Vector(d).normalized()
    line = [Vector(p) for p in line]
    for _ in range(2):
        out = [line[0]]
        for a, b in zip(line, line[1:]):
            out += [a.lerp(b, 0.25), a.lerp(b, 0.75)]
        line = out + [line[-1]]
    left, right = [], []
    for i, p in enumerate(line):
        t = (line[min(i + 1, len(line) - 1)] - line[max(i - 1, 0)]).normalized()
        nrm = t.cross(d).normalized() * (w / 2)
        left.append(p + nrm)
        right.append(p - nrm)
    return decal(name, left + right[::-1], d, mat, off=off, h=0.02, smooth=0, mirror=mirror)


# ---------- materials ----------
def principled(name, **kw):
    m = D.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    for k, v in kw.items():
        b.inputs[k].default_value = v
    return m


def M_paint():
    m = principled("paint", Metallic=0.9, Roughness=0.26)
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Coat Weight"].default_value = 1.0
    b.inputs["Coat Roughness"].default_value = 0.025
    b.inputs["Coat IOR"].default_value = 1.6
    n, ln = m.node_tree.nodes, m.node_tree.links
    lw = n.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.35
    ramp = n.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.62, 0.012, 0.022, 1)
    ramp.color_ramp.elements[1].color = (0.10, 0.0, 0.006, 1)
    ln.new(lw.outputs["Facing"], ramp.inputs["Fac"])
    tc = n.new("ShaderNodeTexCoord")
    vor = n.new("ShaderNodeTexVoronoi")
    vor.inputs["Scale"].default_value = 2600
    ln.new(tc.outputs["Object"], vor.inputs["Vector"])
    mix = n.new("ShaderNodeMix")
    mix.data_type, mix.blend_type = "RGBA", "ADD"
    hsv = n.new("ShaderNodeMath")
    hsv.operation = "POWER"
    ln.new(vor.outputs["Color"], hsv.inputs[0])
    hsv.inputs[1].default_value = 6.0
    mul = n.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mul.inputs[1].default_value = 0.22
    ln.new(hsv.outputs[0], mul.inputs[0])
    ln.new(mul.outputs[0], mix.inputs["Factor"])
    ln.new(ramp.outputs["Color"], mix.inputs[6])
    mix.inputs[7].default_value = (1.0, 0.45, 0.35, 1)
    ln.new(mix.outputs[2], b.inputs["Base Color"])
    bump = n.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.05
    bump.inputs["Distance"].default_value = 0.0004
    ln.new(vor.outputs["Distance"], bump.inputs["Height"])
    ln.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m


def M_tyre():
    m = principled("tyre", **{"Base Color": (0.012, 0.012, 0.013, 1), "Roughness": 0.62})
    n, ln = m.node_tree.nodes, m.node_tree.links
    b = n["Principled BSDF"]
    tc = n.new("ShaderNodeTexCoord")
    sep = n.new("ShaderNodeSeparateXYZ")
    ln.new(tc.outputs["Object"], sep.inputs[0])
    w = n.new("ShaderNodeTexWave")
    w.wave_type, w.bands_direction = "BANDS", "Y"
    w.inputs["Scale"].default_value = 70
    w.inputs["Distortion"].default_value = 0.0
    ln.new(tc.outputs["Object"], w.inputs["Vector"])
    ang = n.new("ShaderNodeMath")
    ang.operation = "ARCTAN2"
    ln.new(sep.outputs["X"], ang.inputs[0])
    ln.new(sep.outputs["Z"], ang.inputs[1])
    sn = n.new("ShaderNodeMath")
    sn.operation = "SINE"
    k = n.new("ShaderNodeMath")
    k.operation = "MULTIPLY"
    k.inputs[1].default_value = 150
    ln.new(ang.outputs[0], k.inputs[0])
    ln.new(k.outputs[0], sn.inputs[0])
    add = n.new("ShaderNodeMath")
    add.operation = "MULTIPLY"
    ln.new(w.outputs["Fac"], add.inputs[0])
    ln.new(sn.outputs[0], add.inputs[1])
    rad = n.new("ShaderNodeMath")
    rad.operation = "ABSOLUTE"
    ln.new(sep.outputs["Y"], rad.inputs[0])
    tr = n.new("ShaderNodeMapRange")
    tr.inputs["From Min"].default_value, tr.inputs["From Max"].default_value = 0.092, 0.080
    ln.new(rad.outputs[0], tr.inputs["Value"])
    msk = n.new("ShaderNodeMath")
    msk.operation = "MULTIPLY"
    ln.new(add.outputs[0], msk.inputs[0])
    ln.new(tr.outputs[0], msk.inputs[1])
    bump = n.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.3
    bump.inputs["Distance"].default_value = 0.002
    ln.new(msk.outputs[0], bump.inputs["Height"])
    ln.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m


def M_emit(name, col, strength):
    m = principled(name, **{"Base Color": (0, 0, 0, 1), "Emission Color": (*col, 1), "Emission Strength": strength})
    return m


def M_floor():
    m = principled("floor", **{"Base Color": (0.018, 0.019, 0.022, 1), "Roughness": 0.2})
    n, ln = m.node_tree.nodes, m.node_tree.links
    b = n["Principled BSDF"]
    tc = n.new("ShaderNodeTexCoord")
    no = n.new("ShaderNodeTexNoise")
    no.inputs["Scale"].default_value = 0.55
    no.inputs["Detail"].default_value = 6
    ln.new(tc.outputs["Object"], no.inputs["Vector"])
    mr = n.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value, mr.inputs["From Max"].default_value = 0.38, 0.68
    mr.inputs["To Min"].default_value, mr.inputs["To Max"].default_value = 0.07, 0.42
    ln.new(no.outputs["Fac"], mr.inputs["Value"])
    ln.new(mr.outputs[0], b.inputs["Roughness"])
    n2 = n.new("ShaderNodeTexNoise")
    n2.inputs["Scale"].default_value = 180
    ln.new(tc.outputs["Object"], n2.inputs["Vector"])
    bump = n.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.25
    bump.inputs["Distance"].default_value = 0.002
    ln.new(n2.outputs["Fac"], bump.inputs["Height"])
    ln.new(bump.outputs["Normal"], b.inputs["Normal"])
    gl = n.new("ShaderNodeBsdfGlossy")
    gl.inputs["Color"].default_value = (0.20, 0.21, 0.23, 1)
    ln.new(mr.outputs[0], gl.inputs["Roughness"])
    ln.new(bump.outputs["Normal"], gl.inputs["Normal"])
    df = n.new("ShaderNodeBsdfDiffuse")
    df.inputs["Color"].default_value = (0.012, 0.013, 0.016, 1)
    add = n.new("ShaderNodeAddShader")
    ln.new(gl.outputs[0], add.inputs[0])
    ln.new(df.outputs[0], add.inputs[1])
    ln_ = n.new("ShaderNodeVectorMath")
    ln_.operation = "LENGTH"
    ln.new(tc.outputs["Object"], ln_.inputs[0])
    fall = n.new("ShaderNodeMapRange")
    fall.interpolation_type = "SMOOTHSTEP"
    fall.inputs["From Min"].default_value, fall.inputs["From Max"].default_value = 6.0, 17.0
    ln.new(ln_.outputs["Value"], fall.inputs["Value"])
    blk = n.new("ShaderNodeBsdfDiffuse")
    blk.inputs["Color"].default_value = (0, 0, 0, 1)
    ms = n.new("ShaderNodeMixShader")
    ln.new(fall.outputs[0], ms.inputs[0])
    ln.new(add.outputs[0], ms.inputs[1])
    ln.new(blk.outputs[0], ms.inputs[2])
    ln.new(ms.outputs[0], n["Material Output"].inputs["Surface"])
    return m


if A.clay:
    clay = principled("clay", **{"Base Color": (0.6, 0.6, 0.62, 1), "Roughness": 0.45})
    dark = principled("clayd", **{"Base Color": (0.05, 0.05, 0.06, 1), "Roughness": 0.3})
    red = principled("clayr", **{"Base Color": (0.6, 0.05, 0.05, 1), "Roughness": 0.3})
    PAINT = clay
    GLASS = RUBBER = GLOSSK = ARCH = TYRE = GRILLE = dark
    CHROME = ALLOY = HEAD = PLATE = clay
    TAIL = E_RED = E_AMBER = FORD = PLATEB = red
    E_WHITE = INK = clay
    DISC = clay
else:
    PAINT = M_paint()
    GLASS = principled("glass", **{"Base Color": (0.004, 0.006, 0.008, 1), "Roughness": 0.02, "Metallic": 0.0,
                                   "Coat Weight": 1.0, "Coat Roughness": 0.0, "IOR": 1.55})
    RUBBER = principled("rubber", **{"Base Color": (0.008, 0.008, 0.008, 1), "Roughness": 0.55})
    GLOSSK = principled("glossk", **{"Base Color": (0.006, 0.006, 0.007, 1), "Roughness": 0.08, "Coat Weight": 1.0})
    GRILLE = principled("grille", **{"Base Color": (0.01, 0.01, 0.011, 1), "Roughness": 0.4})
    ARCH = principled("arch", **{"Base Color": (0.004, 0.004, 0.004, 1), "Roughness": 0.9})
    CHROME = principled("chrome", **{"Base Color": (0.9, 0.9, 0.92, 1), "Metallic": 1.0, "Roughness": 0.06})
    ALLOY = principled("alloy", **{"Base Color": (0.62, 0.63, 0.66, 1), "Metallic": 1.0, "Roughness": 0.24,
                                   "Coat Weight": 0.6, "Coat Roughness": 0.05})
    DISC = principled("disc", **{"Base Color": (0.35, 0.35, 0.36, 1), "Metallic": 1.0, "Roughness": 0.38})
    HEAD = principled("head", **{"Base Color": (0.30, 0.31, 0.33, 1), "Metallic": 1.0, "Roughness": 0.22,
                                 
                                 "Coat Weight": 1.0, "Coat Roughness": 0.0})
    TAIL = principled("tail", **{"Base Color": (0.07, 0.0, 0.002, 1), "Roughness": 0.08, "Coat Weight": 1.0,
                                 "Emission Color": (1, 0.02, 0.01, 1), "Emission Strength": 0.12})
    TYRE = M_tyre()
    E_WHITE = M_emit("ewhite", (0.85, 0.92, 1.0), 34)
    E_RED = M_emit("ered", (1.0, 0.03, 0.01), 9)
    E_AMBER = principled("amber", **{"Base Color": (0.8, 0.25, 0.01, 1), "Roughness": 0.1, "Coat Weight": 1.0})
    PLATE = principled("plate", **{"Base Color": (0.82, 0.82, 0.80, 1), "Roughness": 0.35})
    PLATEB = principled("plateb", **{"Base Color": (0.0, 0.07, 0.45, 1), "Roughness": 0.35})
    INK = principled("ink", **{"Base Color": (0.005, 0.005, 0.005, 1), "Roughness": 0.4})
    FORD = principled("ford", **{"Base Color": (0.0, 0.035, 0.22, 1), "Roughness": 0.08, "Coat Weight": 1.0})

# ---------- body ----------
body = new_obj("body", build_body(), [PAINT, ARCH])
bm = bmesh.new()
bm.from_mesh(body.data)
BVH = BVHTree.FromBMesh(bm)

SIDE, TOP, FRONT, REAR = (0, -1, 0), (0, 0, -1), (-1, 0, 0), (1, 0, 0)
Y = 1.2

# glazing
dlo = [(0.97, Y, 0.975), (-0.3, Y, 1.012), (-1.2, Y, 1.058), (-1.74, Y, 1.105), (-1.56, Y, 1.215), (-1.2, Y, 1.292),
       (-0.6, Y, 1.338), (-0.05, Y, 1.332), (0.28, Y, 1.255), (0.62, Y, 1.108), (0.86, Y, 1.012)]
ctr = Vector((-0.5, Y, 1.15))
decal("dlo_frame", [ctr + (Vector(p) - ctr) * 1.045 for p in dlo], SIDE, RUBBER, off=0.002, smooth=2)
decal("dlo", dlo, SIDE, GLASS, off=0.004, smooth=2)
strip("bpillar", [(-0.30, Y, 0.99), (-0.27, Y, 1.36)], SIDE, GLOSSK, w=0.085, off=0.0055)
strip("cpillar", [(-1.22, Y, 1.04), (-1.16, Y, 1.31)], SIDE, GLOSSK, w=0.05, off=0.0055)
decal("windshield", [(1.03, 0, 3), (1.01, 0.36, 3), (0.93, 0.65, 3), (0.55, 0.585, 3), (0.12, 0.50, 3), (0.15, 0, 3),
                     (0.12, -0.50, 3), (0.55, -0.585, 3), (0.93, -0.65, 3), (1.01, -0.36, 3)], TOP, GLASS, smooth=2, mirror=False)
decal("sunroof", [(-0.05, 0.42, 3), (-0.05, -0.42, 3), (-0.72, -0.41, 3), (-0.72, 0.41, 3)], TOP, GLASS, mirror=False)
decal("rearglass", [(-3, 0, 1.03), (-3, 0.60, 1.035), (-3, 0.645, 1.07), (-3, 0.50, 1.275), (-3, 0, 1.285), (-3, -0.50, 1.275),
                    (-3, -0.645, 1.07), (-3, -0.60, 1.035)], REAR, GLASS, smooth=2, mirror=False)
decal("cowl", [(1.12, 0, 3), (1.10, 0.45, 3), (1.02, 0.71, 3), (0.96, 0.68, 3), (1.04, 0.36, 3), (1.06, 0, 3),
               (1.04, -0.36, 3), (0.96, -0.68, 3), (1.02, -0.71, 3), (1.10, -0.45, 3)], TOP, RUBBER, off=0.002, mirror=False)

# lamps
HD = (-0.55, -0.62, -0.56)
head = [(2.13, 0.33, 0.69), (2.02, 0.58, 0.775), (1.74, 0.78, 0.83), (1.36, 0.865, 0.855), (1.62, 0.895, 0.735),
        (1.93, 0.82, 0.635), (2.13, 0.60, 0.595)]
decal("headlamp", head, HD, HEAD, off=0.006, h=0.014, smooth=3)
proj = [(1.99 + 0.045 * math.cos(a), 0.66 + 0.06 * math.sin(a), 0.71 + 0.045 * math.sin(a + 1)) for a in np.linspace(0, 6.283, 14)[:-1]]
decal("projector", proj, HD, E_WHITE, off=0.009, h=0.012, smooth=1)
proj2 = [(1.84 + 0.035 * math.cos(a), 0.755 + 0.045 * math.sin(a), 0.755 + 0.035 * math.sin(a + 1)) for a in np.linspace(0, 6.283, 14)[:-1]]
decal("projector2", proj2, HD, E_WHITE, off=0.009, h=0.012, smooth=1)
for nm, ring in (("ring1", proj), ("ring2", proj2)):
    c = sum((Vector(q) for q in ring), Vector()) / len(ring)
    decal(nm, [c + (Vector(q) - c) * 1.28 for q in ring], HD, CHROME, off=0.0075, h=0.012, smooth=1)
strip("blade", [(2.09, 0.52, 0.63), (1.95, 0.79, 0.668), (1.72, 0.885, 0.742)], HD, CHROME, w=0.016, off=0.0075)
strip("drl", [(2.09, 0.52, 0.63), (1.95, 0.79, 0.668), (1.72, 0.885, 0.742)], HD, E_WHITE, w=0.007, off=0.0095)
decal("indicator", [(1.60, 0.865, 0.805), (1.46, 0.875, 0.825), (1.56, 0.89, 0.785), (1.66, 0.88, 0.775)], HD, E_AMBER, off=0.009, h=0.012)
TD = (0.62, -0.72, -0.25)
tail = [(-2.115, 0.58, 1.01), (-2.02, 0.80, 1.045), (-1.75, 0.89, 1.04), (-1.42, 0.90, 0.985), (-1.74, 0.915, 0.90),
        (-2.03, 0.83, 0.80), (-2.14, 0.60, 0.79)]
decal("taillamp", tail, TD, TAIL, off=0.006, h=0.014, smooth=3)
decal("tailglow", [(-2.11, 0.62, 0.97), (-2.02, 0.80, 0.995), (-1.76, 0.89, 0.99), (-1.56, 0.905, 0.965), (-1.76, 0.91, 0.935),
                   (-2.03, 0.83, 0.90), (-2.125, 0.63, 0.90)], TD, E_RED, off=0.009, h=0.014, smooth=3)

decal("tailclear", [(-2.12, 0.62, 0.875), (-2.04, 0.82, 0.88), (-1.90, 0.885, 0.885), (-1.92, 0.89, 0.845), (-2.04, 0.83, 0.83),
                    (-2.13, 0.63, 0.825)], TD, HEAD, off=0.009, h=0.014, smooth=2)

# front fascia
decal("grille_up", [(3, 0.36, 0.625), (3, -0.36, 0.625), (3, -0.31, 0.572), (3, 0.31, 0.572)], FRONT, GRILLE, mirror=False, h=0.02, smooth=1)
strip("grille_bar", [(3, -0.34, 0.598), (3, 0.34, 0.598)], FRONT, CHROME, w=0.012, off=0.005, mirror=False)
decal("grille_low", [(3, 0.40, 0.52), (3, -0.40, 0.52), (3, -0.53, 0.235), (3, 0.53, 0.235)], FRONT, GRILLE, mirror=False, smooth=1)
for z in (0.28, 0.325, 0.37):
    w = 0.40 + (0.52 - z) / 0.285 * 0.13 - 0.03
    strip("lbar", [(3, -w, z), (3, w, z)], FRONT, GLOSSK, w=0.016, off=0.005, mirror=False)
decal("intake", [(3, 0.59, 0.45), (3, 0.80, 0.475), (3, 0.81, 0.36), (3, 0.63, 0.255)], FRONT, GRILLE, smooth=2, h=0.015)
fog = [(3, 0.71 + 0.04 * math.cos(a), 0.36 + 0.04 * math.sin(a)) for a in np.linspace(0, 6.283, 12)[:-1]]
decal("fog_ring", [(3, 0.71 + (q[1] - 0.71) * 1.25, 0.36 + (q[2] - 0.36) * 1.25) for q in fog], FRONT, CHROME, off=0.005, h=0.012, smooth=1)
decal("fog", fog, FRONT, GLASS, off=0.007, h=0.012, smooth=1)

# rear fascia
decal("diffuser", [(-3, 0.70, 0.40), (-3, -0.70, 0.40), (-3, -0.62, 0.275), (-3, 0.62, 0.275)], REAR, GRILLE, mirror=False, smooth=1)
decal("reflector", [(-3, 0.60, 0.50), (-3, 0.80, 0.51), (-3, 0.80, 0.475), (-3, 0.60, 0.465)], REAR, TAIL, h=0.012, smooth=1)

# shut lines
strip("door_f", [(0.86, Y, 0.96), (0.84, Y, 0.62), (0.79, Y, 0.27)], SIDE, RUBBER)
strip("door_b", [(-0.285, Y, 0.99), (-0.285, Y, 0.27)], SIDE, RUBBER)
strip("door_r", [(-1.22, Y, 1.04), (-1.21, Y, 0.80), (-1.06, Y, 0.60), (-0.90, Y, 0.48), (-0.88, Y, 0.27)], SIDE, RUBBER)
strip("sill", [(0.79, Y, 0.27), (-0.88, Y, 0.27)], SIDE, RUBBER)
strip("hood", [(1.04, 0.72, 3), (1.25, 0.745, 3), (1.40, 0.755, 3)], TOP, RUBBER)
strip("hatch", [(-3, 0.57, 1.0), (-3, 0.56, 0.66), (-3, 0.50, 0.615), (-3, 0, 0.61)], REAR, RUBBER)


def surf(x, y, z, d):
    d = Vector(d).normalized()
    loc, nor, _, _ = BVH.ray_cast(Vector((x, y, z)) - d * 4, d)
    return loc, nor


def box(name, size, loc, mat, bevel=0.01, rot=None, sub=2):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel, segments=3, affect="EDGES")
    o = new_obj(name, bm, [mat])
    o.location = loc
    if rot:
        o.rotation_euler = rot
    return o


# handles, mirrors, antenna
for sy in (1, -1):
    for hx, hz in ((-0.05, 0.905), (-1.02, 0.955)):
        loc, nor = surf(hx, sy * Y, hz, (0, -sy, 0))
        box("handle", (0.17, 0.028, 0.032), loc + nor * 0.006, PAINT, bevel=0.012, rot=(0, -0.045, 0))
    loc, nor = surf(0.84, sy * Y, 0.99, (0, -sy, 0))
    box("mirror_arm", (0.07, 0.12, 0.03), loc + Vector((0.0, sy * 0.05, 0.0)), GLOSSK, bevel=0.01)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=1.0)
    for v in bm.verts:
        v.co.x = max(v.co.x, -0.45)
    bmesh.ops.scale(bm, vec=(0.075, 0.108, 0.066), verts=bm.verts)
    mo = new_obj("mirror", bm, [PAINT])
    mo.location, mo.rotation_euler = loc + Vector((0.035, sy * 0.155, 0.05)), (0, 0, sy * 0.14)
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=True, segments=32, radius=1.0, matrix=Matrix.Rotation(math.pi / 2, 4, "Y"))
    bmesh.ops.scale(bm, vec=(1, 0.093, 0.056), verts=bm.verts)
    mg = new_obj("mirror_glass", bm, [CHROME])
    mg.location, mg.rotation_euler = loc + Vector((0.035 - 0.0345, sy * 0.155 + sy * 0.005, 0.05)), (0, 0, sy * 0.14)
bm = bmesh.new()
bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=0.006, radius2=0.002, depth=0.30)
ant = new_obj("antenna", bm, [RUBBER])
ant.location = (-1.42, 0, ZTOP(-1.3) + 0.09)
ant.rotation_euler = (0, -0.9, 0)


# plates and badges
def facing(sign):
    return Matrix(((0, 0, sign), (sign, 0, 0), (0, 1, 0))).to_4x4()


def text(name, body_, size, mat, m, loc, depth=0.001, shear=0.0, bold=False):
    c = D.curves.new(name, "FONT")
    c.body, c.size, c.extrude, c.align_x, c.align_y, c.shear = body_, size, depth, "CENTER", "CENTER", shear
    c.space_character = 1.12 if bold else 1.0
    if bold:
        c.offset = 0.0025
    o = D.objects.new(name, c)
    COL.objects.link(o)
    c.materials.append(mat)
    o.matrix_world = Matrix.Translation(loc) @ m
    return o


def plate(sign, x, z):
    m = facing(sign)
    c = Vector((x + sign * 0.006, 0, z))
    p = box("plate", (0.52, 0.11, 0.008), c, PLATE, bevel=0.003)
    p.matrix_world = Matrix.Translation(c) @ m
    b = box("plate_eu", (0.045, 0.104, 0.009), c, PLATEB, bevel=0.003)
    b.matrix_world = Matrix.Translation(c + Vector((0, sign * -0.234, 0))) @ m
    text("plate_txt", MATRICULA, 0.082, INK, m, c + Vector((sign * 0.005, sign * 0.022, 0)), bold=True)
    text("plate_e", "E", 0.026, PLATE, m, c + Vector((sign * 0.0055, sign * -0.234, -0.03)), bold=True)


def oval(sign, loc, nor, w=0.058):
    m = Matrix.Translation(loc + nor * 0.004) @ nor.to_track_quat("Z", "Y").to_matrix().to_4x4()
    for name, r, mat, dz in (("oval_rim", 1.0, CHROME, 0.0), ("oval", 0.9, FORD, 0.0015)):
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=12, radius=1.0)
        bmesh.ops.scale(bm, vec=(w * r, w * r * 0.40, 0.006 + dz), verts=bm.verts)
        o = new_obj(name, bm, [mat])
        o.matrix_world = m
    t = text("ford_txt", "Ford", w * 0.62, CHROME, Matrix(), (0, 0, 0), depth=0.0006, shear=0.35)
    t.matrix_world = m @ Matrix.Translation((0, 0, 0.0078))


loc, nor = surf(3, 0, 0.465, FRONT)
plate(1, loc.x, 0.465)
loc, nor = surf(-3, 0, 0.72, REAR)
plate(-1, loc.x, 0.72)
oval(1, *surf(2.178, 0, 3, TOP))
oval(-1, *surf(-3, 0, 0.90, REAR), w=0.062)
bm = bmesh.new()
bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.036, radius2=0.036, depth=0.12,
                      matrix=Matrix.Rotation(math.pi / 2, 4, "Y"))
ex = new_obj("exhaust", bm, [CHROME])
ex.location = (XR + 0.04, -0.52, 0.27)


# ---------- wheels ----------
def revolve(profile, seg=96):
    """Closed (r, y) profile spun about the Y axis."""
    bm = bmesh.new()
    rings = [[bm.verts.new((r * math.cos(a), y, r * math.sin(a))) for r, y in profile]
             for a in (2 * math.pi * i / seg for i in range(seg))]
    k = len(profile)
    for i in range(seg):
        a, b = rings[i], rings[(i + 1) % seg]
        for j in range(k):
            bm.faces.new((a[j], a[(j + 1) % k], b[(j + 1) % k], b[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def wheel():
    parts = []
    tp = [(0.203, -0.088), (0.222, -0.100), (0.262, -0.108), (0.296, -0.100), (0.311, -0.086), (0.316, -0.07),
          (0.3165, -0.045), (0.3125, -0.040), (0.3125, -0.032), (0.3165, -0.027), (0.3165, 0.027), (0.3125, 0.032),
          (0.3125, 0.040), (0.3165, 0.045), (0.316, 0.07), (0.311, 0.086), (0.296, 0.100), (0.262, 0.108),
          (0.222, 0.100), (0.203, 0.088)]
    tyre = new_obj("tyre", revolve(tp), [TYRE])
    tyre.modifiers.new("s", "SUBSURF").levels = 1
    tyre.modifiers["s"].render_levels = 1
    parts.append(tyre)
    rp = [(0.212, 0.094), (0.212, 0.082), (0.196, 0.076), (0.186, 0.02), (0.186, -0.09), (0.207, -0.095),
          (0.203, -0.10), (0.178, -0.094), (0.178, 0.02), (0.188, 0.086), (0.200, 0.097)]
    parts.append(new_obj("barrel", revolve(rp, 72), [ALLOY]))
    parts.append(new_obj("hub", revolve([(0.0, 0.058), (0.05, 0.062), (0.072, 0.055), (0.078, 0.03), (0.0, 0.03)], 48), [ALLOY]))
    parts.append(new_obj("cap", revolve([(0.0, 0.066), (0.026, 0.065), (0.03, 0.058), (0.0, 0.058)], 32), [FORD]))
    parts.append(new_obj("disc", revolve([(0.05, 0.012), (0.150, 0.012), (0.150, -0.012), (0.05, -0.012)], 64), [DISC]))
    cal = box("caliper", (0.07, 0.05, 0.13), (0.125, 0.0, 0.0), GRILLE, bevel=0.012)
    parts.append(cal)
    for i in range(5):
        a0 = 2 * math.pi * i / 5 + math.pi / 2
        lug = new_obj("lug", revolve([(0.0, 0.070), (0.008, 0.070), (0.010, 0.056), (0.0, 0.056)], 6), [CHROME])
        lug.location = (0.052 * math.cos(a0 + 0.628), 0, 0.052 * math.sin(a0 + 0.628))
        parts.append(lug)
        for da in (-0.20, 0.20):
            bm = bmesh.new()
            bmesh.ops.create_cube(bm, size=1.0)
            for v in bm.verts:
                t = v.co.z + 0.5
                v.co.x *= 0.034 - 0.012 * t
                v.co.y = v.co.y * (0.03 - 0.008 * t) + 0.052 + 0.03 * t ** 1.6
                v.co.z = 0.055 + t * 0.142
            bmesh.ops.bevel(bm, geom=bm.edges[:], offset=0.005, segments=2, affect="EDGES")
            sp = new_obj("spoke", bm, [ALLOY])
            aa = a0 + da * 0.55
            sp.matrix_world = Matrix.Rotation(-(aa - math.pi / 2), 4, "Y") @ Matrix.Rotation(-da * 0.45, 4, "Y")
            sp.matrix_world = Matrix.Rotation(-(a0 - math.pi / 2), 4, "Y") @ Matrix.Translation((da * 0.10, 0, 0)) @ Matrix.Rotation(da * 0.50, 4, "Y")
            parts.append(sp)
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    return parts[0]


w0 = wheel()
w0.location = (AXF, TRACK, RW)
for ax, sy in ((AXF, -1), (AXR, 1), (AXR, -1)):
    w = D.objects.new("wheel", w0.data)
    COL.objects.link(w)
    w.modifiers.new("s", "SUBSURF").levels = 0
    w.location = (ax, sy * TRACK, RW)
    w.rotation_euler = (0, 0.7 * ax, math.pi if sy < 0 else 0)

# ---------- stage ----------
bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=60)
floor = new_obj("floor", bm, [M_floor() if not A.clay else principled("f", **{"Base Color": (0.3, 0.3, 0.3, 1)})], smooth=False)


def studio_world():
    """Equirect softbox map: overhead bank, two side strips, end strips; hidden from the camera."""
    W, H = 2048, 1024
    lon = (np.arange(W) + 0.5) / W * 2 * np.pi - np.pi
    lat = (np.arange(H) + 0.5) / H * np.pi - np.pi / 2
    lon, lat = np.meshgrid(lon, lat)
    d = np.stack([np.cos(lat) * np.cos(lon), np.cos(lat) * np.sin(lon), np.sin(lat)], -1)
    img = np.zeros((H, W, 3), np.float32)

    def soft(v, a, b, e):
        return np.clip((v - a) / e, 0, 1) * np.clip((b - v) / e, 0, 1)

    def panel(axis, dist, ua, ub, va, vb, col, edge=0.5):
        k = dist / np.where(d[..., axis] * np.sign(dist) > 1e-4, d[..., axis], np.nan)
        p = d * k[..., None]
        o = [i for i in range(3) if i != axis]
        m = np.nan_to_num(soft(p[..., o[0]], ua, ub, edge) * soft(p[..., o[1]], va, vb, edge))
        img[...] += m[..., None] * np.array(col, np.float32)

    panel(2, 4.2, -5.0, 5.0, -1.5, 1.5, (9.0, 9.4, 10.0), 0.9)
    panel(1, 6.0, -14.0, 14.0, 0.25, 1.25, (5.5, 5.8, 6.4), 0.35)
    panel(1, -6.0, -14.0, 14.0, 0.25, 1.25, (5.5, 5.8, 6.4), 0.35)
    panel(1, 6.5, -7.0, 7.0, 2.6, 3.4, (3.0, 3.1, 3.4), 0.3)
    panel(1, -6.5, -7.0, 7.0, 2.6, 3.4, (3.0, 3.1, 3.4), 0.3)
    panel(0, 8.0, -3.0, 3.0, 0.4, 2.4, (4.0, 3.2, 2.6), 0.6)
    panel(0, -8.0, -3.0, 3.0, 0.4, 2.4, (2.2, 2.9, 4.2), 0.6)
    img += 0.012 + (0.7 * np.exp(-((lat - 0.10) / 0.17) ** 2))[..., None] * np.array((0.8, 0.9, 1.0), np.float32)
    im = D.images.new("studio", W, H, float_buffer=True)
    im.pixels.foreach_set(np.concatenate([img, np.ones((H, W, 1), np.float32)], -1).ravel())
    im.pack()
    wd = D.worlds.new("w")
    wd.use_nodes = True
    n, ln = wd.node_tree.nodes, wd.node_tree.links
    env = n.new("ShaderNodeTexEnvironment")
    env.image = im
    lp = n.new("ShaderNodeLightPath")
    mix = n.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    ln.new(lp.outputs["Is Camera Ray"], mix.inputs["Factor"])
    ln.new(env.outputs["Color"], mix.inputs[6])
    mix.inputs[7].default_value = (0.002, 0.0025, 0.004, 1)
    ln.new(mix.outputs[2], n["Background"].inputs["Color"])
    n["Background"].inputs["Strength"].default_value = 1.0
    S.world = wd


studio_world()

if A.sin_matricula:
    for o in [o for o in D.objects if o.name.startswith("plate_txt")]:
        D.objects.remove(o)

if A.glb:
    # Export for the app: PBR materials only, no floor, no plate text (plate comes from the vehicle data).
    for o in [o for o in D.objects if o.name.startswith(("floor", "plate_txt"))]:
        D.objects.remove(o)
    for m in (PAINT, TYRE):
        b = m.node_tree.nodes["Principled BSDF"]
        for l in list(b.inputs["Base Color"].links) + list(b.inputs["Normal"].links):
            m.node_tree.links.remove(l)
    PAINT.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.42, 0.006, 0.014, 1)
    for o in D.objects:
        o.select_set(o.type in ("MESH", "FONT"))
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.convert(target="MESH")
    im = D.images["studio"]
    im.scale(1024, 512)
    im.filepath_raw = A.out + "estudio.hdr"
    im.file_format = "HDR"
    im.save()
    bpy.ops.export_scene.gltf(filepath=A.out + "focus-crudo.glb", export_format="GLB", use_selection=True,
                              export_apply=True, export_yup=True, export_cameras=False, export_lights=False)
    sys.exit(0)


def area(name, loc, size, power, col, target=(0, 0, 0.5)):
    l = D.lights.new(name, "AREA")
    l.shape, l.size, l.size_y, l.energy, l.color = "RECTANGLE", size[0], size[1], power, col
    o = D.objects.new(name, l)
    COL.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return o


area("top", (0, 0, 4.2), (9, 2.6), 160, (1, 0.98, 0.96), (0, 0, 0))
area("rimL", (-6.5, 5.5, 1.6), (5, 0.7), 260, (0.55, 0.75, 1.0))
area("rimR", (-6.0, -6.0, 2.2), (5, 0.7), 260, (1.0, 0.62, 0.4))
area("front", (8, 2.0, 1.2), (3, 1.2), 60, (1, 0.95, 0.9))
if not A.clay:
    for sy in (1, -1):
        l = D.lights.new("beam", "SPOT")
        l.energy, l.spot_size, l.spot_blend, l.color = 900, 1.0, 0.9, (0.85, 0.92, 1.0)
        o = D.objects.new("beam", l)
        COL.objects.link(o)
        o.location = (2.3, sy * 0.66, 0.66)
        o.rotation_euler = (Vector((9, sy * 0.9, 0.0)) - o.location).to_track_quat("-Z", "Y").to_euler()
    rng = np.random.default_rng(7)
    em = {}
    for i in range(160):
        a, r = rng.uniform(0, 2 * math.pi), rng.uniform(22, 46)
        col = [(1.0, 0.55, 0.25), (0.35, 0.6, 1.0), (1.0, 0.9, 0.8), (1.0, 0.1, 0.08)][int(rng.integers(0, 4))]
        if col not in em:
            em[col] = M_emit("bk%d" % len(em), col, 22)
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=1, radius=float(rng.uniform(0.03, 0.09)))
        o = new_obj("bokeh", bm, [em[col]])
        o.location = (r * math.cos(a), r * math.sin(a), rng.uniform(0.4, 7.0))

tgt = D.objects.new("tgt", None)
COL.objects.link(tgt)
cd = D.cameras.new("cam")
cam = D.objects.new("cam", cd)
COL.objects.link(cam)
S.camera = cam
cd.dof.use_dof, cd.dof.focus_object, cd.dof.aperture_blades = True, tgt, 9
cd.clip_start, cd.clip_end = 0.1, 200
con = cam.constraints.new("TRACK_TO")
con.target, con.track_axis, con.up_axis = tgt, "TRACK_NEGATIVE_Z", "UP_Y"

VIEWS = {
    "hero": ((7.9, 5.5, 0.72), (0.12, 0.0, 0.60), 80, 2.4, (1.9, 0.75, 0.6)),
    "rear": ((-7.6, 5.2, 0.95), (-0.1, 0.0, 0.62), 78, 2.4, (-1.9, 0.75, 0.8)),
    "side": ((0.0, 11.0, 0.8), (0.0, 0.0, 0.66), 70, 4.0, (0, 0.9, 0.7)),
    "front": ((11.0, 0.0, 0.8), (0.0, 0.0, 0.66), 85, 4.0, (2.2, 0, 0.6)),
    "back": ((-11.0, 0.0, 0.9), (0.0, 0.0, 0.66), 85, 4.0, (-2.1, 0, 0.8)),
    "top": ((0.01, 0.0, 14.0), (0.0, 0.0, 0.5), 70, 8.0, (0, 0, 1.4)),
    "detalle": ((4.7, 3.5, 0.72), (1.56, 0.55, 0.42), 85, 1.6, (1.9, 0.78, 0.62)),
}


def set_view(pos, look, lens, fstop, focus):
    cam.location, tgt.location, cd.lens, cd.dof.aperture_fstop = pos, focus, lens, fstop
    con.target = aim
    aim.location = look


aim = D.objects.new("aim", None)
COL.objects.link(aim)

# ---------- render ----------
r = S.render
if A.pt:
    r.engine = "CYCLES"
    S.cycles.samples, S.cycles.use_denoising = A.samples, True
else:
    r.engine = "BLENDER_EEVEE"
    e = S.eevee
    e.taa_render_samples = A.samples
    e.use_shadows, e.use_raytracing = True, True
    e.ray_tracing_method = "SCREEN"
    e.ray_tracing_options.resolution_scale = "1"
    for k, v in (("probe_resolution", "2048"),):
        try:
            setattr(S.world, k, v)
        except Exception as err:
            print("world", k, err)
r.resolution_x, r.resolution_y, r.resolution_percentage = A.width, A.width * 9 // 16, 100
r.image_settings.file_format, r.image_settings.color_depth = "PNG", "16"
S.view_settings.view_transform = "AgX"
S.view_settings.look = "AgX - Medium High Contrast" if not A.clay else "None"
r.use_motion_blur = False


def look(bloom=0.5, glow=0.25, vignette=0.32, dispersion=0.004):
    res = (r.resolution_x, r.resolution_y)
    t = D.node_groups.new("Compositor", "CompositorNodeTree")
    S.compositing_node_group = t
    t.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    n, ln = t.nodes, t.links
    img = n.new("CompositorNodeRLayers").outputs["Image"]
    for kind, strength, sz, thr in (("Bloom", bloom, 0.12, 1.0), ("Fog Glow", glow, 0.05, 1.4)):
        g = n.new("CompositorNodeGlare")
        g.inputs["Type"].default_value = kind
        g.inputs["Threshold"].default_value = thr
        g.inputs["Strength"].default_value = strength
        g.inputs["Size"].default_value = sz
        ln.new(img, g.inputs["Image"])
        img = g.outputs["Image"]
    lens = n.new("CompositorNodeLensdist")
    lens.inputs["Dispersion"].default_value = dispersion
    lens.inputs["Fit"].default_value = True
    ln.new(img, lens.inputs["Image"])
    img = lens.outputs["Image"]
    el = n.new("CompositorNodeEllipseMask")
    el.inputs["Size"].default_value = (1.05, 1.05)
    bl = n.new("CompositorNodeBlur")
    bl.inputs["Size"].default_value = (0.25 * res[0], 0.25 * res[1])
    bl.inputs["Type"].default_value = "Fast Gaussian"
    ln.new(el.outputs[0], bl.inputs["Image"])
    mr = n.new("ShaderNodeMapRange")
    mr.inputs["To Min"].default_value = 1.0 - vignette
    ln.new(bl.outputs[0], mr.inputs["Value"])
    mul = n.new("ShaderNodeMix")
    mul.data_type, mul.blend_type = "RGBA", "MULTIPLY"
    mul.inputs["Factor"].default_value = 1.0
    ln.new(img, mul.inputs[6])
    ln.new(mr.outputs[0], mul.inputs[7])
    ln.new(mul.outputs[2], n.new("NodeGroupOutput").inputs[0])


if not A.clay:
    look()


def lamps(k):
    if A.clay:
        return
    E_WHITE.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 34 * k
    E_RED.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 0.4 + 8.6 * k
    for o in D.objects:
        if o.name.startswith("beam"):
            o.data.energy = 900 * k


if A.view == "orbit":
    n = int(A.fps * A.seconds)
    frames = range(1, n + 1)
    if A.frames:
        a, b, *st = (int(v) for v in A.frames.split(":"))
        frames = range(a, b + 1, st[0] if st else 1)
    for f in frames:
        t = (f - 1) / A.fps
        u = t / A.seconds
        th = math.radians(38) + 2 * math.pi * u
        rad = 10.6 - 1.2 * math.sin(math.pi * u) ** 2
        z = 0.62 + 0.75 * math.sin(math.pi * u) ** 2
        set_view((rad * math.cos(th), rad * math.sin(th), z), (0, 0, 0.62), 66, 2.8, (0, 0, 0.62))
        lamps(sstep(1.25, 1.6, t) * (0.55 + 0.45 * sstep(1.7, 2.3, t)))
        r.filepath = "%sf_%04d.png" % (A.out, f)
        bpy.ops.render.render(write_still=True)
else:
    for v in A.view.split(","):
        set_view(*VIEWS[v])
        lamps(1.0)
        r.filepath = A.out if "," not in A.view else "%s%s.png" % (A.out, v)
        bpy.ops.render.render(write_still=True)
