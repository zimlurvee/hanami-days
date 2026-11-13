import struct, json, io
import numpy as np

CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}

class Glb:
    def __init__(self, path):
        self.f = open(path, 'rb')
        self.f.read(12)
        l, _ = struct.unpack('<I4s', self.f.read(8)); self.g = json.loads(self.f.read(l))
        l2, _ = struct.unpack('<I4s', self.f.read(8)); self.binoff = self.f.tell(); self.binlen = l2
        import mmap
        self.mm = mmap.mmap(self.f.fileno(), 0, access=mmap.ACCESS_READ)

    def view_bytes(self, i):
        v = self.g['bufferViews'][i]
        o = self.binoff + v.get('byteOffset', 0)
        return self.mm[o:o + v['byteLength']]

    def accessor(self, i):
        a = self.g['accessors'][i]
        dt = CT[a['componentType']]; n = NC[a['type']]
        v = self.g['bufferViews'][a['bufferView']]
        o = self.binoff + v.get('byteOffset', 0) + a.get('byteOffset', 0)
        stride = v.get('byteStride') or 0
        item = np.dtype(dt).itemsize * n
        if stride and stride != item:
            raw = np.frombuffer(self.mm, dtype=np.uint8, count=stride * (a['count'] - 1) + item, offset=o)
            arr = np.lib.stride_tricks.as_strided(raw, shape=(a['count'], item), strides=(stride, 1)).copy().view(dt).reshape(a['count'], n)
        else:
            arr = np.frombuffer(self.mm, dtype=dt, count=a['count'] * n, offset=o).reshape(a['count'], n)
        if a.get('normalized'):
            arr = arr.astype(np.float32) / (np.iinfo(dt).max if dt in (np.uint8, np.uint16) else float(np.iinfo(dt).max))
        return arr

def node_local(n):
    if 'matrix' in n: return np.array(n['matrix'], dtype=np.float64).reshape(4, 4).T
    m = np.eye(4); q = n.get('rotation', [0, 0, 0, 1]); s = n.get('scale', [1, 1, 1]); tr = n.get('translation', [0, 0, 0])
    x, y, z, w = q
    R = np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)], [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)], [2*(x*z+y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])
    R = np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)], [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)], [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])
    m[:3, :3] = R @ np.diag(s); m[:3, 3] = tr; return m

def world_matrices(g):
    nodes = g['nodes']; W = [None] * len(nodes)
    stack = [(r, np.eye(4)) for r in g['scenes'][g.get('scene', 0)]['nodes']]
    while stack:
        i, P = stack.pop(); W[i] = P @ node_local(nodes[i])
        for c in nodes[i].get('children', []): stack.append((c, W[i]))
    return W
