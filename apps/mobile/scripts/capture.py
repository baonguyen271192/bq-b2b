"""Chụp một route ở đúng khổ điện thoại, tại 3 vị trí cuộn.

Nói chuyện với Chrome qua DevTools Protocol để: (1) ép đúng viewport —
`--window-size` bị bỏ qua ở chế độ headless có debug port; (2) cuộn được
ScrollView của React Native, vốn cuộn BÊN TRONG một div nên `document`
không cuộn và ảnh full-page chỉ ra được màn đầu.

Gọi qua scripts/preview-web.sh, không chạy trực tiếp.
"""
import sys, json, socket, base64, struct, os, time, urllib.request
TARGET, W, H = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
OUTDIR = sys.argv[4]
for _ in range(30):
    try:
        tabs = json.load(urllib.request.urlopen("http://127.0.0.1:9222/json"))
        ws = next((t["webSocketDebuggerUrl"] for t in tabs if t.get("type") == "page"), None)
        if ws: break
    except Exception: pass
    time.sleep(1)
hp, path = ws.split("ws://")[1].split("/", 1); host, port = hp.split(":")
s = socket.create_connection((host, int(port))); s.settimeout(60)
k = base64.b64encode(os.urandom(16)).decode()
s.send((f"GET /{path} HTTP/1.1\r\nHost: {hp}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {k}\r\nSec-WebSocket-Version: 13\r\n\r\n").encode()); s.recv(8192)
_id = 0
def send(m, p=None):
    global _id; _id += 1
    d = json.dumps({"id": _id, "method": m, "params": p or {}}).encode()
    h = bytearray([0x81]); n = len(d); mk = os.urandom(4)
    if n < 126: h.append(0x80 | n)
    elif n < 65536: h.append(0x80 | 126); h += struct.pack(">H", n)
    else: h.append(0x80 | 127); h += struct.pack(">Q", n)
    h += mk + bytes(b ^ mk[i % 4] for i, b in enumerate(d)); s.send(bytes(h)); return _id
def wait(t):
    while True:
        b = s.recv(2); n = b[1] & 127
        if n == 126: n = struct.unpack(">H", s.recv(2))[0]
        elif n == 127: n = struct.unpack(">Q", s.recv(8))[0]
        buf = b""
        while len(buf) < n: buf += s.recv(n - len(buf))
        m = json.loads(buf)
        if m.get("id") == t: return m
wait(send("Emulation.setDeviceMetricsOverride",
          {"width": W, "height": H, "deviceScaleFactor": 2, "mobile": True}))
wait(send("Page.navigate", {"url": TARGET})); time.sleep(9)
SCROLLER = """(() => {
  const all = [...document.querySelectorAll('div')]
    .filter(e => e.scrollHeight > e.clientHeight + 50 && e.clientHeight > 300);
  if (!all.length) return 'none';
  window.__sc = all[0];
  return JSON.stringify({h: window.__sc.scrollHeight, c: window.__sc.clientHeight});
})()"""
r = wait(send("Runtime.evaluate", {"expression": SCROLLER, "returnByValue": True}))
print("  scroller:", r["result"]["result"]["value"])
for i, frac in enumerate([0.0, 0.45, 1.0]):
    wait(send("Runtime.evaluate", {
        "expression": f"window.__sc.scrollTop = (window.__sc.scrollHeight - window.__sc.clientHeight) * {frac}; 1",
        "returnByValue": True}))
    time.sleep(1.5)
    img = wait(send("Page.captureScreenshot", {"format": "png"}))["result"]["data"]
    p = f"{OUTDIR}/sc-{i}.png"
    open(p, "wb").write(base64.b64decode(img)); print(f"  {p} (scroll {int(frac*100)}%)")
