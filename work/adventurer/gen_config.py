"""Generate the spine-animation skill config.json for the adventurer rig.

Bones are defined by world-space joint positions on the assembled-pose canvas (see layout.py),
converted to Spine's parent-relative local transforms. Animations are authored in the skill's
shorthand ("angle" + normalized "curve"); build_spine_json.py converts them to the wire format.
"""
import json, math, sys
sys.path.insert(0, 'work/adventurer')
from PIL import Image
from layout import PLACE, ORDER, SCALE

CX, GROUND = 200, 705                      # canvas x of centre line, canvas y of the floor
def world(px, py): return (px - CX, GROUND - py)

# name: (parent, joint px, joint the bone points at px, inherit)
BONES = [
    ("root",        None,          (200, 705), None,       None),
    ("hip",         "root",        (200, 372), None,       None),
    ("torso",       "hip",         (200, 368), (200, 186), None),
    ("head",        "torso",       (200, 186), (200, 66),  None),
    ("r_upper_arm", "torso",       (130, 202), (126, 262), None),
    ("r_forearm",   "r_upper_arm", (126, 262), (112, 372), None),
    ("l_upper_arm", "torso",       (266, 203), (290, 270), None),
    ("l_forearm",   "l_upper_arm", (290, 270), (310, 382), None),
    ("r_thigh",     "hip",         (160, 378), (160, 535), None),
    ("r_shin",      "r_thigh",     (160, 535), (162, 632), "noScale"),
    ("r_foot",      "r_shin",      (162, 632), (130, 690), None),
    ("l_thigh",     "hip",         (240, 378), (243, 535), None),
    ("l_shin",      "l_thigh",     (243, 535), (240, 632), "noScale"),
    ("l_foot",      "l_shin",      (240, 632), (272, 690), None),
]
SLOT_BONE = {"head": "head", "torso": "torso",
             "r_upper_arm": "r_upper_arm", "r_forearm": "r_forearm",
             "l_upper_arm": "l_upper_arm", "l_forearm": "l_forearm",
             "r_thigh": "r_thigh", "r_shin": "r_shin", "r_boot": "r_foot",
             "l_thigh": "l_thigh", "l_shin": "l_shin", "l_boot": "l_foot"}

def rot(v, deg):
    a = math.radians(deg); c, s = math.cos(a), math.sin(a)
    return (v[0] * c - v[1] * s, v[0] * s + v[1] * c)

wpos, wrot, bones = {}, {}, []
for name, parent, joint, aim, inherit in BONES:
    p = world(*joint)
    r = 0.0 if aim is None else math.degrees(math.atan2(*reversed(
        [a - b for a, b in zip(world(*aim), p)])))
    if name == "hip": r = 0.0                       # keep hip axis-aligned so translates are world-space
    wpos[name], wrot[name] = p, r
    b = {"name": name}
    if parent:
        local = rot((p[0] - wpos[parent][0], p[1] - wpos[parent][1]), -wrot[parent])
        b.update(parent=parent, x=round(local[0], 2), y=round(local[1], 2))
        if round(r - wrot[parent], 2): b["rotation"] = round(r - wrot[parent], 2)
    if aim is not None:
        b["length"] = round(math.dist(world(*aim), p), 1)
    if inherit: b["inherit"] = inherit
    bones.append(b)

slots, attachments = [], {}
for part in ORDER:
    bone = SLOT_BONE[part]
    w, h = Image.open(f'work/adventurer/parts/{part}.png').size
    s = SCALE.get(part, 1)
    cx, cy = PLACE[part][0] + w * s / 2, PLACE[part][1] + h * s / 2
    off = rot((world(cx, cy)[0] - wpos[bone][0], world(cx, cy)[1] - wpos[bone][1]), -wrot[bone])
    att = {"x": round(off[0], 2), "y": round(off[1], 2), "width": w, "height": h}
    if round(-wrot[bone], 2): att["rotation"] = round(-wrot[bone], 2)
    if s != 1: att.update(scaleX=s, scaleY=s)
    slots.append({"name": part, "bone": bone, "attachment": part})
    attachments[part] = att

# ─── animations ──────────────────────────────────────────────────────────────
EASE, EASE_IN, EASE_OUT, EASE_FAST = [0.25, 0, 0.75, 1], [0.42, 0, 1, 1], [0, 0, 0.58, 1], [0.4, 0, 0.2, 1]

def rk(pts, curves=None):
    """[(t, angle)] -> rotate keys; curves[i] eases the segment ending at key i."""
    return [dict({"time": round(t, 4), "angle": round(v, 2)},
                 **({"curve": (curves or {}).get(i, EASE)} if i else {})) for i, (t, v) in enumerate(pts)]

def xy(pts, curves=None):
    """[(t, x, y)] -> translate/scale keys."""
    return [dict({"time": round(t, 4), "x": round(x, 3), "y": round(y, 3)},
                 **({"curve": (curves or {}).get(i, EASE)} if i else {})) for i, (t, x, y) in enumerate(pts)]

def cyc(fn, D, N=16):
    """Sample a periodic function into linear keys for loops."""
    return [(D * i / N, fn(2 * math.pi * i / N)) for i in range(N + 1)]

def lin_rk(pts): return [{"time": round(t, 4), "angle": round(v, 2)} for t, v in pts]
def lin_xy(pts): return [{"time": round(t, 4), "x": round(x, 3), "y": round(y, 3)} for t, x, y in pts]

def poses(times, table, curves=None):
    """Pose table: bone -> {"rotate": [...], "translate": [(x,y)...], "scale": [(x,y)...]} sampled at times."""
    out = {}
    for bone, tl in table.items():
        for kind, vals in tl.items():
            if kind == "rotate": keys = rk(list(zip(times, vals)), curves)
            else: keys = xy([(t, *v) for t, v in zip(times, vals)], curves)
            out.setdefault(bone, {})[kind] = keys
    return out

A = {}
s, c = math.sin, math.cos

# idle — breathing loop; torso bobs (not hip) so the feet stay planted
D = 2.0
A["idle"] = {"bones": {
    "torso":       {"rotate": lin_rk(cyc(lambda p: 1.2 * s(p), D)),
                    "translate": lin_xy([(t, 0, v) for t, v in cyc(lambda p: 1.5 * (c(p) - 1), D)])},
    "head":        {"rotate": lin_rk(cyc(lambda p: -1.5 * s(p - 0.6), D))},
    "r_upper_arm": {"rotate": lin_rk(cyc(lambda p: -1.5 * s(p - 0.4), D))},
    "l_upper_arm": {"rotate": lin_rk(cyc(lambda p: 1.5 * s(p - 0.4), D))},
    "r_forearm":   {"rotate": lin_rk(cyc(lambda p: 2 * s(p - 0.8), D))},
    "l_forearm":   {"rotate": lin_rk(cyc(lambda p: -2 * s(p - 0.8), D))},
}}

# walk — front-facing march in place; a lifted thigh foreshortens (scaleX) toward the camera
D = 0.8
lr = lambda p: max(0.0, s(p))       # right leg lift 0..1
ll = lambda p: max(0.0, -s(p))      # left leg lift 0..1
A["walk"] = {"bones": {
    "r_thigh":     {"scale": lin_xy([(t, v, 1) for t, v in cyc(lambda p: 1 - 0.3 * lr(p), D)]),
                    "rotate": lin_rk(cyc(lambda p: -3 * lr(p), D))},
    "r_shin":      {"rotate": lin_rk(cyc(lambda p: 12 * lr(p), D))},
    "r_foot":      {"rotate": lin_rk(cyc(lambda p: -6 * lr(p), D))},
    "l_thigh":     {"scale": lin_xy([(t, v, 1) for t, v in cyc(lambda p: 1 - 0.3 * ll(p), D)]),
                    "rotate": lin_rk(cyc(lambda p: 3 * ll(p), D))},
    "l_shin":      {"rotate": lin_rk(cyc(lambda p: -12 * ll(p), D))},
    "l_foot":      {"rotate": lin_rk(cyc(lambda p: 6 * ll(p), D))},
    "torso":       {"rotate": lin_rk(cyc(lambda p: -2.5 * s(p), D)),
                    "translate": lin_xy([(t, 0, v) for t, v in cyc(lambda p: 3 * abs(s(p)) - 1.5, D)])},
    "head":        {"rotate": lin_rk(cyc(lambda p: 2 * s(p), D))},
    "r_upper_arm": {"rotate": lin_rk(cyc(lambda p: -5 * s(p), D))},
    "r_forearm":   {"rotate": lin_rk(cyc(lambda p: 14 * ll(p), D))},
    "l_upper_arm": {"rotate": lin_rk(cyc(lambda p: -5 * s(p), D))},
    "l_forearm":   {"rotate": lin_rk(cyc(lambda p: -14 * lr(p), D))},
}}

# attack — right arm overhead wind-up, slam down across the body
T = [0, 0.25, 0.38, 0.5, 0.75]
A["attack"] = {"bones": poses(T, {
    "r_upper_arm": {"rotate": [0, -150, 35, 30, 0]},
    "r_forearm":   {"rotate": [0, -40, 10, 6, 0]},
    "l_upper_arm": {"rotate": [0, 12, -10, -8, 0]},
    "l_forearm":   {"rotate": [0, -15, 12, 8, 0]},
    "torso":       {"rotate": [0, 6, -10, -8, 0], "translate": [(0, 0), (0, 2), (0, -6), (0, -5), (0, 0)]},
    "head":        {"rotate": [0, -4, 8, 6, 0]},
}, curves={1: EASE_OUT, 2: EASE_FAST, 3: EASE, 4: EASE}),
    "slots": {}}

# hit — recoil with a red flash on every slot
T = [0, 0.08, 0.25, 0.5]
A["hit"] = {"bones": poses(T, {
    "torso":       {"rotate": [0, -10, -6, 0], "translate": [(0, 0), (0, -4), (0, -2), (0, 0)]},
    "head":        {"rotate": [0, 14, 8, 0]},
    "r_upper_arm": {"rotate": [0, -22, -12, 0]},
    "l_upper_arm": {"rotate": [0, 22, 12, 0]},
    "r_forearm":   {"rotate": [0, -15, -8, 0]},
    "l_forearm":   {"rotate": [0, 15, 8, 0]},
}, curves={1: EASE_OUT}),
    "slots": {p: {"rgba": [{"time": 0, "color": "ffffffff"}, {"time": 0.06, "color": "ff7070ff"},
                           {"time": 0.3, "color": "ffffffff"}]} for p in ORDER}}

# victory — arms overhead, two hops
D = 1.2
up_r, up_l = -165, 160
A["victory"] = {"bones": {
    "r_upper_arm": {"rotate": rk([(0, 0), (0.2, up_r), (0.5, up_r + 10), (0.8, up_r), (1.0, up_r + 10), (D, 0)])},
    "r_forearm":   {"rotate": rk([(0, 0), (0.2, -25), (0.5, -15), (0.8, -25), (1.0, -15), (D, 0)])},
    "l_upper_arm": {"rotate": rk([(0, 0), (0.2, up_l), (0.5, up_l - 10), (0.8, up_l), (1.0, up_l - 10), (D, 0)])},
    "l_forearm":   {"rotate": rk([(0, 0), (0.2, 25), (0.5, 15), (0.8, 25), (1.0, 15), (D, 0)])},
    "hip":         {"translate": xy([(0, 0, 0), (0.35, 0, 22), (0.55, 0, 0), (0.85, 0, 22), (1.05, 0, 0), (D, 0, 0)],
                                    curves={1: EASE_OUT, 2: EASE_IN, 3: EASE_OUT, 4: EASE_IN})},
    "head":        {"rotate": rk([(0, 0), (0.35, 4), (0.55, 0), (0.85, -4), (1.05, 0), (D, 0)])},
}}

# squat — goblet squat: thighs foreshorten and splay, shins angle back so the boots stay planted
T = [0, 0.8, 1.2, 2.0]
TH, SQ = 14, 0.64                                   # thigh splay (deg), thigh foreshortening
drop = 157 * (1 - SQ * math.cos(math.radians(TH))) + 97 * (1 - math.cos(math.radians(TH)))
A["squat"] = {"bones": poses(T, {
    "hip":         {"translate": [(0, 0), (0, -drop), (0, -drop), (0, 0)]},
    "r_thigh":     {"rotate": [0, -TH, -TH, 0], "scale": [(1, 1), (SQ, 1.08), (SQ, 1.08), (1, 1)]},
    "r_shin":      {"rotate": [0, 2 * TH, 2 * TH, 0]},
    "r_foot":      {"rotate": [0, -TH, -TH, 0]},
    "l_thigh":     {"rotate": [0, TH, TH, 0], "scale": [(1, 1), (SQ, 1.08), (SQ, 1.08), (1, 1)]},
    "l_shin":      {"rotate": [0, -2 * TH, -2 * TH, 0]},
    "l_foot":      {"rotate": [0, TH, TH, 0]},
    "r_upper_arm": {"rotate": [0, 22, 22, 0]},
    "r_forearm":   {"rotate": [0, 96, 96, 0]},
    "l_upper_arm": {"rotate": [0, -22, -22, 0]},
    "l_forearm":   {"rotate": [0, -96, -96, 0]},
    "torso":       {"rotate": [0, 0, 0, 0], "translate": [(0, 0), (0, -6), (0, -6), (0, 0)]},
    "head":        {"rotate": [0, 3, 3, 0]},
})}

config = {
    "skeleton": {"name": "adventurer", "width": 260, "height": 680},
    "bones": bones, "slots": slots, "attachments": attachments,
    "animations": [], "custom_animations": A,
}
json.dump(config, open('work/adventurer/config.json', 'w'), indent=2)
print("bones", len(bones), "slots", len(slots), "animations", list(A), f"squat drop {drop:.1f}")
