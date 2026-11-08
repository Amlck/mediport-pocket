"""Mediport Pocket cinematic opening: the Blender (Cycles) scene, as code.

A grey void becomes a Doric marble temple at golden hour, the gate mark
materialises (wireframe, converging particles, a print line, light through the
cross) and an iris closes on the logo with a cyan rim. About 3.5 s.

Render with Blender's Python module (pip install bpy, Blender 5.2):

  python gate_opening.py OUT --frames 0.2,0.45,0.62,1.0 --res 360x640 --samples 24
  python gate_opening.py OUT --sequence 105 --res 360x640 --samples 24 \
      --export-geometry final-geometry.json
  # Final: 60 fps, in chunks that resume after an interruption
  python gate_opening.py OUT --sequence 210 --res 720x1280 --samples 40 --range 0:53 --skip-existing
  ffmpeg -framerate 60 -i OUT/f%04d.png -c:v libx264 -pix_fmt yuv420p -crf 19 \
      -movflags +faststart ../../src/images/opening/cinematic.mp4

pose(t) drives everything for t in [0, 1]; each frame is set from it and
rendered, so stills and the sequence share one definition. --export-geometry
writes the final frame's logo and iris position; copy those numbers into
src/app/lib/opening-cinematic.js so the app's flat lockup lines up with the
last frame. SLATE_OUT_LINEAR is calibrated so the area outside the iris comes
out as the icon's slate #1e293b under AgX Punchy.
"""
import argparse
import math
import os
import random
import sys

import bpy
import bmesh
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

LEFT = [(30, 9), (13, 16), (13, 48), (30, 55), (30, 35.5), (24, 35.5), (24, 28.5), (30, 28.5)]
RIGHT = [(36, 17), (49, 17), (51, 19), (51, 45), (49, 47), (36, 47), (36, 35.5), (42, 35.5), (42, 28.5), (36, 28.5)]
CROSS = [(30, 17), (36, 17), (36, 28.5), (42, 28.5), (42, 35.5), (36, 35.5), (36, 47), (30, 47),
         (30, 35.5), (24, 35.5), (24, 28.5), (30, 28.5)]
CENTER = (33, 32)
UNIT = 1 / 32
SLATE = '#1e293b'
VOID = '#0b1220'
CYAN = '#0891b2'
CYAN_HOT = '#67e8f9'
OFFWHITE = '#dfe5e3'
DEPTH = 0.22
SLATE_OUT_LINEAR = (0.0351, 0.0440, 0.0752, 1.0)   # calibrated: AgX Punchy output is exactly #1e293b
FLOOR_Y = -1.05


def lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def rgba(hex_color, a=1.0):
    h = hex_color.lstrip('#')
    return tuple(lin(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)) + (a,)


def clamp01(x):
    return max(0.0, min(1.0, x))


def seg(t, a, b):
    return clamp01((t - a) / (b - a))


def ease_out(p):
    return 1 - (1 - p) ** 3


def ease_in_out(p):
    return 4 * p ** 3 if p < 0.5 else 1 - (-2 * p + 2) ** 3 / 2


def pose(t):
    """3.5 s: grey void → temple materialises at dawn → gate builds → iris
    closes on the logo with a cyan rim → hold. The gate keeps its own
    timeline g inside the larger one."""
    g = seg(t, 0.25, 0.75)
    ignite = ease_out(seg(g, 0.46, 0.62))
    settle = ease_in_out(seg(g, 0.64, 1.0))
    iris = ease_in_out(seg(t, 0.70, 0.90))
    dawn = ease_in_out(seg(t, 0.14, 0.50))
    return {
        'ring': ease_out(seg(t, 0.0, 0.16)),
        'ring_fade': 1 - seg(t, 0.11, 0.2),
        'grid': ease_out(seg(t, 0.03, 0.2)) * (1 - 0.85 * seg(t, 0.4, 0.7)),
        'wire_front': -0.95 + 1.95 * ease_in_out(seg(g, 0.12, 0.48)),
        'solid_front': -0.95 + 1.95 * ease_in_out(seg(g, 0.22, 0.56)),
        'wire_alpha': 1 - 0.8 * seg(g, 0.56, 0.8),
        'particles': seg(g, 0.08, 0.52),
        'particle_glow': 1 - seg(g, 0.46, 0.6),
        'glow': ignite * (1 - 0.6 * settle),
        'shafts': ignite * (1 - 0.7 * settle) * (1 - iris),
        'dolly': ease_in_out(seg(t, 0.0, 0.9)),
        'yaw': math.radians(-14 * (1 - ease_out(seg(t, 0.2, 0.75))) - 4 * (1 - iris)),
        'haze': 1.0,
        'dawn': dawn,
        'floor_r': 0.2 + 16 * ease_in_out(seg(t, 0.05, 0.32)),
        'portal_in': ease_out(seg(g, 0.08, 0.5)),
        'portal': ease_out(seg(g, 0.08, 0.42)) * (1 - 0.45 * seg(g, 0.62, 1.0)) * (1 - seg(t, 0.68, 0.78)),
        'pillars': ease_out(seg(t, 0.25, 0.45)) * (1 - 0.3 * seg(t, 0.6, 0.8)),
        'iris': iris,
        'rim': seg(t, 0.70, 0.75),
    }


# ---------------------------------------------------------------- materials

def new_tree(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    return m, nt, nt.nodes.new('ShaderNodeOutputMaterial')


def front_mask(nt, lead=0.0):
    """Returns (MapRange node giving 1 below the front, 0 above; Separate Y)."""
    coord = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(coord.outputs['Object'], sep.inputs['Vector'])
    mr = nt.nodes.new('ShaderNodeMapRange')
    mr.interpolation_type = 'SMOOTHSTEP'
    mr.inputs['To Min'].default_value = 1.0
    mr.inputs['To Max'].default_value = 0.0
    nt.links.new(sep.outputs['Y'], mr.inputs['Value'])
    return mr, sep


def leaf_material(name, base, rough, metal, coat):
    m, nt, out = new_tree(name)
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = rgba(base)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    bsdf.inputs['Coat Weight'].default_value = coat
    bsdf.inputs['Coat Roughness'].default_value = 0.06
    solid, sep = front_mask(nt)
    # Print band just under the front.
    band = nt.nodes.new('ShaderNodeMapRange')
    band.interpolation_type = 'SMOOTHSTEP'
    nt.links.new(sep.outputs['Y'], band.inputs['Value'])
    band_mul = nt.nodes.new('ShaderNodeMath')
    band_mul.operation = 'MULTIPLY'
    nt.links.new(band.outputs['Result'], band_mul.inputs[0])
    nt.links.new(solid.outputs['Result'], band_mul.inputs[1])
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = rgba(CYAN_HOT)
    em.inputs['Strength'].default_value = 40
    mix_band = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(band_mul.outputs[0], mix_band.inputs['Fac'])
    nt.links.new(bsdf.outputs[0], mix_band.inputs[1])
    nt.links.new(em.outputs[0], mix_band.inputs[2])
    transp = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(solid.outputs['Result'], mix.inputs['Fac'])
    nt.links.new(transp.outputs[0], mix.inputs[1])
    nt.links.new(mix_band.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    return m, solid, band


def wire_material(name):
    m, nt, out = new_tree(name)
    vis, _ = front_mask(nt)
    alpha = nt.nodes.new('ShaderNodeMath')
    alpha.operation = 'MULTIPLY'
    nt.links.new(vis.outputs['Result'], alpha.inputs[0])
    alpha.inputs[1].default_value = 1.0
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = rgba(CYAN_HOT)
    em.inputs['Strength'].default_value = 9
    transp = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(alpha.outputs[0], mix.inputs['Fac'])
    nt.links.new(transp.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    return m, vis, alpha


def emission(name, color, strength, transparent_fac=False):
    m, nt, out = new_tree(name)
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = rgba(color)
    em.inputs['Strength'].default_value = strength
    if not transparent_fac:
        nt.links.new(em.outputs[0], out.inputs['Surface'])
        return m, em, None
    transp = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(transp.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    return m, em, mix


MARBLE = '#ece3d3'        # warm Pentelic white
MARBLE_VEIN = '#b8aa94'


def marble_shader(nt, scale, vein_strength=1.0):
    """Procedural marble colour: distorted wave bands for veining over a warm
    white with soft cloudy variation. Returns the colour output socket."""
    coord = nt.nodes.new('ShaderNodeTexCoord')
    mapping = nt.nodes.new('ShaderNodeMapping')
    mapping.inputs['Scale'].default_value = (scale, scale, scale)
    nt.links.new(coord.outputs['Object'], mapping.inputs['Vector'])
    # Veins: thin lines where a detailed noise field crosses its midpoint.
    vn = nt.nodes.new('ShaderNodeTexNoise')
    vn.inputs['Scale'].default_value = 1.1
    vn.inputs['Detail'].default_value = 12.0
    vn.inputs['Roughness'].default_value = 0.62
    vn.inputs['Distortion'].default_value = 0.35
    nt.links.new(mapping.outputs['Vector'], vn.inputs['Vector'])
    centred = nt.nodes.new('ShaderNodeMath'); centred.operation = 'SUBTRACT'
    nt.links.new(vn.outputs['Fac'], centred.inputs[0]); centred.inputs[1].default_value = 0.5
    absn = nt.nodes.new('ShaderNodeMath'); absn.operation = 'ABSOLUTE'
    nt.links.new(centred.outputs[0], absn.inputs[0])
    vein = nt.nodes.new('ShaderNodeValToRGB')
    e = vein.color_ramp.elements
    e[0].position, e[0].color = 0.0, rgba(MARBLE_VEIN)
    e[1].position, e[1].color = 0.018, rgba(MARBLE)
    nt.links.new(absn.outputs[0], vein.inputs['Fac'])
    cloud = nt.nodes.new('ShaderNodeTexNoise')
    cloud.inputs['Scale'].default_value = 1.4
    cloud.inputs['Detail'].default_value = 4.0
    nt.links.new(mapping.outputs['Vector'], cloud.inputs['Vector'])
    tone = nt.nodes.new('ShaderNodeValToRGB')
    t = tone.color_ramp.elements
    t[0].position, t[0].color = 0.3, rgba('#e2d6c2')
    t[1].position, t[1].color = 0.7, rgba('#f4eee4')
    nt.links.new(cloud.outputs['Fac'], tone.inputs['Fac'])
    mix = nt.nodes.new('ShaderNodeMix')
    mix.data_type = 'RGBA'
    mix.blend_type = 'MULTIPLY'
    mix.inputs['Factor'].default_value = 1.0
    nt.links.new(tone.outputs['Color'], mix.inputs['A'])
    nt.links.new(vein.outputs['Color'], mix.inputs['B'])
    return mix.outputs['Result']


def marble_material(name, scale, rough):
    """Marble that prints in bottom to top: each object's custom property
    'reveal' (0..1 of its height) sets the front, with a cyan print band."""
    m, nt, out = new_tree(name)
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(marble_shader(nt, scale), bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Subsurface Weight'].default_value = 0.06
    bsdf.inputs['Subsurface Radius'].default_value = (0.05, 0.04, 0.03)
    coord = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(coord.outputs['Generated'], sep.inputs['Vector'])
    attr = nt.nodes.new('ShaderNodeAttribute')
    attr.attribute_type = 'OBJECT'
    attr.attribute_name = 'reveal'
    lo = nt.nodes.new('ShaderNodeMath'); lo.operation = 'SUBTRACT'
    nt.links.new(attr.outputs['Fac'], lo.inputs[0]); lo.inputs[1].default_value = 0.02
    solid = nt.nodes.new('ShaderNodeMapRange'); solid.interpolation_type = 'SMOOTHSTEP'
    solid.inputs['To Min'].default_value = 1.0; solid.inputs['To Max'].default_value = 0.0
    nt.links.new(sep.outputs['Y'], solid.inputs['Value'])
    nt.links.new(lo.outputs[0], solid.inputs['From Min'])
    nt.links.new(attr.outputs['Fac'], solid.inputs['From Max'])
    lo2 = nt.nodes.new('ShaderNodeMath'); lo2.operation = 'SUBTRACT'
    nt.links.new(attr.outputs['Fac'], lo2.inputs[0]); lo2.inputs[1].default_value = 0.07
    band = nt.nodes.new('ShaderNodeMapRange'); band.interpolation_type = 'SMOOTHSTEP'
    nt.links.new(sep.outputs['Y'], band.inputs['Value'])
    nt.links.new(lo2.outputs[0], band.inputs['From Min'])
    nt.links.new(attr.outputs['Fac'], band.inputs['From Max'])
    done = nt.nodes.new('ShaderNodeMath'); done.operation = 'LESS_THAN'
    nt.links.new(attr.outputs['Fac'], done.inputs[0]); done.inputs[1].default_value = 0.999
    bm = nt.nodes.new('ShaderNodeMath'); bm.operation = 'MULTIPLY'
    nt.links.new(band.outputs['Result'], bm.inputs[0]); nt.links.new(solid.outputs['Result'], bm.inputs[1])
    bm2 = nt.nodes.new('ShaderNodeMath'); bm2.operation = 'MULTIPLY'
    nt.links.new(bm.outputs[0], bm2.inputs[0]); nt.links.new(done.outputs[0], bm2.inputs[1])
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = rgba(CYAN_HOT)
    em.inputs['Strength'].default_value = 24
    mixb = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(bm2.outputs[0], mixb.inputs['Fac'])
    nt.links.new(bsdf.outputs[0], mixb.inputs[1]); nt.links.new(em.outputs[0], mixb.inputs[2])
    transp = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(solid.outputs['Result'], mix.inputs['Fac'])
    nt.links.new(transp.outputs[0], mix.inputs[1]); nt.links.new(mixb.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    return m


def floor_material():
    """Polished marble slabs with fine seams. The holographic grid glows in the
    seams; the scan ring sweeps out from the centre."""
    m, nt, out = new_tree('floor')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    coord = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(coord.outputs['Object'], sep.inputs['Vector'])

    def math(op, a, b=None):
        n = nt.nodes.new('ShaderNodeMath')
        n.operation = op
        for i, v in enumerate((a, b)):
            if v is None:
                continue
            if isinstance(v, (int, float)):
                n.inputs[i].default_value = v
            else:
                nt.links.new(v, n.inputs[i])
        return n.outputs[0]

    brick = nt.nodes.new('ShaderNodeTexBrick')
    brick.offset = 0.0
    brick.squash = 1.0
    brick.inputs['Scale'].default_value = 1 / 1.25
    brick.inputs['Mortar Size'].default_value = 0.006
    brick.inputs['Mortar Smooth'].default_value = 0.2
    brick.inputs['Brick Width'].default_value = 1.0
    brick.inputs['Row Height'].default_value = 1.0
    brick.inputs['Bias'].default_value = 0.0
    brick.inputs['Color1'].default_value = rgba('#fbf6ee')
    brick.inputs['Color2'].default_value = rgba('#e9dfcf')
    brick.inputs['Mortar'].default_value = rgba('#6b6256')
    nt.links.new(coord.outputs['Object'], brick.inputs['Vector'])
    tint = nt.nodes.new('ShaderNodeMix')
    tint.data_type = 'RGBA'
    tint.blend_type = 'MULTIPLY'
    tint.inputs['Factor'].default_value = 1.0
    nt.links.new(marble_shader(nt, 0.55), tint.inputs['A'])
    nt.links.new(brick.outputs['Color'], tint.inputs['B'])
    nt.links.new(tint.outputs['Result'], bsdf.inputs['Base Color'])
    # Polished, with slight variation; seams are matte.
    rn = nt.nodes.new('ShaderNodeTexNoise')
    rn.inputs['Scale'].default_value = 2.5
    rr = nt.nodes.new('ShaderNodeMapRange')
    rr.inputs['To Min'].default_value = 0.1
    rr.inputs['To Max'].default_value = 0.24
    nt.links.new(rn.outputs['Fac'], rr.inputs['Value'])
    rough = math('MAXIMUM', rr.outputs['Result'], math('MULTIPLY', brick.outputs['Fac'], 0.8))
    nt.links.new(rough, bsdf.inputs['Roughness'])

    dist = math('SQRT', math('ADD', math('POWER', sep.outputs['X'], 2.0), math('POWER', sep.outputs['Y'], 2.0)))
    fade = math('SUBTRACT', 1.0, math('MINIMUM', 1.0, math('DIVIDE', dist, 9.0)))
    grid_amt = nt.nodes.new('ShaderNodeValue')
    grid_amt.outputs[0].default_value = 0.0
    grid_e = math('MULTIPLY', math('MULTIPLY', brick.outputs['Fac'], math('POWER', fade, 1.5)), grid_amt.outputs[0])
    ring_r = nt.nodes.new('ShaderNodeValue')
    ring_r.outputs[0].default_value = 0.0
    ring_amt = nt.nodes.new('ShaderNodeValue')
    ring_amt.outputs[0].default_value = 0.0
    ring = math('LESS_THAN', math('ABSOLUTE', math('SUBTRACT', dist, ring_r.outputs[0])), 0.05)
    ring_e = math('MULTIPLY', math('MULTIPLY', ring, ring_amt.outputs[0]), 14.0)
    total = math('ADD', math('MULTIPLY', grid_e, 1.4), ring_e)
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = rgba(CYAN_HOT)
    nt.links.new(total, em.inputs['Strength'])
    add = nt.nodes.new('ShaderNodeAddShader')
    nt.links.new(bsdf.outputs[0], add.inputs[0])
    nt.links.new(em.outputs[0], add.inputs[1])
    floor_r = nt.nodes.new('ShaderNodeValue')
    floor_r.outputs[0].default_value = 30.0
    inside = math('LESS_THAN', dist, floor_r.outputs[0])
    edge = math('MULTIPLY', math('LESS_THAN', math('ABSOLUTE', math('SUBTRACT', dist, floor_r.outputs[0])), 0.06), 1.0)
    edge_em = nt.nodes.new('ShaderNodeEmission')
    edge_em.inputs['Color'].default_value = rgba(CYAN_HOT)
    nt.links.new(math('MULTIPLY', edge, 18.0), edge_em.inputs['Strength'])
    with_edge = nt.nodes.new('ShaderNodeAddShader')
    nt.links.new(add.outputs[0], with_edge.inputs[0]); nt.links.new(edge_em.outputs[0], with_edge.inputs[1])
    transp = nt.nodes.new('ShaderNodeBsdfTransparent')
    vis = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(math('MAXIMUM', inside, edge), vis.inputs['Fac'])
    nt.links.new(transp.outputs[0], vis.inputs[1]); nt.links.new(with_edge.outputs[0], vis.inputs[2])
    nt.links.new(vis.outputs[0], out.inputs['Surface'])
    m['floor_r'] = 0  # marker
    floor_material.floor_r = floor_r
    return m, grid_amt, ring_r, ring_amt


# ---------------------------------------------------------------- geometry

def prism(name, pts, depth, mat, bevel=0.03):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    verts = [bm.verts.new(((x - CENTER[0]) * UNIT, -(y - CENTER[1]) * UNIT, depth / 2)) for x, y in pts]
    face = bm.faces.new(verts)
    if face.normal.z < 0:
        face.normal_flip()
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    moved = [g for g in ext['geom'] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=Vector((0, 0, -depth)), verts=moved)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    if bevel:
        mod = obj.modifiers.new('bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
        mod.limit_method = 'ANGLE'
        mod.harden_normals = True
    obj.data.materials.append(mat)
    return obj


def wire_copy(src, mat):
    obj = bpy.data.objects.new(src.name + '_wire', src.data.copy())
    bpy.context.collection.objects.link(obj)
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    mod = obj.modifiers.new('wire', 'WIREFRAME')
    mod.thickness = 0.012
    mod.offset = 1.0
    mod.use_even_offset = True
    return obj


def sample_polygon(pts, n, rng):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]

    def inside(x, y):
        c = False
        j = len(pts) - 1
        for i in range(len(pts)):
            xi, yi = pts[i]
            xj, yj = pts[j]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
                c = not c
            j = i
        return c
    out = []
    while len(out) < n:
        x, y = rng.uniform(min(xs), max(xs)), rng.uniform(min(ys), max(ys))
        if inside(x, y):
            out.append(((x - CENTER[0]) * UNIT, -(y - CENTER[1]) * UNIT, DEPTH / 2 + 0.004))
    return out


def particles(mat, n=520, seed=7):
    rng = random.Random(seed)
    targets = sample_polygon(LEFT, n // 2, rng) + sample_polygon(RIGHT, n - n // 2, rng)
    starts, delays = [], []
    for x, y, z in targets:
        d = Vector((rng.gauss(0, 1), rng.gauss(0, 1), rng.gauss(0, 1) * 0.6 + 0.6)).normalized()
        starts.append(Vector((x, y, z)) + d * rng.uniform(0.7, 2.1))
        # Bottom first, matching the print direction, with jitter.
        delays.append(clamp01((y + 0.9) / 1.8) * 0.4 + rng.uniform(0, 0.14))
    mesh = bpy.data.meshes.new('particles')
    mesh.vertices.add(n)
    obj = bpy.data.objects.new('particles', mesh)
    bpy.context.collection.objects.link(obj)
    ng = bpy.data.node_groups.new('pts', 'GeometryNodeTree')
    ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
    ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    gin = ng.nodes.new('NodeGroupInput')
    gout = ng.nodes.new('NodeGroupOutput')
    m2p = ng.nodes.new('GeometryNodeMeshToPoints')
    m2p.inputs['Radius'].default_value = 0.0055
    setm = ng.nodes.new('GeometryNodeSetMaterial')
    setm.inputs['Material'].default_value = mat
    ng.links.new(gin.outputs[0], m2p.inputs['Mesh'])
    ng.links.new(m2p.outputs[0], setm.inputs['Geometry'])
    ng.links.new(setm.outputs[0], gout.inputs[0])
    mod = obj.modifiers.new('pts', 'NODES')
    mod.node_group = ng
    return obj, [Vector(t) for t in targets], starts, delays



# ---------------------------------------------------------------- environment

def _nodes(nt):
    def math(op, a, b=None):
        n = nt.nodes.new('ShaderNodeMath')
        n.operation = op
        for i, v in enumerate((a, b)):
            if v is None:
                continue
            if isinstance(v, (int, float)):
                n.inputs[i].default_value = v
            else:
                nt.links.new(v, n.inputs[i])
        return n.outputs[0]
    return math


def sky(sc):
    """Far backdrop: near-black zenith, slate, and a thin cyan horizon glow."""
    m, nt, out = new_tree('sky')
    coord = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(coord.outputs['Object'], sep.inputs['Vector'])
    mr = nt.nodes.new('ShaderNodeMapRange')
    mr.inputs['From Min'].default_value = FLOOR_Y - 0.6
    mr.inputs['From Max'].default_value = 9.0
    nt.links.new(sep.outputs['Y'], mr.inputs['Value'])
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    els = ramp.color_ramp.elements
    els[0].position, els[0].color = 0.0, rgba('#ffd59a')
    els[1].position, els[1].color = 1.0, rgba('#0a1430')
    for pos, col in ((0.03, '#f6a35f'), (0.08, '#c9746c'), (0.17, '#7a5f86'), (0.33, '#3a4a7c'), (0.62, '#16244b')):
        e = els.new(pos)
        e.color = rgba(col)
    nt.links.new(mr.outputs['Result'], ramp.inputs['Fac'])
    grey = nt.nodes.new('ShaderNodeValToRGB')
    ge = grey.color_ramp.elements
    ge[0].position, ge[0].color = 0.0, rgba('#8d949c')
    ge[1].position, ge[1].color = 1.0, rgba('#2c323b')
    ge.new(0.15).color = rgba('#727981')
    ge.new(0.45).color = rgba('#4c525a')
    nt.links.new(mr.outputs['Result'], grey.inputs['Fac'])
    dawn = nt.nodes.new('ShaderNodeValue')
    dawn.outputs[0].default_value = 1.0
    sky.dawn = dawn
    blend = nt.nodes.new('ShaderNodeMix'); blend.data_type = 'RGBA'
    nt.links.new(dawn.outputs[0], blend.inputs['Factor'])
    nt.links.new(grey.outputs['Color'], blend.inputs['A'])
    nt.links.new(ramp.outputs['Color'], blend.inputs['B'])
    # Sun glow: radial falloff around a point just above the horizon.
    sun_xy = (-2.6, FLOOR_Y + 1.0)
    dx = nt.nodes.new('ShaderNodeMath'); dx.operation = 'SUBTRACT'
    nt.links.new(sep.outputs['X'], dx.inputs[0]); dx.inputs[1].default_value = sun_xy[0]
    dy = nt.nodes.new('ShaderNodeMath'); dy.operation = 'SUBTRACT'
    nt.links.new(sep.outputs['Y'], dy.inputs[0]); dy.inputs[1].default_value = sun_xy[1]
    comb = nt.nodes.new('ShaderNodeCombineXYZ')
    nt.links.new(dx.outputs[0], comb.inputs['X']); nt.links.new(dy.outputs[0], comb.inputs['Y'])
    vlen = nt.nodes.new('ShaderNodeVectorMath'); vlen.operation = 'LENGTH'
    nt.links.new(comb.outputs[0], vlen.inputs[0])
    disc = nt.nodes.new('ShaderNodeMapRange'); disc.interpolation_type = 'SMOOTHSTEP'
    disc.inputs['From Min'].default_value = 0.30; disc.inputs['From Max'].default_value = 0.36
    disc.inputs['To Min'].default_value = 1.0; disc.inputs['To Max'].default_value = 0.0
    nt.links.new(vlen.outputs['Value'], disc.inputs['Value'])
    halo = nt.nodes.new('ShaderNodeMapRange'); halo.interpolation_type = 'SMOOTHERSTEP'
    halo.inputs['From Min'].default_value = 0.0; halo.inputs['From Max'].default_value = 4.0
    halo.inputs['To Min'].default_value = 1.0; halo.inputs['To Max'].default_value = 0.0
    nt.links.new(vlen.outputs['Value'], halo.inputs['Value'])
    sunamt = nt.nodes.new('ShaderNodeMath'); sunamt.operation = 'ADD'
    d6 = nt.nodes.new('ShaderNodeMath'); d6.operation = 'MULTIPLY'
    nt.links.new(disc.outputs['Result'], d6.inputs[0]); d6.inputs[1].default_value = 3.2
    h2 = nt.nodes.new('ShaderNodeMath'); h2.operation = 'POWER'
    nt.links.new(halo.outputs['Result'], h2.inputs[0]); h2.inputs[1].default_value = 2.2
    h3 = nt.nodes.new('ShaderNodeMath'); h3.operation = 'MULTIPLY'
    nt.links.new(h2.outputs[0], h3.inputs[0]); h3.inputs[1].default_value = 0.55
    nt.links.new(d6.outputs[0], sunamt.inputs[0]); nt.links.new(h3.outputs[0], sunamt.inputs[1])
    sun_col = nt.nodes.new('ShaderNodeMix'); sun_col.data_type = 'RGBA'; sun_col.blend_type = 'ADD'
    sun_col.inputs['Factor'].default_value = 1.0
    nt.links.new(blend.outputs['Result'], sun_col.inputs['A'])
    sun_col.inputs['Factor'].default_value = 1.0
    nt.links.new(dawn.outputs[0], sun_col.inputs['Factor'])
    tint = nt.nodes.new('ShaderNodeMix'); tint.data_type = 'RGBA'; tint.blend_type = 'MULTIPLY'
    tint.inputs['Factor'].default_value = 1.0
    tint.inputs['A'].default_value = rgba('#ffc27a')
    clampv = nt.nodes.new('ShaderNodeCombineColor')
    nt.links.new(sunamt.outputs[0], clampv.inputs[0]); nt.links.new(sunamt.outputs[0], clampv.inputs[1]); nt.links.new(sunamt.outputs[0], clampv.inputs[2])
    nt.links.new(clampv.outputs[0], tint.inputs['B'])
    nt.links.new(tint.outputs['Result'], sun_col.inputs['B'])
    em = nt.nodes.new('ShaderNodeEmission')
    nt.links.new(sun_col.outputs['Result'], em.inputs['Color'])
    em.inputs['Strength'].default_value = 1.0
    nt.links.new(em.outputs[0], out.inputs['Surface'])
    bpy.ops.mesh.primitive_plane_add(size=80, location=(0, 0, -18))
    plane = bpy.context.active_object
    plane.data.materials.append(m)
    plane.visible_shadow = False
    return plane


def ring_material(name, kind, count, duty, strength):
    """Emissive ring: 'arcs' gives `count` long arcs, 'ticks' gives tick marks."""
    m, nt, out = new_tree(name)
    math = _nodes(nt)
    coord = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(coord.outputs['Object'], sep.inputs['Vector'])
    ang = math('ARCTAN2', sep.outputs['Y'], sep.outputs['X'])
    turns = math('ADD', math('DIVIDE', ang, 2 * 3.14159265), 0.5)
    mask = math('LESS_THAN', math('FRACT', math('MULTIPLY', turns, float(count))), duty)
    power = nt.nodes.new('ShaderNodeValue')
    power.outputs[0].default_value = 0.0
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = rgba(CYAN_HOT)
    nt.links.new(math('MULTIPLY', math('MULTIPLY', mask, power.outputs[0]), strength), em.inputs['Strength'])
    transp = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(mask, mix.inputs['Fac'])
    nt.links.new(transp.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs['Surface'])
    return m, power


def portal():
    """Concentric rings behind the gate: arcs and a tick ring, turning slowly."""
    specs = [  # radius, minor, kind, count, duty, strength, spin direction
        (1.55, 0.008, 'arcs', 3, 0.72, 2.4, 1),
        (1.74, 0.005, 'ticks', 120, 0.25, 1.6, -1),
        (2.05, 0.006, 'arcs', 2, 0.46, 1.1, 1),
    ]
    rings, powers = [], []
    for i, (r, minor, kind, count, duty, strength, spin) in enumerate(specs):
        bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=minor, major_segments=192,
                                         minor_segments=8, location=(0, 0, -3.2 - 0.3 * i))
        ring = bpy.context.active_object
        mat, power = ring_material(f'ring{i}', kind, count, duty, strength)
        ring.data.materials.append(mat)
        ring.visible_shadow = False
        rings.append((ring, spin))
        powers.append(power)
    return rings, powers


def fluted_column(name, mat, radius, height, flutes=20, segs=8):
    """Doric shaft: 20 shallow flutes and a slight entasis (taper)."""
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bm = bmesh.new()
    n = flutes * segs
    rings = []
    levels = 10
    for j in range(levels + 1):
        v = j / levels
        taper = 1.0 - 0.17 * v + 0.05 * math.sin(math.pi * v)   # entasis
        ring = []
        for i in range(n):
            a = 2 * math.pi * i / n
            flute = abs(math.sin(math.pi * (i % segs) / segs))
            r = radius * taper * (1.0 - 0.07 * flute)
            ring.append(bm.verts.new((r * math.cos(a), v * height, r * math.sin(a))))
        rings.append(ring)
    for j in range(levels):
        for i in range(n):
            bm.faces.new((rings[j][i], rings[j][(i + 1) % n], rings[j + 1][(i + 1) % n], rings[j + 1][i]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    for poly in mesh.polygons:
        poly.use_smooth = True
    obj.data.materials.append(mat)
    return obj


def pillars():
    """A Doric colonnade on each side of the hall: fluted marble columns on a
    stepped stylobate carrying a continuous architrave, open to the sky. A thin
    cyan band at each column's neck is the only technology."""
    marble = marble_material('marble', 0.8, 0.36)
    stone = marble_material('stone', 0.5, 0.42)
    m, nt, out = new_tree('neck_light')
    power = nt.nodes.new('ShaderNodeValue')
    power.outputs[0].default_value = 0.0
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = rgba(CYAN_HOT)
    mul = nt.nodes.new('ShaderNodeMath')
    mul.operation = 'MULTIPLY'
    nt.links.new(power.outputs[0], mul.inputs[0])
    mul.inputs[1].default_value = 4.0
    nt.links.new(mul.outputs[0], em.inputs['Strength'])
    transp = nt.nodes.new('ShaderNodeBsdfTransparent')
    vis = nt.nodes.new('ShaderNodeMixShader')
    clampp = nt.nodes.new('ShaderNodeMath'); clampp.operation = 'MINIMUM'
    m4 = nt.nodes.new('ShaderNodeMath'); m4.operation = 'MULTIPLY'
    nt.links.new(power.outputs[0], m4.inputs[0]); m4.inputs[1].default_value = 6.0
    nt.links.new(m4.outputs[0], clampp.inputs[0]); clampp.inputs[1].default_value = 1.0
    nt.links.new(clampp.outputs[0], vis.inputs['Fac'])
    nt.links.new(transp.outputs[0], vis.inputs[1]); nt.links.new(em.outputs[0], vis.inputs[2])
    nt.links.new(vis.outputs[0], out.inputs['Surface'])

    def block(loc, dims, mat, bevel=0.0):
        bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
        o = bpy.context.active_object
        o.scale = dims
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        if bevel:
            mod = o.modifiers.new('bevel', 'BEVEL')
            mod.width = bevel
            mod.segments = 2
        o.data.materials.append(mat)
        return o

    objs = []
    half, radius, shaft_h, count, step = 2.75, 0.3, 4.4, 7, 2.0
    z0, length = -2.4, step * 7
    zc = z0 - (count - 1) * step / 2
    for side in (-1, 1):
        x = side * half
        # Stepped stylobate.
        for o in (block((x, FLOOR_Y + 0.08, zc), (1.5, 0.16, length + 1.2), stone, 0.01),
                  block((x, FLOOR_Y + 0.24, zc), (1.15, 0.16, length + 0.8), stone, 0.01)):
            o['kind'] = 'stylobate'
            objs.append(o)
        base_y = FLOOR_Y + 0.32
        for k in range(count):
            z = z0 - step * k
            col = fluted_column(f'col{side}{k}', marble, radius, shaft_h)
            col.location = (x, base_y, z)
            col['kind'], col['k'] = 'column', k
            objs.append(col)
            cap_y = base_y + shaft_h
            # Necking band of light, echinus and abacus.
            bpy.ops.mesh.primitive_torus_add(major_radius=radius * 0.84, minor_radius=0.012,
                                             major_segments=64, minor_segments=6, location=(x, cap_y - 0.12, z),
                                             rotation=(math.radians(90), 0, 0))
            ring = bpy.context.active_object
            ring.data.materials.append(m)
            ring.visible_shadow = False
            objs.append(ring)
            bpy.ops.mesh.primitive_cone_add(vertices=48, radius1=radius * 0.86, radius2=radius * 1.32,
                                            depth=0.2, location=(x, cap_y + 0.1, z), rotation=(math.radians(-90), 0, 0))
            ech = bpy.context.active_object
            ech.data.materials.append(marble)
            ech['kind'], ech['k'] = 'cap', k
            objs.append(ech)
            abacus = block((x, cap_y + 0.27, z), (0.86, 0.14, 0.86), marble, 0.008)
            abacus['kind'], abacus['k'] = 'cap', k
            objs.append(abacus)
        top = base_y + shaft_h + 0.34
        # Architrave, frieze band and cornice running along the colonnade.
        for o in (block((x, top + 0.24, zc), (0.84, 0.48, length + 0.86), stone, 0.01),
                  block((x, top + 0.64, zc), (0.84, 0.32, length + 0.86), marble, 0.01),
                  block((x, top + 0.86, zc), (1.04, 0.12, length + 1.06), stone, 0.01)):
            o['kind'] = 'entablature'
            objs.append(o)
    return objs, power


def ground_haze():
    """Volume that hugs the floor and thins with height."""
    m, nt, out = new_tree('haze')
    coord = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(coord.outputs['Object'], sep.inputs['Vector'])
    fall = nt.nodes.new('ShaderNodeMapRange')
    fall.interpolation_type = 'SMOOTHSTEP'
    fall.inputs['From Min'].default_value = -1.0
    fall.inputs['From Max'].default_value = 1.0
    fall.inputs['To Min'].default_value = 1.0
    fall.inputs['To Max'].default_value = 0.0
    nt.links.new(sep.outputs['Y'], fall.inputs['Value'])
    amount = nt.nodes.new('ShaderNodeValue')
    amount.outputs[0].default_value = 0.0
    mul = nt.nodes.new('ShaderNodeMath')
    mul.operation = 'MULTIPLY'
    # Fade toward the camera-facing end of the box so the haze has no hard edge.
    front = nt.nodes.new('ShaderNodeMapRange')
    front.interpolation_type = 'SMOOTHSTEP'
    front.inputs['From Min'].default_value = 0.15
    front.inputs['From Max'].default_value = 1.0
    front.inputs['To Min'].default_value = 1.0
    front.inputs['To Max'].default_value = 0.0
    nt.links.new(sep.outputs['Z'], front.inputs['Value'])
    both = nt.nodes.new('ShaderNodeMath')
    both.operation = 'MULTIPLY'
    nt.links.new(fall.outputs['Result'], both.inputs[0])
    nt.links.new(front.outputs['Result'], both.inputs[1])
    nt.links.new(both.outputs[0], mul.inputs[0])
    nt.links.new(amount.outputs[0], mul.inputs[1])
    vol = nt.nodes.new('ShaderNodeVolumePrincipled')
    vol.inputs['Color'].default_value = (0.95, 0.8, 0.66, 1)
    vol.inputs['Anisotropy'].default_value = 0.62
    nt.links.new(mul.outputs[0], vol.inputs['Density'])
    nt.links.new(vol.outputs[0], out.inputs['Volume'])
    ground_haze.vol = vol
    bpy.ops.mesh.primitive_cube_add(size=2, location=(0, FLOOR_Y + 1.65, -7.0))
    box = bpy.context.active_object
    box.scale = (7, 2.15, 6.4)
    box.data.materials.append(m)
    box.visible_shadow = False
    return amount


# ---------------------------------------------------------------- scene

def build(res, samples):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 6
    sc.cycles.transparent_max_bounces = 16
    sc.cycles.volume_step_rate = 4.0
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    # AgX rolls sunlit marble highlights off like film instead of clipping.
    sc.view_settings.view_transform = 'AgX'
    for look in ('AgX - Punchy', 'Punchy'):
        try:
            sc.view_settings.look = look
            break
        except TypeError:
            pass
    sc.view_settings.exposure = 0.35
    sc.render.compositor_device = 'CPU'
    sc.render.image_settings.file_format = 'PNG'

    world = bpy.data.worlds.new('World')
    sc.world = world
    wnt = world.node_tree
    wnt.nodes['Background'].inputs['Color'].default_value = rgba('#232a4d')
    wnt.nodes['Background'].inputs['Strength'].default_value = 0.5
    sky(sc)
    sky_dawn = sky.dawn
    rings, ring_powers = portal()
    pillar_objs, pillar_power = pillars()
    vol = ground_haze()

    rig = bpy.data.objects.new('rig', None)
    bpy.context.collection.objects.link(rig)

    lmat, lsolid, lband = leaf_material('ceramic', OFFWHITE, 0.34, 0.0, 0.4)
    rmat, rsolid, rband = leaf_material('cyan', CYAN, 0.28, 0.55, 1.0)
    left = prism('left', LEFT, DEPTH, lmat)
    right = prism('right', RIGHT, DEPTH, rmat)
    wmat, wvis, walpha = wire_material('wire')
    lw = wire_copy(left, wmat)
    rw = wire_copy(right, wmat)
    for o in (left, right, lw, rw):
        o.parent = rig

    cmat, cem, cmix = emission('cross', CYAN_HOT, 0.0, transparent_fac=True)
    cross = prism('cross_light', CROSS, 0.01, cmat, bevel=0)
    cross.location.z = -0.40
    cross.scale = (1.04, 1.04, 1)
    cross.parent = rig

    pmat, pem, _ = emission('particle', CYAN_HOT, 30.0)
    pobj, ptargets, pstarts, pdelays = particles(pmat)
    pobj.parent = rig

    fmat, grid_amt, ring_r, ring_amt = floor_material()
    floor_r = floor_material.floor_r
    bpy.ops.mesh.primitive_plane_add(size=30, location=(0, FLOOR_Y, -2))
    floor = bpy.context.active_object
    floor.rotation_euler = (math.radians(-90), 0, 0)
    floor.data.materials.append(fmat)

    # Spot behind the mark pointing at the camera: shafts through the cross.
    bpy.ops.object.light_add(type='SPOT', location=(0, 0, -2.2))
    shaft = bpy.context.active_object
    shaft.data.spot_size = math.radians(24)
    shaft.data.spot_blend = 0.6
    shaft.data.shadow_soft_size = 0.02
    shaft.data.color = rgba(CYAN_HOT)[:3]
    shaft.rotation_euler = (0, math.radians(180), 0)
    shaft.parent = rig

    bpy.ops.object.light_add(type='SUN', location=(0, 6, -6))
    sun = bpy.context.active_object
    sun.data.energy = 2.8
    sun.data.angle = math.radians(1.0)
    sun.data.color = (1.0, 0.7, 0.4)
    travel = Vector((0.16, -0.2, 0.97)).normalized()   # low golden sun, back-left, toward the camera
    sun.rotation_euler = travel.to_track_quat('-Z', 'Y').to_euler()
    bpy.ops.object.light_add(type='AREA', location=(-3.0, 3.0, 3.4))
    key = bpy.context.active_object
    key.data.size = 2.4
    key.data.energy = 300
    key.data.color = (1.0, 0.86, 0.72)
    # Aimed at the gate with a narrow spread so it never floods the architraves.
    key.rotation_euler = (Vector((0, 0, 0)) - key.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.ops.object.light_add(type='AREA', location=(1.5, 0.9, -1.5))
    rim = bpy.context.active_object
    rim.data.size = 0.9
    rim.data.color = rgba(CYAN)[:3]
    rim.data.energy = 110
    rim.rotation_euler = (Vector((0, 0, 0)) - rim.location).to_track_quat('-Z', 'Y').to_euler()

    for ob in bpy.data.objects:
        if ob.type == 'LIGHT':
            ob.visible_camera = False
            if ob.data.type == 'AREA':
                ob.visible_glossy = False
    cam_data = bpy.data.cameras.new('cam')
    cam_data.lens = 46
    cam_data.dof.use_dof = True
    cam_data.dof.aperture_fstop = 2.0
    cam = bpy.data.objects.new('cam', cam_data)
    bpy.context.collection.objects.link(cam)
    sc.camera = cam

    # Compositor: bloom, horizontal anamorphic streak, slight dispersion.
    ng = bpy.data.node_groups.new('comp', 'CompositorNodeTree')
    ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    rl = ng.nodes.new('CompositorNodeRLayers')
    out = ng.nodes.new('NodeGroupOutput')
    bloom = ng.nodes.new('CompositorNodeGlare')
    bloom.inputs['Type'].default_value = 'Bloom'
    bloom.inputs['Quality'].default_value = 'High'
    bloom.inputs['Threshold'].default_value = 2.4
    bloom.inputs['Strength'].default_value = 1.0
    bloom.inputs['Size'].default_value = 0.7
    streak = ng.nodes.new('CompositorNodeGlare')
    streak.inputs['Type'].default_value = 'Streaks'
    streak.inputs['Quality'].default_value = 'High'
    streak.inputs['Threshold'].default_value = 8.0
    streak.inputs['Streaks'].default_value = 2
    streak.inputs['Streaks Angle'].default_value = 0.0
    streak.inputs['Fade'].default_value = 0.93
    streak.inputs['Strength'].default_value = 0.4
    lens = ng.nodes.new('CompositorNodeLensdist')
    try:
        lens.inputs['Dispersion'].default_value = 0.012
    except (KeyError, AttributeError):
        pass
    ng.links.new(rl.outputs['Image'], bloom.inputs['Image'])
    ng.links.new(bloom.outputs['Image'], streak.inputs['Image'])
    ng.links.new(streak.outputs['Image'], lens.inputs['Image'])
    # Iris: a circle closes on the logo; outside becomes slate, a cyan rim rides the edge.
    def ellipse():
        e = ng.nodes.new('CompositorNodeEllipseMask')
        e.inputs['Mask'].default_value = 0.0
        e.inputs['Value'].default_value = 1.0
        return e
    inner, outer = ellipse(), ellipse()
    def blur(src, px):
        b = ng.nodes.new('CompositorNodeBlur')
        b.inputs['Size'].default_value = (px, px)
        ng.links.new(src, b.inputs['Image'])
        return b.outputs['Image']
    inner_soft = blur(inner.outputs['Mask'], 2)
    sub = ng.nodes.new('ShaderNodeMath'); sub.operation = 'SUBTRACT'
    ng.links.new(outer.outputs['Mask'], sub.inputs[0]); ng.links.new(inner.outputs['Mask'], sub.inputs[1])
    rim_sharp = blur(sub.outputs[0], 2)
    rim_glow = blur(sub.outputs[0], 26)
    iris_mix = ng.nodes.new('ShaderNodeMix'); iris_mix.data_type = 'RGBA'
    # Scene-linear value calibrated so the AgX output is the icon's slate #1e293b.
    lin = os.environ.get('SLATE_LIN')
    iris_mix.inputs['A'].default_value = tuple(float(v) for v in lin.split(',')) + (1.0,) if lin else SLATE_OUT_LINEAR
    ng.links.new(inner_soft, iris_mix.inputs['Factor'])
    ng.links.new(lens.outputs['Image'], iris_mix.inputs['B'])
    def tinted(src, strength):
        m = ng.nodes.new('ShaderNodeMix'); m.data_type = 'RGBA'; m.blend_type = 'MULTIPLY'
        m.inputs['Factor'].default_value = 1.0
        c = rgba(CYAN_HOT)
        m.inputs['A'].default_value = (c[0] * strength, c[1] * strength, c[2] * strength, 1)
        ng.links.new(src, m.inputs['B'])
        return m
    rim_a, rim_b = tinted(rim_sharp, 1.0), tinted(rim_glow, 0.6)
    add1 = ng.nodes.new('ShaderNodeMix'); add1.data_type = 'RGBA'; add1.blend_type = 'ADD'
    ng.links.new(iris_mix.outputs['Result'], add1.inputs['A']); ng.links.new(rim_a.outputs['Result'], add1.inputs['B'])
    add2 = ng.nodes.new('ShaderNodeMix'); add2.data_type = 'RGBA'; add2.blend_type = 'ADD'
    ng.links.new(add1.outputs['Result'], add2.inputs['A']); ng.links.new(rim_b.outputs['Result'], add2.inputs['B'])
    ng.links.new(add2.outputs['Result'], out.inputs['Image'])
    iris_nodes = dict(inner=inner, outer=outer, add1=add1, add2=add2)
    sc.compositing_node_group = ng

    return dict(key=key, iris=iris_nodes, temple=pillar_objs, floor_r=floor_r, sky_dawn=sky_dawn, sun=sun,
                bg=wnt.nodes['Background'], haze_vol=ground_haze.vol, res=res, rings=rings, ring_powers=ring_powers, pillar_power=pillar_power, sc=sc, rig=rig, cam=cam, vol=vol, lsolid=lsolid, rsolid=rsolid, lband=lband, rband=rband,
                wvis=wvis, walpha=walpha, cem=cem, cmix=cmix, pobj=pobj, ptargets=ptargets, pstarts=pstarts,
                pdelays=pdelays, pem=pem, grid_amt=grid_amt, ring_r=ring_r, ring_amt=ring_amt, shaft=shaft)


def set_front(node, front, width):
    node.inputs['From Min'].default_value = front - width
    node.inputs['From Max'].default_value = front


def apply(s, t):
    p = pose(t)
    for n in (s['lsolid'], s['rsolid']):
        set_front(n, p['solid_front'], 0.015)
    for n in (s['lband'], s['rband']):
        # band: 0 at front-0.09, 1 at the front
        n.inputs['From Min'].default_value = p['solid_front'] - 0.09
        n.inputs['From Max'].default_value = p['solid_front']
    set_front(s['wvis'], p['wire_front'], 0.02)
    s['walpha'].inputs[1].default_value = p['wire_alpha']
    s['cem'].inputs['Strength'].default_value = 16 * p['glow']
    s['cmix'].inputs['Fac'].default_value = min(1.0, p['glow'] * 4)
    s['shaft'].data.energy = 700 * p['shafts']
    for (ring, spin), power in zip(s['rings'], s['ring_powers']):
        ring.rotation_euler = (0, 0, spin * (0.35 * t + 0.9 * (1 - p['portal_in'])))
        ring.scale = (0.86 + 0.14 * p['portal_in'],) * 3
        power.outputs[0].default_value = p['portal']
    s['pillar_power'].outputs[0].default_value = p['pillars']
    s['grid_amt'].outputs[0].default_value = p['grid']
    s['ring_r'].outputs[0].default_value = 0.2 + 5.5 * p['ring']
    s['ring_amt'].outputs[0].default_value = p['ring_fade']
    s['pem'].inputs['Strength'].default_value = 18 * p['particle_glow']
    # Particles: each flies from its start to its target on its own schedule;
    # once landed it sinks just under the surface and is hidden by the solid.
    coords = []
    for tgt, st, d in zip(s['ptargets'], s['pstarts'], s['pdelays']):
        q = ease_in_out(seg(p['particles'], d, d + 0.38))
        pos = st.lerp(tgt, q)
        if p['particles'] < d or q >= 1.0:
            pos = Vector((0, 0, -40))            # not launched, or landed: out of view behind the sky
        coords.extend(pos)
    s['pobj'].data.vertices.foreach_set('co', coords)
    s['pobj'].data.update()
    # Temple: stylobates, then columns near to far with their capitals, then entablature.
    for o in s['temple']:
        kind = o.get('kind')
        if kind is None:
            continue
        k = o.get('k', 0)
        start = 0.10 + 0.03 * k
        r = {'stylobate': ease_in_out(seg(t, 0.06, 0.2)),
             'column': ease_in_out(seg(t, start, start + 0.12)),
             'cap': ease_out(seg(t, start + 0.11, start + 0.15)),
             'entablature': ease_in_out(seg(t, 0.36, 0.48))}[kind]
        o['reveal'] = r
    s['floor_r'].outputs[0].default_value = p['floor_r']
    # Dawn: grey void to golden hour.
    d = p['dawn']
    s['sky_dawn'].outputs[0].default_value = d
    s['sun'].data.energy = 2.8 * d
    s['key'].data.energy = 300 * (0.45 + 0.55 * d)
    grey_bg, dusk_bg = rgba('#6b7178'), rgba('#232a4d')
    s['bg'].inputs['Color'].default_value = tuple(grey_bg[i] + (dusk_bg[i] - grey_bg[i]) * d for i in range(4))
    s['bg'].inputs['Strength'].default_value = 0.9 - 0.4 * d
    grey_h, warm_h = (0.72, 0.74, 0.77, 1), (0.95, 0.8, 0.66, 1)
    s['haze_vol'].inputs['Color'].default_value = tuple(grey_h[i] + (warm_h[i] - grey_h[i]) * d for i in range(4))
    s['vol'].outputs[0].default_value = 0.032 + 0.06 * (1 - d)
    s['rig'].rotation_euler = (0, p['yaw'], 0)
    dist = 7.4 - 1.1 * p['dolly']
    level = p['iris']
    s['cam'].location = (0, 0.5 * (1 - level), dist)
    s['cam'].rotation_euler = (math.radians(-5.5 * (1 - level)), 0, 0)
    s['cam'].data.dof.focus_distance = dist
    s['cam'].data.shift_y = 0.1 * p['iris']        # room above the logo for the title
    bpy.context.view_layer.update()
    # Iris centred on the logo as the camera sees it.
    w, h = s['res']
    c = world_to_camera_view(s['sc'], s['cam'], s['rig'].matrix_world.translation)
    big, small = 2.3, 0.62
    d_frac = math.exp(math.log(big) + (math.log(small) - math.log(big)) * p['iris'])
    rim = 0.012
    for node, dia in ((s['iris']['inner'], d_frac), (s['iris']['outer'], d_frac + rim)):
        node.inputs['Position'].default_value = (c.x, c.y)
        node.inputs['Size'].default_value = (dia, dia)
    s['iris']['add1'].inputs['Factor'].default_value = p['rim']
    s['iris']['add2'].inputs['Factor'].default_value = p['rim']


def export_geometry(s, path):
    """Final-frame screen geometry, normalised 0..1 from the top-left, so the
    app's flat SVG lockup lines up with the last video frame."""
    import json
    sc, cam, rig = s['sc'], s['cam'], s['rig']
    bpy.context.view_layer.update()
    def screen(local):
        v = world_to_camera_view(sc, cam, rig.matrix_world @ Vector(local))
        return [round(v.x, 5), round(1 - v.y, 5)]
    def leaf(pts):
        return [screen(((x - CENTER[0]) * UNIT, -(y - CENTER[1]) * UNIT, DEPTH / 2)) for x, y in pts]
    inner = s['iris']['inner']
    cx, cy = inner.inputs['Position'].default_value[:2]
    data = {
        'left': leaf(LEFT), 'right': leaf(RIGHT),
        'iris': {'cx': round(cx, 5), 'cy': round(1 - cy, 5), 'diameter_of_width': round(inner.inputs['Size'].default_value[0], 5)},
        'aspect': [s['res'][0], s['res'][1]],
    }
    with open(path, 'w') as f:
        json.dump(data, f, indent=1)
    print('geometry ->', path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('out')
    ap.add_argument('--frames', default='')
    ap.add_argument('--sequence', type=int, default=0)
    ap.add_argument('--res', default='432x768')
    ap.add_argument('--samples', type=int, default=32)
    ap.add_argument('--export-geometry', default='')
    ap.add_argument('--range', default='', help='render only sequence frames a:b (end exclusive), for chunked renders')
    ap.add_argument('--skip-existing', action='store_true', help='resume: skip frames whose PNG already exists')
    a = ap.parse_args(sys.argv[1:])
    w, h = (int(v) for v in a.res.split('x'))
    os.makedirs(a.out, exist_ok=True)
    s = build((w, h), a.samples)
    times = [float(v) for v in a.frames.split(',') if v] if a.frames else \
        [i / (a.sequence - 1) for i in range(a.sequence)]
    lo, hi = 0, len(times)
    if a.range:
        lo, hi = (int(v) for v in a.range.split(':'))
    for i, t in enumerate(times):
        if not lo <= i < hi:
            continue
        out = os.path.join(a.out, f'f{i:04d}.png')
        if a.skip_existing and os.path.exists(out) and os.path.getsize(out) > 0:
            continue
        apply(s, t)
        s['sc'].render.filepath = os.path.join(a.out, f'f{i:04d}.png')
        if a.export_geometry and abs(t - 1.0) < 1e-6:
            export_geometry(s, a.export_geometry)
        bpy.ops.render.render(write_still=True)
        print(f'rendered {i + 1}/{len(times)} t={t:.3f}', flush=True)


if __name__ == '__main__':
    main()
