# BQ B2B — Web/App đại lý (bán sỉ)

Hệ thống đặt đơn sỉ cho đại lý **Giày BQ**: chọn giày → nhập số lượng theo bảng
size → đơn nháp (giá sỉ theo bậc, chiết khấu, trừ hạn mức) → giao/thanh toán →
kiểm hạn mức công nợ (trong hạn mức: chốt luôn; vượt: chờ duyệt) → sinh mã đơn
→ tra trạng thái. Có Web dashboard (sale/quản lý) + App di động cho đại lý +
trợ lý AI (đại lý & sale).

> ⚠️ **Demo dữ liệu mẫu** (`backend/app/data.py`, `catalog.py`) — chưa nối ERP.
> Giá/tồn/công nợ là số minh hoạ.
>
> Bot bán lẻ Facebook (khách vãng lai) đã tách thành service **Commerce** độc
> lập, đa cửa hàng/đa ngành — xem `../zalo-rag-bot/commerce`. Repo này (`BQ`)
> giờ chỉ còn nghiệp vụ B2B sỉ của riêng BQ.

## Kiến trúc

```
Web dashboard (Next.js) ─┐
                         ├─►  /api/*  ─►  api.py  ─►  store.py (SQLite) + data.py (catalog/đại lý)
App đại lý (mobile) ─────┘                              │
                                                          └─► assistant.py (trợ lý AI đại lý + sale)
```

- `backend/app/data.py` + `catalog.py` — dữ liệu mẫu: đại lý, bậc giá, sản phẩm + bảng size, hạn mức.
- `backend/app/store.py` — kho đơn sỉ (SQLite).
- `backend/app/assistant.py` — trợ lý AI cho đại lý (`answer`) và sale/quản lý (`answer_sale`).
- `backend/app/api.py` + `main.py` — REST API cho Web/App.
- `frontend/` — Next.js: `/admin/*` (dashboard sale/quản lý) + `/(shop)` (App đại lý).

## Chạy thử

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # điền GROQ_API_KEY để bật trợ lý AI (không bắt buộc)
uvicorn app.main:app --host 127.0.0.1 --port 8100

cd ../frontend
npm install
npm run build && npm run start   # hoặc npm run dev khi phát triển
```

Đại lý mẫu: `DL001` (Vàng, hạn mức lớn), `DL002` (Bạc, gần chạm hạn mức — dễ thấy luồng
"vượt hạn mức → chờ duyệt"), `DL003` (Kim Cương).

## Hoá thật sau này

Thay `data.py`/`catalog.py` bằng lời gọi API ERP/CRM (danh mục, tồn kho, giá theo
đại lý, hạn mức, ghi đơn). Luồng trong `api.py`/`assistant.py` giữ nguyên. Đổi
SQLite sang DB thật khi cần.
