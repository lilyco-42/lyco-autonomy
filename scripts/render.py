"""Render a small original silent draft from the cloud planner. No auto publishing."""
import hashlib
import json
import os
import pathlib
import subprocess
import sys
import textwrap
import urllib.error
import urllib.request

OUTPUT = pathlib.Path("output")
FONTS = [
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
    "C:/Windows/Fonts/msyh.ttc",
]

def get_draft():
    url = os.environ.get("LYCO_WORKER_URL", "").rstrip("/")
    if not url:
        raise RuntimeError("Missing LYCO_WORKER_URL")
    request = urllib.request.Request(url + "/feed", headers={"Accept":"application/json", "User-Agent":"Mozilla/5.0 (compatible; LycoRenderer/1.0)"})
    with urllib.request.urlopen(request, timeout=20) as response:
        body = json.load(response)
    draft = body.get("draft")
    if not draft:
        raise RuntimeError("Cloud feed has no ready draft")
    return draft

def wrap_cjk(text, limit=23, lines=8):
    words = text.replace("\r", "").replace("\n", " ")
    pieces = [words[i:i+limit] for i in range(0, len(words), limit)]
    return "\n".join(pieces[:lines])

def main():
    from PIL import Image, ImageDraw, ImageFont
    OUTPUT.mkdir(exist_ok=True)
    draft = get_draft()
    title = draft["title"]
    script = draft["script"]
    digest = hashlib.sha256((draft.get("created_at", "") + title + script).encode("utf-8")).hexdigest()[:12]
    video = OUTPUT / ("lyco-" + digest + ".mp4")
    if video.exists():
        print(json.dumps({"title": title, "video": str(video), "state":"already_rendered"}, ensure_ascii=False))
        return
    font_path = next((x for x in FONTS if pathlib.Path(x).exists()), None)
    if not font_path:
        raise RuntimeError("CJK font is not installed on runner")
    title_font = ImageFont.truetype(font_path, 72)
    body_font = ImageFont.truetype(font_path, 47)
    small_font = ImageFont.truetype(font_path, 34)

    # Four concise scenes, deliberately not claiming a finished original animation.
    sections = [
        ("LYCO · AUTONOMY", title),
        ("01 / TODAY", script[:105]),
        ("02 / EXPERIMENT", script[105:210] or script[:105]),
        ("03 / NEXT", script[210:310] or "请继续关注下一次实验。"),
    ]
    for i, (heading, body) in enumerate(sections):
        canvas = Image.new("RGB", (1280, 720), "#101015")
        d = ImageDraw.Draw(canvas)
        d.rectangle((72, 74, 90, 646), fill="#D34155")
        d.text((130, 82), heading, font=small_font, fill="#C8C8D0")
        if i == 0:
            d.multiline_text((130, 240), wrap_cjk(body, 14, 3), font=title_font,
                             fill="#FFFFFF", spacing=18)
        else:
            d.multiline_text((130, 195), wrap_cjk(body, 25, 7), font=body_font,
                             fill="#FFFFFF", spacing=16)
        d.text((130, 615), "虚构原创 AI 角色 · 内容由自动化系统生成", font=small_font, fill="#91919B")
        canvas.save(OUTPUT / f"{i:02d}.png")

    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-framerate", "1/7", "-i", str(OUTPUT / "%02d.png"),
        "-vf", "fps=25,format=yuv420p", "-c:v", "libx264", "-preset", "veryfast",
        "-crf", "27", "-movflags", "+faststart", str(video)
    ], check=True, timeout=180)
    print(json.dumps({"title": title, "video": str(video),
                     "bytes": video.stat().st_size, "source": "Cloudflare D1 draft"}, ensure_ascii=False))

if __name__ == "__main__":
    main()
