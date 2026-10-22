"""Chụp một route ở đúng khổ điện thoại, tại 3 vị trí cuộn.

Tham số thứ 5 (tuỳ chọn): các nhãn cần BẤM trước khi chụp, ngăn bằng "|" và bấm
theo thứ tự. Dùng để qua màn đăng nhập rồi đi sâu vào tab/màn con — phiên làm
việc chỉ nằm trong bộ nhớ nên không seed sẵn được, mà `simctl` thì không chạm
được nút nào.

  "Nhận mã OTP"                      -> chỉ đăng nhập
  "Nhận mã OTP|Sản phẩm"             -> đăng nhập rồi sang tab Sản phẩm

Bước bắt đầu bằng `type:` thì GÕ chữ thay vì bấm, dạng `type:<aria-label>=<chữ>`:
  "Nhận mã OTP|Sản phẩm|type:Tìm sản phẩm=xyzzy"

Nói chuyện với Chrome qua DevTools Protocol để: (1) ép đúng viewport —
`--window-size` bị bỏ qua ở chế độ headless có debug port; (2) cuộn được
ScrollView của React Native, vốn cuộn BÊN TRONG một div nên `document`
không cuộn và ảnh full-page chỉ ra được màn đầu.

Gọi qua scripts/preview-web.sh, không chạy trực tiếp.
"""
import sys, json, socket, base64, struct, os, time, urllib.request
TARGET, W, H = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
OUTDIR = sys.argv[4]
CLICKS = sys.argv[5].split("|") if len(sys.argv) > 5 and sys.argv[5] else []
ws = None
for _ in range(30):
    try:
        tabs = json.load(urllib.request.urlopen("http://127.0.0.1:9222/json"))
        ws = next((t["webSocketDebuggerUrl"] for t in tabs if t.get("type") == "page"), None)
        if ws: break
    except Exception: pass
    time.sleep(1)
# Báo lỗi tường minh thay vì để `ws` không tồn tại rồi ném NameError ở dòng sau —
# thông báo đó không nói được gì về nguyên nhân thật (Chrome chưa chiếm được
# cổng gỡ rối vì tiến trình cũ chưa nhả).
if not ws:
    sys.exit("capture: không thấy trang nào ở 127.0.0.1:9222 sau 30s — "
             "Chrome chưa khởi động xong, hoặc cổng còn bị tiến trình cũ giữ.")
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
    """Đọc khung tới khi gặp đúng phản hồi của lệnh `t`; bỏ qua sự kiện CDP."""
    while True:
        b = s.recv(2); n = b[1] & 127
        if n == 126: n = struct.unpack(">H", s.recv(2))[0]
        elif n == 127: n = struct.unpack(">Q", s.recv(8))[0]
        buf = b""
        while len(buf) < n: buf += s.recv(n - len(buf))
        m = json.loads(buf)
        if m.get("id") == t: return m
# Headless không có cửa sổ được hệ điều hành focus, nên `document.hasFocus()` là
# false và `el.focus()` thành lệnh rỗng — ô nhập không bao giờ nhận được chữ.
wait(send("Emulation.setFocusEmulationEnabled", {"enabled": True}))

wait(send("Emulation.setDeviceMetricsOverride",
          {"width": W, "height": H, "deviceScaleFactor": 2, "mobile": True}))
wait(send("Page.navigate", {"url": TARGET}))

def evaluate(js):
    return wait(send("Runtime.evaluate", {"expression": js, "returnByValue": True})) \
        ["result"]["result"].get("value")

def wait_for(js, what, timeout=40):
    """Chờ tới khi biểu thức trả về true. Trả False nếu hết hạn."""
    for _ in range(timeout * 2):
        try:
            if evaluate(js) is True: return True
        except Exception: pass
        time.sleep(0.5)
    print(f"   HẾT HẠN chờ: {what}")
    return False

# Chờ app vẽ xong thay vì ngủ một khoảng cố định. Ngủ cứng 9 giây là nguồn
# flake chính: máy đang bận (export song song, Chrome khác) thì chưa kịp vẽ,
# bước bấm sau đó không thấy nút và cả lượt chụp hỏng mà không rõ vì sao.
wait_for("document.body.innerText.trim().length > 20", "app vẽ xong")

SET_JS = """(() => {
  const [label, text] = %s;
  const all = [...document.querySelectorAll('[aria-label="' + label + '"]')];
  const el = all.find((e) => e.getBoundingClientRect().width > 0) || all[0];
  if (!el) return 'không thấy';
  const proto = el.tagName === 'TEXTAREA'
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, text);
  el.dispatchEvent(new Event('input', {bubbles: true}));
  return 'ok';
})()"""

SCROLL_JS = """(() => {
  const [label] = %s;
  const all = [...document.querySelectorAll('[aria-label="' + label + '"]')];
  const el = all.find((e) => e.getBoundingClientRect().width > 0) || all[0];
  if (!el) return 'không thấy';
  el.scrollIntoView({block: 'center'});
  return 'ok';
})()"""

# Đo toạ độ ở LẦN GỌI KHÁC, sau khi đã cuộn: đo ngay trong cùng một lượt thì
# rect vẫn là vị trí trước khi cuộn, và cú bấm rơi vào chỗ trống.
RECT_JS = """(() => {
  const [label] = %s;
  const all = [...document.querySelectorAll('[aria-label="' + label + '"]')];
  if (!all.length) return null;
  // Nhiều node cùng aria-label: màn trước vẫn còn gắn trong Stack, và node của
  // nó có kích thước 0. Lấy node THẤY ĐƯỢC chứ không lấy node đầu tiên.
  const el = all.find((e) => e.getBoundingClientRect().width > 0) || all[0];
  const r = el.getBoundingClientRect();
  const mid = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return JSON.stringify({
    x: r.x + r.width / 2, y: r.y + r.height / 2,
    covered: mid !== el && !el.contains(mid),
    tag: (mid && mid.tagName) || 'none',
  });
})()"""

for CLICK in CLICKS:
    if CLICK.startswith("type:"):
        label, _, text = CLICK[len("type:"):].partition("=")
        # Gán thẳng `el.value` rồi bắn `input` KHÔNG ăn với react-native-web: DOM
        # nhận chữ nhưng React vẫn áp lại `value` cũ của prop, nên state không đổi
        # (đã đo: probe trả về đúng chữ mà màn vẫn hiện placeholder). Phải gõ ở
        # tầng trình duyệt bằng `Input.insertText`, đúng đường mà bàn phím thật đi.
        wait(send("Runtime.evaluate",
                  {"expression": SCROLL_JS % json.dumps([label]), "returnByValue": True}))
        time.sleep(0.5)
        r = wait(send("Runtime.evaluate",
                      {"expression": RECT_JS % json.dumps([label]), "returnByValue": True}))
        rect = r["result"]["result"].get("value")
        if not rect:
            print(f"   KHÔNG thấy ô nhập: {label}")
            continue
        # `el.focus()` là lệnh rỗng ở headless; phải BẤM CHUỘT THẬT vào ô thì
        # trình duyệt mới đặt tiêu điểm, rồi `insertText` mới có đích để đi vào.
        pt = json.loads(rect)
        if pt.get("covered"):
            print(f"      ô bị che bởi <{pt['tag']}> tại ({pt['x']:.0f},{pt['y']:.0f})")
        for kind in ("mousePressed", "mouseReleased"):
            wait(send("Input.dispatchMouseEvent", {
                "type": kind, "x": pt["x"], "y": pt["y"],
                "button": "left", "clickCount": 1,
            }))
        time.sleep(0.4)
        # Gõ bằng CẢ hai đường: `insertText` (bàn phím thật) rồi setter gốc +
        # sự kiện `input`. react-native-web 0.21 không nhận đường thứ nhất ở mọi
        # ô, nên giữ cả hai thay vì đoán xem ô nào ăn đường nào.
        act = wait(send("Runtime.evaluate", {
            "expression": "(() => { const a = document.activeElement;"
                          " return (a && (a.getAttribute('aria-label') || a.tagName)) || 'none'; })()",
            "returnByValue": True}))["result"]["result"].get("value")
        wait(send("Input.insertText", {"text": text}))
        got = wait(send("Runtime.evaluate", {
            "expression": SET_JS % json.dumps([label, text]), "returnByValue": True,
        }))["result"]["result"].get("value")
        print(f"      focus={act} set={got}")
        print(f'   đã gõ "{text}" vào {label}')
        time.sleep(1.5)
        continue
    # Bấm theo NHÃN CHỮ, không theo selector: react-native-web sinh class ngẫu
    # nhiên nên selector vỡ ở mỗi lần build. Bắn `click` lên chính node chứa chữ
    # rồi lên các node cha — RNW gắn handler ở lớp Pressable bọc ngoài.
    JS = """(() => {
      const want = %s;
      // Khớp theo CHỮ trước, rồi mới tới aria-label: nút chỉ có icon (FAB trợ
      // lý, nút gửi) không có textContent nào để khớp, nhưng
      // react-native-web dựng `accessibilityLabel` thành `aria-label`.
      let hit = [...document.querySelectorAll('div,span,a')]
        .filter(e => (e.textContent || '').trim() === want)
        .pop();
      let exact = false;
      if (!hit) { hit = document.querySelector('[aria-label="' + want + '"]'); exact = !!hit; }
      if (!hit) return 'KHÔNG thấy nút: ' + want;
      // Khớp bằng CHỮ thì phải lan lên cha, vì handler nằm ở lớp Pressable bọc
      // ngoài node chứa chữ. Khớp bằng aria-label thì KHÔNG: chính node đó đã là
      // Pressable, lan lên cha sẽ kích hoạt luôn thẻ bao ngoài — đã chụp nhầm
      // một lần, nút "Đặt nhanh" mở sheet rồi thẻ cha điều hướng sang màn khác.
      let n = hit;
      for (let i = 0; i < (exact ? 1 : 5) && n; i++) {
        n.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
        n = n.parentElement;
      }
      return 'đã bấm: ' + want;
    })()""" % json.dumps(CLICK)
    # Chờ nút xuất hiện rồi mới bấm — màn trước có thể còn đang nạp dữ liệu.
    present = ("(() => { const w = %s;"
               " return [...document.querySelectorAll('div,span,a')]"
               ".some(e => (e.textContent || '').trim() === w)"
               " || !!document.querySelector('[aria-label=\"' + w + '\"]'); })()") % json.dumps(CLICK)
    wait_for(present, f'nút "{CLICK}"')
    r = wait(send("Runtime.evaluate", {"expression": JS, "returnByValue": True}))
    print("  ", r["result"]["result"]["value"])
    time.sleep(2.5)

# Chọn vùng cuộn CAO NHẤT, không phải cái đầu tiên tìm thấy: react-native-web
# lồng nhiều div cuộn được, và cái đầu tiên theo thứ tự DOM thường là khung
# ngoài chỉ cuộn được vài chục pixel. Lấy nhầm nó thì ảnh "cuối trang" giống hệt
# ảnh "đầu trang" — đã gặp đúng vậy với danh sách 258 sản phẩm.
SCROLLER = """(() => {
  const all = [...document.querySelectorAll('div')]
    .filter(e => e.scrollHeight > e.clientHeight + 50 && e.clientHeight > 300);
  if (!all.length) return 'none';
  window.__sc = all.sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
  return JSON.stringify({h: window.__sc.scrollHeight, c: window.__sc.clientHeight});
})()"""
r = wait(send("Runtime.evaluate", {"expression": SCROLLER, "returnByValue": True}))
print("  scroller:", r["result"]["result"]["value"])
# Splash chạy ~2,4s rồi mới thoát. Chụp sớm hơn thì ảnh đầu dính splash, và tệ
# hơn: lớp nền của splash là absolute nên trên web nó CUỘN THEO nội dung, để lại
# một mảng cam ở đầu những ảnh sau. Chờ cho nó thoát hẳn.
time.sleep(float(os.environ.get("BQ_SETTLE", "5")))

# Số vị trí cuộn lấy từ env: trang showcase cao 7000px thì 3 ảnh bỏ sót quá
# nhiều, còn một màn thường thì 3 là đủ.
FRACS = [float(x) for x in os.environ.get("BQ_SHOTS", "0,0.45,1").split(",")]
for i, frac in enumerate(FRACS):
    wait(send("Runtime.evaluate", {
        "expression": f"window.__sc.scrollTop = (window.__sc.scrollHeight - window.__sc.clientHeight) * {frac}; 1",
        "returnByValue": True}))
    time.sleep(1.5)
    img = wait(send("Page.captureScreenshot", {"format": "png"}))["result"]["data"]
    p = f"{OUTDIR}/sc-{i}.png"
    open(p, "wb").write(base64.b64decode(img)); print(f"  {p} (scroll {int(frac*100)}%)")
