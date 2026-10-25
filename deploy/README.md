# Server renderer fallback

GitHub Actions hosted runners can be blocked by account-level billing settings. For zero incremental spend, an existing Debian server can render scripts prepared by Cloudflare Workers and stored in D1. This uses an already paid server and is not literally cost-free infrastructure.

- Systemd service: /etc/systemd/system/lyco-render.service
- Systemd timer: /etc/systemd/system/lyco-render.timer
- Program: /opt/lyco-autonomy-renderer/render.py
- Persistent output: /var/lib/lyco-autonomy-renderer/output/
- Independent service user: lyco-render

Install ffmpeg, python3-pil and fonts-noto-cjk. Check the timer with systemctl list-timers lyco-render.timer. Check logs with journalctl -u lyco-render.service. It creates an original silent text-only MP4 from the latest public /feed draft and skips duplicates. It does not send to Bilibili.

The root login session is for setup only; the service itself runs as the unprivileged lyco-render user under filesystem, CPU and memory restrictions.
