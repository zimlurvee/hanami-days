"""
Bakes the School Creator V2 model (CC-BY 4.0, Joaquito) into a web-sized format for Hanami Days.

  python3 -I bake_school.py <school.glb> <outdir>

Output:
  school.json     manifest: materials, primitives, instances, zones, area spots
  school.bin      unique geometry (quantised) + instance table  (gzip it afterwards)
  colliders.json  oriented boxes + a few trimeshes (stairs), already in game coordinates
  tex/*.webp      texture atlases and tiled textures

The model is rotated half a turn (its front gate faces -Z, the town's road is to the south),
scaled and moved so the gate sits at GATE in the town.
"""
import sys, os, re, io, json, math, struct, collections, hashlib
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glbio import *

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT + '/tex', exist_ok=True)

# ---- placement -------------------------------------------------------------
SCALE = 1.0
GATE_MODEL = np.array([0.0, 0.0, -257.6])
GATE_WORLD = np.array([-29.0, 0.03, -47.0])
P = np.eye(4)
P[:3, :3] = SCALE * np.diag([-1.0, 1.0, -1.0])
P[:3, 3] = GATE_WORLD - SCALE * np.diag([-1.0, 1.0, -1.0]) @ GATE_MODEL

PX_PER_M = 36
MIN_TEX, MAX_TEX = 128, 512
PAGE = 2048
PAD = 8
CHUNK = 28.0
SMALL_R = 1.2      # instances smaller than this go to the "props" layer

G = Glb(SRC); g = G.g
nodes = g['nodes']; W = world_matrices(g)
tex_defs = g['textures']; mats = g['materials']; imgs = g['images']

# ---- images ----------------------------------------------------------------
_img_cache = {}
def load_img(i):
    if i not in _img_cache:
        im = Image.open(io.BytesIO(G.view_bytes(imgs[i]['bufferView']))); im.load()
        _img_cache[i] = im.convert('RGBA')
    return _img_cache[i]
_alpha_cache = {}
def has_alpha(i):
    if i not in _alpha_cache:
        a = np.asarray(load_img(i))[:, :, 3]; _alpha_cache[i] = float((a < 250).mean()) > 0.01
    return _alpha_cache[i]

BLEND_NAMES = re.compile(r'water|hologram|glass', re.I)

def mat_info(mi):
    m = mats[mi]; pb = m.get('pbrMetallicRoughness', {})
    bt = pb.get('baseColorTexture')
    img = tex_defs[bt['index']]['source'] if bt else None
    f = [float(x) for x in pb.get('baseColorFactor', [1, 1, 1, 1])]
    tr = (bt or {}).get('extensions', {}).get('KHR_texture_transform')
    alpha = 'opaque'
    if f[3] < 0.99 or (img is not None and BLEND_NAMES.search(imgs[img].get('name', '') or '')) or BLEND_NAMES.search(m.get('name', '') or ''):
        alpha = 'blend'
    elif img is not None and has_alpha(img): alpha = 'mask'
    return dict(img=img, f=f, tr=tr, alpha=alpha, ds=bool(m.get('doubleSided', False)))

def uv_transform(uv, tr):
    if not tr: return uv
    o = tr.get('offset', [0, 0]); r = tr.get('rotation', 0); s = tr.get('scale', [1, 1])
    c, sn = math.cos(r), math.sin(r)
    Tm = np.array([[1, 0, o[0]], [0, 1, o[1]], [0, 0, 1]])
    Rm = np.array([[c, sn, 0], [-sn, c, 0], [0, 0, 1]])
    Sm = np.array([[s[0], 0, 0], [0, s[1], 0], [0, 0, 1]])
    M = Tm @ Rm @ Sm
    u = np.concatenate([uv, np.ones((len(uv), 1))], 1) @ M.T
    return u[:, :2]

# ---- collect instances ------------------------------------------------------
EXCLUDE_RENDER = re.compile(r'collider', re.I)
prim_ids = {}          # (mesh, prim) -> pid
prims = []             # dict per unique primitive
inst = []              # (pid, node, M)
colliders_src = []     # node ids whose mesh is a collision proxy
for ni, n in enumerate(nodes):
    if 'mesh' not in n or W[ni] is None: continue
    me = g['meshes'][n['mesh']]
    if EXCLUDE_RENDER.search(me.get('name', '') + n.get('name', '')):
        colliders_src.append(ni); continue
    M = P @ W[ni]
    for pi, p in enumerate(me['primitives']):
        if 'material' not in p: continue
        key = (n['mesh'], pi)
        if key not in prim_ids:
            prim_ids[key] = len(prims); prims.append(dict(mesh=n['mesh'], prim=pi, mat=p['material']))
        inst.append((prim_ids[key], ni, M))
print('instances', len(inst), 'unique prims', len(prims), 'collider proxies', len(colliders_src))

# ---- per-primitive data + material grouping ---------------------------------
minfo_cache = {}
def minfo(mi):
    if mi not in minfo_cache: minfo_cache[mi] = mat_info(mi)
    return minfo_cache[mi]

def tri_area3(pos, idx):
    a, b, c = pos[idx[:, 0]], pos[idx[:, 1]], pos[idx[:, 2]]
    return float(np.linalg.norm(np.cross(b - a, c - a), axis=1).sum() / 2)
def tri_area2(uv, idx):
    a, b, c = uv[idx[:, 0]], uv[idx[:, 1]], uv[idx[:, 2]]
    return float(np.abs((b[:, 0] - a[:, 0]) * (c[:, 1] - a[:, 1]) - (c[:, 0] - a[:, 0]) * (b[:, 1] - a[:, 1])).sum() / 2)

for pr in prims:
    p = g['meshes'][pr['mesh']]['primitives'][pr['prim']]
    pos = G.accessor(p['attributes']['POSITION']).astype(np.float32)
    nrm = G.accessor(p['attributes']['NORMAL']).astype(np.float32)
    uv = G.accessor(p['attributes']['TEXCOORD_0']).astype(np.float64)
    idx = G.accessor(p['indices']).astype(np.uint32).reshape(-1, 3)
    mi = minfo(pr['mat'])
    uv = uv_transform(uv, mi['tr'])
    if mi['img'] is None: uv = np.zeros_like(uv)
    lo, hi = uv.min(0), uv.max(0)
    tiled = mi['img'] is not None and (lo.min() < -0.02 or hi.max() > 1.02)
    if tiled:
        uv = uv - np.floor(lo)      # integer shift keeps the repeat pattern, avoids huge numbers
    pr.update(pos=pos, nrm=nrm, uv=uv, idx=idx, tiled=tiled, mi=mi,
              A3=tri_area3(pos, idx), A2=tri_area2(uv, idx), n=len(pos))

# instance counts and world-area scale per primitive
pr_count = collections.Counter(); pr_area = collections.defaultdict(float)
for pid, ni, M in inst:
    sc = abs(np.linalg.det(M[:3, :3])) ** (1 / 3)
    pr_count[pid] += 1; pr_area[pid] += prims[pid]['A3'] * sc * sc

# ---- cells (atlas) and tiled materials ---------------------------------------
def fkey(f): return tuple(round(x, 2) for x in f)
cells = {}      # (img, fkey, alpha, ds) -> dict
tiled_mats = {} # (img, fkey, alpha, ds) -> dict
for pid, pr in enumerate(prims):
    mi = pr['mi']; img = mi['img']
    k = (img, fkey(mi['f']), mi['alpha'], mi['ds'])
    if mi['alpha'] == 'blend' or pr['tiled']:
        d = tiled_mats.setdefault(k, dict(key=k, area=0.0, uva=0.0, prims=[]))
        pr['group'] = ('t', k)
    else:
        d = cells.setdefault(k, dict(key=k, area=0.0, uva=0.0, prims=[]))
        pr['group'] = ('c', k)
    d['area'] += pr_area[pid]; d['uva'] += pr['A2'] * pr_count[pid]; d['prims'].append(pid)
print('atlas cells', len(cells), 'tiled/blend materials', len(tiled_mats))

def pow2_clip(v, lo, hi):
    v = max(lo, min(hi, v)); return 2 ** int(round(math.log2(v)))

def fit_img(img, f, size_w, size_h, solid=False):
    if img is None:
        c = tuple(int(round(255 * x)) for x in f)
        return Image.new('RGBA', (4, 4), c)
    im = load_img(img).resize((size_w, size_h), Image.LANCZOS)
    arr = np.asarray(im).astype(np.float32)
    arr[:, :, :3] *= np.array(f[:3], dtype=np.float32)
    if f[3] < 0.99: arr[:, :, 3] *= f[3]
    return Image.fromarray(np.clip(arr + 0.5, 0, 255).astype(np.uint8), 'RGBA')

# size per cell
for k, d in cells.items():
    img = k[0]
    if img is None: d['w'] = d['h'] = 4; continue
    src = load_img(img).size
    m2 = d['area'] / d['uva'] if d['uva'] > 1e-9 else 1.0
    t = pow2_clip(math.sqrt(m2) * PX_PER_M, MIN_TEX, MAX_TEX)
    d['w'] = min(t, pow2_clip(src[0], 4, 4096)); d['h'] = min(t, pow2_clip(src[1], 4, 4096))
    # keep aspect of the source
    ar = src[0] / src[1]
    if ar > 1.5: d['h'] = max(4, d['w'] // 2)
    elif ar < 0.67: d['w'] = max(4, d['h'] // 2)

# pack cells into pages, grouped by (alpha kind, double sided)
pages = []   # dict(alpha, ds, im, free=[rects], n)
groups = collections.defaultdict(list)
for k, d in cells.items(): groups[(k[2], k[3])].append(d)

def guillotine_place(pg, cw, ch):
    best = None
    for i, (fx, fy, fw, fh) in enumerate(pg['free']):
        if cw <= fw and ch <= fh:
            score = min(fw - cw, fh - ch)
            if best is None or score < best[0]: best = (score, i)
    if best is None: return None
    fx, fy, fw, fh = pg['free'].pop(best[1])
    # split the remainder along the shorter leftover axis
    if fw - cw < fh - ch:
        pg['free'].append((fx + cw, fy, fw - cw, ch)); pg['free'].append((fx, fy + ch, fw, fh - ch))
    else:
        pg['free'].append((fx + cw, fy, fw - cw, fh)); pg['free'].append((fx, fy + ch, cw, fh - ch))
    return fx, fy

for (alpha, ds), lst in sorted(groups.items()):
    lst.sort(key=lambda d: (-d['h'] * d['w'], -d['h']))
    group_pages = []
    def newpage():
        pg = dict(alpha=alpha, ds=ds, im=Image.new('RGBA', (PAGE, PAGE), (0, 0, 0, 0)), free=[(0, 0, PAGE, PAGE)], n=0)
        pages.append(pg); group_pages.append(pg); return pg
    newpage()
    for d in lst:
        cw, ch = d['w'] + 2 * PAD, d['h'] + 2 * PAD
        spot = None
        for pg in group_pages:
            spot = guillotine_place(pg, cw, ch)
            if spot: break
        if not spot:
            pg = newpage(); spot = guillotine_place(pg, cw, ch)
        cx, cy = spot
        k = d['key']
        tile = fit_img(k[0], k[1], d['w'], d['h'])
        a = np.asarray(tile)
        col = np.concatenate([np.repeat(a[:1], PAD, 0), a, np.repeat(a[-1:], PAD, 0)], 0)
        full = np.concatenate([np.repeat(col[:, :1], PAD, 1), col, np.repeat(col[:, -1:], PAD, 1)], 1)
        pg['im'].paste(Image.fromarray(full, 'RGBA'), (cx, cy))
        d['page'] = pages.index(pg); d['x0'] = cx + PAD; d['y0'] = cy + PAD
        pg['n'] += 1
print('pages', [(p['alpha'], p['ds'], p['n']) for p in pages])

materials = []   # manifest materials
page_mat = {}
for pi, pg in enumerate(pages):
    # trim empty rows at the bottom
    name = f'atlas_{pi}.webp'
    im = pg['im']
    if pg['alpha'] == 'opaque': im = im.convert('RGB')
    im.save(f'{OUT}/tex/{name}', 'WEBP', quality=78, method=4)
    page_mat[pi] = len(materials)
    materials.append(dict(map='tex/' + name, alpha=pg['alpha'], ds=pg['ds'], color=[1, 1, 1, 1]))
tiled_idx = {}
for ti, (k, d) in enumerate(sorted(tiled_mats.items(), key=lambda kv: str(kv[0]))):
    img, f, alpha, ds = k
    name = f't_{ti}.webp'
    if img is None:
        materials.append(dict(map=None, alpha=alpha, ds=ds, color=list(f)))
    else:
        src = load_img(img).size
        m2 = d['area'] / d['uva'] if d['uva'] > 1e-9 else 1.0
        # repeating textures: size by how big one repeat is
        t = pow2_clip(math.sqrt(m2) * PX_PER_M, 64, 256)
        w = min(t, pow2_clip(src[0], 4, 4096)); h = min(t, pow2_clip(src[1], 4, 4096))
        im = load_img(img).resize((w, h), Image.LANCZOS)
        a = has_alpha(img)
        (im if a else im.convert('RGB')).save(f'{OUT}/tex/{name}', 'WEBP', quality=80, method=4)
        materials.append(dict(map='tex/' + name, alpha=alpha, ds=ds, color=[f[0], f[1], f[2], f[3]] if alpha == 'blend' else [f[0], f[1], f[2], 1]))
    tiled_idx[k] = len(materials) - 1

# ---- write geometry -----------------------------------------------------------
buf = bytearray()
def put(arr):
    while len(buf) % 4: buf.append(0)
    off = len(buf); buf.extend(arr.tobytes()); return off

man_prims = []
for pid, pr in enumerate(prims):
    kind, k = pr['group']
    if kind == 'c':
        d = cells[k]; pg = pages[d['page']]
        uv = pr['uv'].copy()
        uv[:, 0] = (d['x0'] + uv[:, 0] * d['w']) / PAGE
        uv[:, 1] = (d['y0'] + uv[:, 1] * d['h']) / PAGE
        # for a solid-colour cell, sample the middle of the 4x4 patch
        if k[0] is None: uv[:] = np.array([(d['x0'] + 2) / PAGE, (d['y0'] + 2) / PAGE])
        mat = page_mat[d['page']]
        uv = np.clip(uv, 0, 1)
    else:
        uv = pr['uv']; mat = tiled_idx[k]
    pos = pr['pos']; lo = pos.min(0); hi = pos.max(0); ext = np.maximum(hi - lo, 1e-6)
    q = np.round((pos - lo) / ext * 65535 - 32768).astype('<i2')
    nq = np.clip(np.round(pr['nrm'] * 127), -127, 127).astype('<i1')
    ulo = uv.min(0); uext = np.maximum(uv.max(0) - ulo, 1e-9)
    uq = np.round((uv - ulo) / uext * 65535).astype('<u2')
    idx = pr['idx'].reshape(-1)
    i32 = len(pos) > 65535
    idxa = idx.astype('<u4' if i32 else '<u2')
    man_prims.append(dict(m=mat, n=int(len(pos)), ni=int(len(idx)), i32=int(i32),
        p=put(q), nr=put(nq), u=put(uq), ix=put(idxa),
        lo=[float(x) for x in lo], ex=[float(x) for x in ext], ulo=[float(x) for x in ulo], uex=[float(x) for x in uext]))

# instance table: [pid, radius, cx, cy, cz, m00 m01 m02 m03, m10.., m20..] (18 floats)
rows = []
for pid, ni, M in inst:
    pr = prims[pid]
    lo = pr['pos'].min(0); hi = pr['pos'].max(0)
    c = (M @ np.array([*((lo + hi) / 2), 1.0]))[:3]
    r = float(np.linalg.norm((hi - lo) / 2) * abs(np.linalg.det(M[:3, :3])) ** (1 / 3))
    rows.append([pid, r, *c, *M[:3, :].reshape(-1)])
inst_arr = np.array(rows, dtype=np.float32)
inst_off = put(inst_arr)
print('geometry bytes', len(buf) / 1e6, 'MB; instance rows', len(rows))
open(OUT + '/school.bin', 'wb').write(buf)

# ---- colliders ---------------------------------------------------------------
def base(n): return re.sub(r'(\(Clone\))?__-?\d+$', '', n).strip()
NO_COLLIDE = re.compile(r'ceiling|petal|flower|paper|poster|decal|light|lamp|vent|fan|curtain|clock|photo|picture|rug|carpet|shoe|trash|pencil|hologram|water|leaves|grass|moss|frame|sign|banner|sticker|cable|wire|chain|spray|bubble|steam|smoke|fire|glow|ray|particle|audio|trigger|ground ?petals|bunting|flag|plant|bush|hedge|tree', re.I)
# Door leaves and frames are closed in the exported scene (and glass doors are see-through), so they
# must not block the doorway. Wall pieces that contain a doorway keep their real shape (not a solid box).
DOOR_LEAF = re.compile(r'door|entrance_?column', re.I)
DOOR_KEEP = re.compile(r'wall|cabinet|washer|tank|mat\b|doormat', re.I)
STAIR = re.compile(r'^(Staircase|Stair Floor|GaziboStairs)(?!_)', re.I)
boxes = []; meshes_c = []
def node_obb(ni):
    n = nodes[ni]; lo = np.array([1e9] * 3); hi = -lo
    for p in g['meshes'][n['mesh']]['primitives']:
        a = g['accessors'][p['attributes']['POSITION']]
        lo = np.minimum(lo, a['min']); hi = np.maximum(hi, a['max'])
    return lo, hi
def rot_to_quat(R):
    t = np.trace(R)
    if t > 0:
        s = math.sqrt(t + 1) * 2; return [(R[2, 1] - R[1, 2]) / s, (R[0, 2] - R[2, 0]) / s, (R[1, 0] - R[0, 1]) / s, 0.25 * s]
    i = int(np.argmax(np.diag(R)))
    if i == 0:
        s = math.sqrt(1 + R[0, 0] - R[1, 1] - R[2, 2]) * 2; return [0.25 * s, (R[0, 1] + R[1, 0]) / s, (R[0, 2] + R[2, 0]) / s, (R[2, 1] - R[1, 2]) / s]
    if i == 1:
        s = math.sqrt(1 + R[1, 1] - R[0, 0] - R[2, 2]) * 2; return [(R[0, 1] + R[1, 0]) / s, 0.25 * s, (R[1, 2] + R[2, 1]) / s, (R[0, 2] - R[2, 0]) / s]
    s = math.sqrt(1 + R[2, 2] - R[0, 0] - R[1, 1]) * 2; return [(R[0, 2] + R[2, 0]) / s, (R[1, 2] + R[2, 1]) / s, 0.25 * s, (R[1, 0] - R[0, 1]) / s]
def add_box(ni, M, minsize=0.0):
    lo, hi = node_obb(ni)
    c = M @ np.array([*((lo + hi) / 2), 1.0])
    A = M[:3, :3]; sx, sy, sz = np.linalg.norm(A, axis=0)
    if min(sx, sy, sz) < 1e-6: return False
    R = A / np.array([sx, sy, sz])
    h = (hi - lo) / 2 * np.array([sx, sy, sz])
    if max(h) * 2 < minsize: return False
    if np.linalg.det(R) < 0: return False
    q = rot_to_quat(R); nq = math.sqrt(sum(x * x for x in q)); q = [x / nq for x in q]
    boxes.append([round(float(x), 3) for x in [*c[:3], *h, *q]]); return True
nb = collections.Counter()
for ni, M in [(ni, P @ W[ni]) for ni in colliders_src]:
    if add_box(ni, M): nb['proxy'] += 1
seen_stair = 0
for pid, ni, M in inst:
    pass
done_nodes = set()
for pid, ni, M in inst:
    if ni in done_nodes: continue
    done_nodes.add(ni)
    nm = base(nodes[ni].get('name', ''))
    if STAIR.match(nm):
        # real geometry so the steps can be climbed
        for p in g['meshes'][nodes[ni]['mesh']]['primitives']:
            pos = G.accessor(p['attributes']['POSITION']).astype(np.float64); idx = G.accessor(p['indices']).astype(np.uint32).reshape(-1)
            w = (M @ np.c_[pos, np.ones(len(pos))].T).T[:, :3]
            meshes_c.append(dict(v=[round(float(x), 3) for x in w.reshape(-1)], i=[int(x) for x in idx]))
        nb['stairs'] += 1; continue
    if NO_COLLIDE.search(nm): nb['skipped'] += 1; continue
    is_door = bool(re.search('door', nm, re.I))
    if is_door and not DOOR_KEEP.search(nm): nb['door'] += 1; continue
    if is_door and re.search('wall', nm, re.I):
        # wall with an opening: use its triangles so the doorway stays open
        for p in g['meshes'][nodes[ni]['mesh']]['primitives']:
            pos = G.accessor(p['attributes']['POSITION']).astype(np.float64); idx = G.accessor(p['indices']).astype(np.uint32).reshape(-1)
            w = (M @ np.c_[pos, np.ones(len(pos))].T).T[:, :3]
            meshes_c.append(dict(v=[round(float(x), 2) for x in w.reshape(-1)], i=[int(x) for x in idx]))
        nb['doorwall'] += 1; continue
    lo_, hi_ = node_obb(ni)
    ext_ = (hi_ - lo_) * np.linalg.norm(M[:3, :3], axis=0)
    if ext_.prod() > 40 and ext_.min() > 0.8:
        # big hollow things (the gym, hills, basement) need their real shape, a box would fill them in
        for p in g['meshes'][nodes[ni]['mesh']]['primitives']:
            pos = G.accessor(p['attributes']['POSITION']).astype(np.float64); idx = G.accessor(p['indices']).astype(np.uint32).reshape(-1)
            w = (M @ np.c_[pos, np.ones(len(pos))].T).T[:, :3]
            meshes_c.append(dict(v=[round(float(x), 2) for x in w.reshape(-1)], i=[int(x) for x in idx]))
        nb['bigmesh'] += 1; continue
    if add_box(ni, M, 0.45): nb['box'] += 1
    else: nb['tiny'] += 1
print('colliders', dict(nb), 'boxes', len(boxes), 'trimeshes', len(meshes_c))
json.dump(dict(boxes=boxes, meshes=meshes_c), open(OUT + '/colliders.json', 'w'), separators=(',', ':'))

# ---- manifest -----------------------------------------------------------------
manifest = dict(materials=materials, prims=man_prims, instOff=inst_off, instCount=len(rows), instStride=17,
                chunk=CHUNK, smallR=SMALL_R, bounds=None)
allc = inst_arr[:, 2:5]
manifest['bounds'] = [allc.min(0).tolist(), allc.max(0).tolist()]
json.dump(manifest, open(OUT + '/school.json', 'w'), separators=(',', ':'))
print('manifest KB', os.path.getsize(OUT + '/school.json') // 1024)
