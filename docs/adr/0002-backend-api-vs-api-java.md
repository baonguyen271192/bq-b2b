# ADR 0002 — Hai backend: `apps/api` (Python) và `apps/api-java` (Java)

- **Trạng thái:** 🟡 **Chờ quyết định** — phần "Quyết định" bên dưới để trống
- **Ngày lập:** 2026-10-21
- **Liên quan:** [ADR 0001](0001-monorepo-structure.md) · [`../architecture.md`](../architecture.md)

## Bối cảnh

Repo hiện có **hai** backend. Tài liệu này ghi lại vì sao, và để lại chỗ cho người
phụ trách chốt chính thức.

### Diễn biến

1. Bản demo pitch ban đầu: một backend **Python/FastAPI** phục vụ toàn bộ nghiệp vụ.
2. BQ xác nhận **team IT của họ tiếp quản bảo trì** sau bàn giao. Doanh nghiệp dùng
   SAP thường có đội Java/.NET, nên lõi nghiệp vụ được viết lại bằng
   **Java/Spring Boot** (`apps/api-java`).
3. Phần trợ lý AI — khoảng 1.000 dòng xử lý tiếng Việt (bỏ dấu, nhận diện ý định,
   phân tích hội thoại đặt đơn) cộng hai client LLM — **giữ nguyên Python**.
4. Giai đoạn đầu hai service phục vụ **cùng một bề mặt API**. Đã gỡ bỏ ở `f6360fa`:
   Python rút từ ~8.200 dòng xuống 1.260 dòng và chỉ còn 2 route.

### Trạng thái code hiện tại (đã kiểm chứng, không phải dự định)

| | `apps/api` | `apps/api-java` |
|---|---|---|
| Stack | Python 3.12 · FastAPI | Java 21 · Spring Boot 4.1.1 |
| Quy mô | 4 file · 1.264 dòng | 45 file · 3.225 dòng |
| Cổng | 8101 | 8100 |
| Route | 2 (`/api/assistant`, `/api/assistant/sale`) | 19 route nghiệp vụ |
| Tầng dữ liệu | **không có** — đọc từ Java qua `bq_client.py` | chủ sở hữu duy nhất (`ports/` + `adapters/`) |
| Nối SAP B1 | không liên quan | toàn bộ nằm ở đây |

Luồng gọi:

```
web  ──► Next rewrites ──┐
                         ├──► api-java :8100 ──/api/assistant*──► api :8101
mobile ──────────────────┘            ▲                              │
                                      └──────── bq_client ───────────┘
```

Phụ thuộc vòng tròn là **có chủ ý**: Java chuyển tiếp câu hỏi sang Python, Python
đọc ngược dữ liệu từ Java. Chặn vòng lặp bằng guard kiểm tra trùng cổng lúc khởi
động (`AssistantController`).

## Các lựa chọn

### A. Giữ nguyên hai service (hiện trạng)

- ✅ Java ở nơi cần giao dịch và tính đúng tiền; Python ở nơi cần hệ sinh thái AI.
- ✅ Không phải port 1.000 dòng xử lý tiếng Việt — việc tốn công, không đổi lại gì
  về vận hành.
- ✅ Python đã **không còn tầng dữ liệu**, nên nối SAP B1 chỉ cấu hình một nơi.
- ❌ **Bàn giao cho team IT của BQ sẽ là HAI stack, không phải một.**
- ❌ Hai service để chạy, hai thứ để giám sát, hai lịch vá bảo mật.
- ❌ Thêm một chặng mạng trên mỗi câu hỏi trợ lý (Java → Python → Java).

### B. Port trợ lý sang Java, bỏ hẳn Python

- ✅ Một stack duy nhất khi bàn giao.
- ✅ Bớt một chặng mạng và một service phải vận hành.
- ❌ Phải viết lại ~1.000 dòng xử lý tiếng Việt + 2 client LLM. [Chưa xác minh]
  khối lượng cụ thể — chưa ai ước lượng.
- ❌ Hệ sinh thái thư viện AI/NLP của Java mỏng hơn Python đáng kể.

### C. Tách trợ lý thành repo riêng

- ✅ Ranh giới sở hữu rõ ràng; BQ chỉ nhận repo Java.
- ❌ Mất khả năng đổi đồng thời khi hợp đồng API thay đổi.
- ❌ Thêm một pipeline deploy cho thứ chỉ có 4 file.

### D. Bỏ trợ lý AI khỏi phạm vi bàn giao

- ✅ Đơn giản nhất.
- ❌ Trợ lý AI là điểm khác biệt chính trong bản pitch; bỏ đi là đổi phạm vi thương mại.

## Quyết định

<!--
    ĐỂ TRỐNG CHO NGƯỜI PHỤ TRÁCH ĐIỀN.

    Chọn A / B / C / D (hoặc phương án khác) và ghi lý do.
    Nếu chọn B hoặc C, ghi kèm mốc thời gian và ai chịu trách nhiệm.

    Lưu ý khi quyết: điều ràng buộc nhất KHÔNG phải kỹ thuật mà là câu
    "team IT của BQ tiếp quản bảo trì" — xem mục Bối cảnh.
-->

_(chưa điền)_

## Hệ quả

_(điền sau khi chốt phần Quyết định)_

## Ghi chú

- Nếu chọn **A**, cần ghi rõ trong hợp đồng/biên bản bàn giao rằng sản phẩm gồm
  **hai** service với hai stack, kèm yêu cầu năng lực tương ứng của đội tiếp nhận.
- Nếu chọn **B**, nên ước lượng riêng cho `assistant.py` trước khi cam kết ngày —
  phần khó không phải gọi LLM mà là ~700 dòng logic nhận diện ý định tiếng Việt.
- Dù chọn gì, **tầng `ports/` + `adapters/` của Java không đổi**. Đó là ranh giới
  với SAP B1 và độc lập với quyết định này.
