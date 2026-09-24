# Thiết kế Bot Đa Kênh (Zalo + Facebook) — Tư vấn (RAG) + Đặt đơn (Commerce)

> **Mục tiêu:** Một nền tảng, mỗi cửa hàng một bot, chạy được trên **cả Zalo lẫn Facebook**, và mỗi bot vừa **tư vấn (RAG hỏi–đáp)** vừa **chốt đơn (đặt hàng giao dịch)**.
>
> Kiến trúc đã chốt: **giữ 2 "bộ não", hợp nhất ở TẦNG KÊNH** (không đập đi làm lại). Ngày lập: 16/09/2026.

---

## 1. Hai bộ não sẵn có (tái dùng, không viết lại)

| Brain | Repo hiện tại | Ngôn ngữ | Việc |
|---|---|---|---|
| **RAG** (tư vấn) | `zalo-rag-bot/backend` | Node/Express + LanceDB + OpenRouter | Trả lời từ tài liệu: menu, giờ mở, địa chỉ, đặt bàn. REST `/tenants/:id/ask`. |
| **Commerce** (đặt đơn) | `BQ/backend` | Python/FastAPI | Giỏ hàng → thu thông tin giao → chốt đơn → lưu DB. Đã đa cửa hàng (`store_id`, `business_type`). |

Cả hai **đã đa tenant**. Điểm yếu: mỗi bên mới mạnh 1 kênh (RAG→Zalo, Commerce→Facebook). Ta hợp nhất kênh.

---

## 2. Kiến trúc tổng thể

```
  Zalo (bridge zca-js) ─┐                                   ┌─► RAG backend (/ask)     [Node, sẵn có]
                        │                                   │
                        ├─►  CHANNEL GATEWAY  ─► BRAIN ROUTER┤
                        │    - chuẩn hoá tin      - theo config
  Facebook (webhook) ───┘    - gửi trả theo kênh    tenant + ý định
                             - session hội thoại              └─► Commerce engine (/message) [Python, sẵn có]
```

**Nguyên tắc:** kênh chỉ lo NHẬN–GỬI; brain chỉ lo NỘI DUNG; gateway nối hai bên qua một **"phong bì tin" chuẩn (channel-neutral envelope)**.

---

## 3. Phong bì tin chuẩn (envelope)

Mọi adapter kênh chuyển tin về cùng một dạng, và nhận lại cùng một dạng:

```jsonc
// INBOUND (adapter → gateway)
{ "tenant_id": "chao", "channel": "facebook|zalo",
  "sender_id": "<psid | zalo-userid>", "text": "cho 2 tô cháo nghêu",
  "attachments": [ { "type": "image", "url": "data:..." } ] }

// OUTBOUND (brain → gateway → adapter)
{ "messages": [
    { "type": "text", "text": "...", "quick_replies": [ {"title":"...","payload":"..."} ] },
    { "type": "cards", "elements": [ {"title","subtitle","image_url","buttons":[...]} ] },
    { "type": "image", "url": "..." }
] }
```

- Commerce engine đã trả gần đúng dạng này (`handle()` → list message text/generic). Chỉ cần chuẩn hoá tên trường.
- RAG trả `{answer, attachments[]}` → gateway bọc thành `messages`.

---

## 4. Channel adapter (thêm kênh = thêm 1 module)

| | Zalo | Facebook |
|---|---|---|
| Nhận | `zca-js` listener (đã có ở `bridge/`) | **Webhook** `/webhook` (đã có ở BQ — chuyển vào adapter) |
| Gửi | `api.sendMessage` | **Send API** (đã có ở BQ `messenger.py`) |
| Map format | text/ảnh; quick-reply → Zalo? (giới hạn) | text/quick_replies/generic carousel (đầy đủ) |
| Định danh | `conversationId` + ThreadType | `page_id` → tenant, `psid` |

**Việc mới:** viết **Facebook adapter** theo khuôn `bridge/` của Zalo (webhook + Send API). Zalo adapter giữ nguyên. Mỗi adapter map "phong bì" ↔ định dạng gốc của kênh (ví dụ carousel FB ↔ danh sách text trên Zalo nếu Zalo không hỗ trợ card).

---

## 5. Brain router — kết hợp Tư vấn + Đặt đơn

Vì mỗi bot cần **cả hai**, router quyết định mỗi tin đi về đâu:

1. **Ưu tiên trạng thái hội thoại**: nếu khách đang trong luồng đặt đơn (chọn size/phần, nhập địa chỉ, chờ thanh toán) → **Commerce** (giữ mạch đơn).
2. **Ý định đặt hàng** (bấm nút menu/giỏ, "đặt", "cho 2 tô", mã món) → **Commerce**.
3. **Còn lại (hỏi tự do)** → **RAG** (menu, giờ, địa chỉ, ship, tư vấn).
4. **Bắc cầu**: RAG khi phát hiện khách muốn mua → trả kèm nút "🛒 Đặt món" (payload) đẩy sang Commerce; Commerce khi khách hỏi ngoài luồng → gọi RAG trả lời rồi kéo về nút đặt.

→ Session hội thoại khoá theo **(tenant, channel, sender)** để 2 brain chia sẻ ngữ cảnh.

---

## 6. Mô hình cấu hình tenant (hợp nhất)

Mở rộng khái niệm tenant/store hiện có, thêm chiều **kênh** + **năng lực**:

```jsonc
{ "tenant_id": "chao", "name": "Cháo Nghêu O Hoèn",
  "business_type": "food",
  "capabilities": ["rag", "commerce"],          // bật/tắt từng brain
  "channels": {
    "facebook": { "page_id": "...", "page_token": "..." },
    "zalo":     { "account": "...", "session": "qr-login" }
  },
  "rag":      { "documents": [...], "system_prompt": "..." },   // → RAG backend
  "commerce": { "menu": [...], "policies": {...}, "unit": "phần" } // → Commerce engine
}
```

- Trang **Quản lý Bot** (đã dựng ở BQ `/bots`) nâng cấp thành console chung: khai báo kênh, bật RAG/Commerce, quản tài liệu (RAG) + menu (Commerce).

---

## 7. Nơi đặt code & tách nguồn

- **Gateway** đặt trong `zalo-rag-bot` (Node) — vì `bridge/` Zalo đã ở đó; thêm `bridge/facebook` + `gateway/`.
- **Commerce engine (BQ Python)** tách thành **service độc lập** phơi API `POST /message` (đầu vào envelope, đầu ra messages) + `GET/POST cấu hình store`. Bỏ phụ thuộc frontend BQ; giữ engine + stores + store(DB).
- **RAG backend** giữ nguyên.
- Gateway gọi 2 service qua HTTP nội bộ. Polyglot, mỗi bên deploy riêng.

---

## 8. Lộ trình triển khai

**GĐ 1 — Tách Commerce thành service**: đóng gói `engine + assistant + stores + store` sau API `POST /message` (envelope). Bỏ chỗ dính frontend.
**GĐ 2 — Facebook adapter trong gateway**: webhook + Send API (port từ BQ `main.py`/`messenger.py`), map envelope.
**GĐ 3 — Brain router + session chung**: định tuyến Commerce/RAG theo mục 5; session theo (tenant,channel,sender).
**GĐ 4 — Zalo cho Commerce**: cho luồng đặt đơn chạy trên Zalo qua adapter Zalo (map card→text).
**GĐ 5 — Console cấu hình chung**: nâng `/bots` để khai báo kênh + capabilities + tài liệu + menu.

Mỗi GĐ chạy độc lập, không gãy bên nào đang chạy.

---

## 9. Rủi ro & lưu ý

| Rủi ro | Giảm thiểu |
|---|---|
| Zalo (zca-js) là client KHÔNG chính thức, dễ đổi/khoá | Cô lập trong adapter; lỗi 1 kênh không ảnh hưởng kênh khác |
| Card/carousel FB không có trên Zalo | Adapter Zalo hạ cấp card → danh sách text + link |
| 2 service khác ngôn ngữ | Hợp đồng qua envelope JSON ổn định; versioning |
| Session chia sẻ giữa 2 brain | Khoá (tenant,channel,sender); Commerce giữ trạng thái đơn, RAG stateless |
| Đụng repo zalo-rag-bot (có git riêng) | Làm trên nhánh mới; không sửa lõi RAG, chỉ thêm gateway/adapter |

---

*Bản thiết kế — cần bạn duyệt trước khi bắt tay Giai đoạn 1.*
