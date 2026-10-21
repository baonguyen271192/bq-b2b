# Tài liệu BQ

## Tài liệu trong git

| File | Nội dung |
|---|---|
| [`architecture.md`](architecture.md) | Kiến trúc BE/FE/Mobile, ranh giới bất biến, kế hoạch nối SAP B1 |
| [`sap-b1-mapping-proposal.md`](sap-b1-mapping-proposal.md) | Bảng ánh xạ đề xuất gửi BQ xác nhận |
| [`adr/`](adr/) | Architecture Decision Records |
| [`CORRECTIONS.md`](CORRECTIONS.md) | Đính chính các commit message sai sự thật |

Chỉ file **văn bản** nằm trong git. Mọi thứ khác lưu ngoài repo.

---

## Tài liệu nhị phân — lưu NGOÀI repo

### Vì sao không để trong git

Git lưu **trọn vẹn từng phiên bản** của file nhị phân, không diff được. Một file
`.pptx` 3,5 MB sửa 10 lần là **10 bản đầy đủ nằm vĩnh viễn** trong lịch sử. Người
clone repo phải tải hết, kể cả bản họ không bao giờ mở.

Đã loại khỏi git tại commit Phase 2 (`git rm --cached` — file vẫn còn trên máy ai
đang có sẵn, chỉ không theo dõi nữa).

> **Lưu ý quan trọng:** gỡ khỏi index **không** làm repo nhỏ lại. Các bản cũ vẫn
> nằm trong lịch sử git (`size-pack` hiện 4,77 MiB, phần lớn là file `.pptx` này).
> Muốn xoá hẳn phải rewrite history — việc này **chưa làm**, cần quyết định riêng.

### Các file đã chuyển ra ngoài

| File | Dung lượng | Nội dung |
|---|---:|---|
| `BQ-App-Web-Admin-Tinh-Nang.pptx` | 3,5 MB | 17 slide mô tả tính năng App Sỉ + Web Admin |
| `BQ-QA-Demo-Tracker.xlsx` | 8 KB | Bảng theo dõi hỏi–đáp với BQ trong quá trình chốt hợp đồng |
| `demo-videos/01-App-Si-Dat-don-qua-chat-AI.mp4` | 3,4 MB | Quay màn hình: đặt đơn qua chat AI |
| `demo-videos/02-Web-Admin-Tro-ly-AI-Sale.mp4` | 4,8 MB | Quay màn hình: trợ lý AI cho sale |

### 📍 Nơi lưu trữ

> **CHƯA ĐIỀN — cần người phụ trách repo bổ sung.**
>
> Điền đường dẫn thật vào bảng dưới rồi xoá dòng cảnh báo này.

| Hạng mục | Giá trị |
|---|---|
| Nền tảng | `__________` (vd: Google Drive / SharePoint / Dropbox) |
| Đường dẫn thư mục | `__________` |
| Ai có quyền ghi | `__________` |
| Ai có quyền đọc | `__________` |
| Quy ước đặt tên phiên bản | `__________` (vd: `BQ-Tinh-Nang_v3_2026-10-21.pptx`) |

### Quy tắc

1. **Không** `git add -f` để ép thêm file nhị phân vào repo.
2. Sửa tài liệu → cập nhật bản ở nơi lưu trữ ngoài, **không** copy ngược vào repo.
3. Tài liệu nào cần review theo commit thì viết bằng **Markdown** và để trong git.
4. Cần version hoá file nhị phân thật sự → bàn chuyển sang **Git LFS** như một
   quyết định riêng, đừng tự thêm.

### Mẫu bị chặn

```gitignore
docs/**/*.pptx   docs/**/*.xlsx   docs/**/*.docx   docs/**/*.pdf
docs/**/*.mp4    docs/**/*.mov    docs/demo-videos/
```
