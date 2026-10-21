#!/usr/bin/env bash
#
# Soi giao diện bằng bản export web, chụp ở đúng khổ điện thoại.
#
# Vì sao không dùng máy ảo iOS: `simctl` không chạm/vuốt được, nên không cuộn
# tới phần dưới màn hình. Bản web cuộn được bằng JS qua DevTools Protocol, và
# cho đúng viewport 393×852 — khổ iPhone 15/16/17 Pro.
#
# Dùng:
#   ./scripts/preview-web.sh /_dev/ui            # showcase component
#   ./scripts/preview-web.sh "/(tabs)" 393 852   # một màn cụ thể
#   ./scripts/preview-web.sh / 393 852 "Nhận mã OTP"   # bấm nút rồi mới chụp
#
# Ảnh ra: /tmp/bq-preview/sc-{0,1,2}.png (đầu trang / giữa / cuối)

set -euo pipefail
cd "$(dirname "$0")/.."

ROUTE="${1:-/_dev/ui}"
W="${2:-393}"
H="${3:-852}"
PORT=8777
OUT=/tmp/bq-preview
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

[ -x "$CHROME" ] || { echo "Cần Google Chrome để chụp."; exit 1; }
mkdir -p "$OUT"

echo "[preview] export web…"
rm -rf dist-web
EXPO_PUBLIC_API_BASE="${EXPO_PUBLIC_API_BASE:-http://localhost:8100}" \
  npx expo export -p web --output-dir dist-web > /tmp/bq-export.log 2>&1 \
  || { tail -20 /tmp/bq-export.log; exit 1; }

echo "[preview] phục vụ tại :$PORT"
# Giải phóng cổng theo CỔNG, không theo tên tiến trình: server dưới đây chạy bằng
# `python3 - <args>` nên dòng lệnh của nó chỉ là "Python - <dir> <port>" —
# `pkill -f "bq-spa-server"` không bao giờ khớp vì chuỗi đó nằm trong thân
# script. Đã mất một vòng chụp vì server cũ giữ cổng và bind hỏng im lặng.
lsof -ti "tcp:$PORT" 2>/dev/null | xargs -r kill -9 2>/dev/null || true
python3 - "$PWD/dist-web" "$PORT" <<'PY' &
import http.server, os, sys
root, port = sys.argv[1], int(sys.argv[2])
class H(http.server.SimpleHTTPRequestHandler):      # bq-spa-server
    def __init__(self, *a, **k): super().__init__(*a, directory=root, **k)
    def do_GET(self):
        p = self.path.split("?")[0].lstrip("/")
        if p and not os.path.exists(os.path.join(root, p)): self.path = "/index.html"
        return super().do_GET()
    def log_message(self, *a): pass
http.server.HTTPServer(("127.0.0.1", port), H).serve_forever()
PY
sleep 2

lsof -ti tcp:9222 2>/dev/null | xargs -r kill -9 2>/dev/null || true
"$CHROME" --headless --disable-gpu --hide-scrollbars \
  --remote-debugging-port=9222 about:blank > /dev/null 2>&1 &
sleep 2

python3 scripts/capture.py "http://127.0.0.1:$PORT$ROUTE" "$W" "$H" "$OUT" ${4:+"$4"}

lsof -ti tcp:9222 2>/dev/null | xargs -r kill -9 2>/dev/null || true
lsof -ti "tcp:$PORT" 2>/dev/null | xargs -r kill -9 2>/dev/null || true
echo "[preview] xong: $OUT"
