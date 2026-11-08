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

# The generated clip isn't perfectly consistent: in the follow-through he comes out about 6%
# shorter than when standing at the start, and his feet drift down a few pixels. Measure
# feet-to-headband in each frame, stretch the follow-through frames back to his standing
# height (vertically, anchored at the feet; widths already match), and pin every frame's
# feet to the same spot.
def measure(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    fg = (g - np.maximum(r, b)) < 40
    ys, xs = np.nonzero(fg); sole = ys.max()
    cx = int(np.median(xs[ys > sole - 200]))
    white = (r > 195) & (g > 195) & (b > 195)
    band = next((y for y in range(0, H // 2) if white[y, cx - 30:cx + 30].sum() >= 22), None)
    return sole, band
sole0, band0 = measure(frames[0])
h0 = sole0 - band0
scales = {}
for i in range(6, n):
    so, ba = measure(frames[i])
    scales[i] = h0 / (so - ba)
if 6 in scales:
    scales[5] = (1 + scales[6]) / 2          # release frame sits between the two
def refit(a, s, sole):
    img = Image.fromarray(a.astype(np.uint8))
    nh = int(round(H * s))
    big = img.resize((W, nh), Image.LANCZOS)
    canvas = Image.new("RGB", (W, H), tuple(int(v) for v in a[2, 2]))   # background green
    canvas.paste(big, (0, int(round(sole0 - sole * s))))
    return np.asarray(canvas).astype(np.float32)
for i in range(1, n):
    so, _ = measure(frames[i])
    frames[i] = refit(frames[i], scales.get(i, 1.0), so)
print("height fixes:", {k: round(v, 3) for k, v in scales.items()}, file=sys.stderr)
rgba = []
balls = {}
for i, a in enumerate(frames):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    greenness = g - np.maximum(r, b)
    alpha = np.clip(1 - (greenness - 35) / 110, 0, 1)
    alpha = ndimage.median_filter(alpha, size=3)          # GIF dither speckle
    # despill: no pixel may be greener than its red/blue
    g2 = np.minimum(g, np.maximum(r, b) * 1.02)
    warm = (r - b > 45) & (g2 > r * 0.9)                    # skin edges picked up green from the screen
    g2 = np.where(warm, r * 0.82, g2)
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
    # drop leftover specks that aren't attached to him
    lab2, k2 = ndimage.label(out[..., 3] > 25)
    if k2 > 1:
        sizes = ndimage.sum(np.ones_like(lab2), lab2, range(1, k2 + 1))
        keep = np.argmax(sizes) + 1
        for j in range(1, k2 + 1):
            if j != keep and sizes[j - 1] < 400: out[lab2 == j, 3] = 0
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
