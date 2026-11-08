# Cut the shooter out of the green-screen clip and pack the frames into one sheet.
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage
src, out_img, out_json = sys.argv[1:4]
im = Image.open(src); n = im.n_frames
frames = []
for i in range(n):
    im.seek(i); frames.append(np.asarray(im.convert("RGB")).astype(np.float32))
H, W, _ = frames[0].shape
rgba = []
balls = {}
for i, a in enumerate(frames):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    greenness = g - np.maximum(r, b)
    alpha = np.clip(1 - (greenness - 35) / 110, 0, 1)
    alpha = ndimage.median_filter(alpha, size=3)          # GIF dither speckle
    # despill: no pixel may be greener than its red/blue
    g2 = np.minimum(g, np.maximum(r, b) * 1.02)
    out = np.dstack([r, g2, b, alpha * 255])
    # find the ball: the topmost orange shape; its widest row gives centre and radius
    orange = (r > 120) & (r - g > 45) & (g > 40) & (b < 110)
    ys, xs = np.nonzero(orange[: int(H * 0.35)])
    if 3 <= i <= 5 and len(ys) > 200:
        top = ys.min()
        rows = [(y, xs[ys == y].min(), xs[ys == y].max()) for y in range(top, top + 45) if (ys == y).any()]
        y, a_, b_ = max(rows, key=lambda t: t[2] - t[1])
        cx, rad = (a_ + b_) / 2, (b_ - a_) / 2
        balls[i] = {"x": float(cx), "y": float(top + rad), "r": float(rad)}
        # after release the ball flies off: erase it so the game's ball is the only one
        if i == 5:
            yy, xx = np.mgrid[0:H, 0:W]
            m = ((xx - cx) ** 2 + (yy - (top + rad)) ** 2 < (rad * 1.45) ** 2) & (yy < top + rad * 2.2)
            out[m, 3] = 0
    rgba.append(out)
# crop all frames to one shared box
alls = np.stack([f[..., 3] for f in rgba]) > 20
ys, xs = np.nonzero(alls.any(0))
pad = 4
x0, x1 = max(0, xs.min() - pad), min(W, xs.max() + pad + 1)
y0, y1 = max(0, ys.min() - pad), min(H, ys.max() + pad + 1)
fw, fh = x1 - x0, y1 - y0
cols = 3; rows = (n + cols - 1) // cols
sheet = Image.new("RGBA", (fw * cols, fh * rows), (0, 0, 0, 0))
for i, f in enumerate(rgba):
    tile = Image.fromarray(np.clip(f[y0:y1, x0:x1], 0, 255).astype(np.uint8), "RGBA")
    sheet.paste(tile, ((i % cols) * fw, (i // cols) * fh))
sheet.save(out_img, "WEBP", quality=92, method=6)
# body measurements from the standing frame
a0 = rgba[0][..., 3] > 128
ys0, xs0 = np.nonzero(a0)
meta = {
    "frames": n, "cols": cols, "rows": rows, "fw": int(fw), "fh": int(fh),
    "sole": float(ys0.max() - y0), "headTop": float(ys0.min() - y0), "bodyX": float(np.median(xs0) - x0),
    "balls": {str(k): {"x": v["x"] - x0, "y": v["y"] - y0, "r": v["r"]} for k, v in balls.items()},
}
json.dump(meta, open(out_json, "w"), indent=1)
print(json.dumps(meta, indent=1))
