"""
依「亮色 → 莫蘭迪低明度」對映，把 assets/ 內的 PNG 重新著色，輸出到 assets/dim/。

實作邏輯：
  1. 把每張 PNG 從 RGB 轉到 HLS（色相/亮度/飽和度）
  2. 把所有非透明像素的飽和度降到原本的 35%
  3. 把亮度往「米白」方向拉（mix 30% 米白）
  4. 透明度（alpha）保留

這樣會得到「同形狀、同細節，但色彩變柔和、偏粉霧」的版本。
"""
import os
from PIL import Image
import colorsys

# 路徑
HERE     = os.path.dirname(os.path.abspath(__file__))
ASSETS   = os.path.join(HERE, "..", "assets")
OUT_DIR  = os.path.join(ASSETS, "dim")
os.makedirs(OUT_DIR, exist_ok=True)

# 米白（PAL_DIM.white = #FBF6F0）
CREAM = (251, 246, 240)
MIX   = 0.30      # 混入米白的比例
SAT   = 0.35      # 飽和度保留比例

def desaturate_pixel(r, g, b, a):
    if a == 0:
        return (r, g, b, a)
    # 1) HLS 降飽和
    rr, gg, bb = r / 255.0, g / 255.0, b / 255.0
    h, l, s = colorsys.rgb_to_hls(rr, gg, bb)
    s = s * SAT
    rr, gg, bb = colorsys.hls_to_rgb(h, l, s)
    r2, g2, b2 = int(rr * 255), int(gg * 255), int(bb * 255)
    # 2) 混入米白（往更柔和方向）
    r3 = int(r2 * (1 - MIX) + CREAM[0] * MIX)
    g3 = int(g2 * (1 - MIX) + CREAM[1] * MIX)
    b3 = int(b2 * (1 - MIX) + CREAM[2] * MIX)
    return (r3, g3, b3, a)

def process(in_path, out_path):
    img = Image.open(in_path).convert("RGBA")
    pixels = img.load()
    w, h = img.size
    for x in range(w):
        for y in range(h):
            pixels[x, y] = desaturate_pixel(*pixels[x, y])
    img.save(out_path, "PNG")
    print(f"  -> {os.path.basename(out_path)}")

def main():
    pngs = [
        f for f in os.listdir(ASSETS)
        if f.endswith(".png") and not f.startswith(".")
    ]
    print(f"Processing {len(pngs)} PNGs from {ASSETS}")
    for name in pngs:
        in_path  = os.path.join(ASSETS, name)
        out_path = os.path.join(OUT_DIR, name)
        process(in_path, out_path)
    print(f"\nDone! Dim assets in: {OUT_DIR}")

if __name__ == "__main__":
    main()
