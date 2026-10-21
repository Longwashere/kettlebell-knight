# Unsharp-mask a premultiplied-alpha atlas page: sharpen RGB, keep alpha, clamp RGB <= alpha.
import sys
import numpy as np
from PIL import Image, ImageFilter
src, dst, radius, percent = sys.argv[1], sys.argv[2], float(sys.argv[3]), int(sys.argv[4])
im = Image.open(src).convert('RGBA')
a = np.asarray(im.getchannel('A'), dtype=np.int16)
rgb = im.convert('RGB').filter(ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=2))
out = np.minimum(np.asarray(rgb, dtype=np.int16), a[..., None])
Image.fromarray(np.dstack([out, a]).astype(np.uint8), 'RGBA').save(dst, optimize=True)
