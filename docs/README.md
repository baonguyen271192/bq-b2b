# Tài liệu BQ

## Trong git

| File | Nội dung |
|---|---|
| [`architecture.md`](architecture.md) | Kiến trúc BE/FE/Mobile, ranh giới bất biến, kế hoạch nối SAP B1 |
| [`sap-b1-mapping-proposal.md`](sap-b1-mapping-proposal.md) | Bảng ánh xạ đề xuất gửi BQ xác nhận |
| [`adr/`](adr/) | Architecture Decision Records |
| [`CORRECTIONS.md`](CORRECTIONS.md) | Đính chính các commit message sai sự thật |

**Chỉ file văn bản nằm trong git.** Lý do: git lưu trọn vẹn từng phiên bản của file
nhị phân và không diff được — một `.pptx` 3,5 MB sửa 10 lần là 10 bản đầy đủ nằm
vĩnh viễn trong lịch sử, người clone phải tải hết.

```gitignore
docs/**/*.pptx   docs/**/*.xlsx   docs/**/*.docx   docs/**/*.pdf
docs/**/*.mp4    docs/**/*.mov    docs/demo-videos/
```

---

## Tài liệu nhị phân — hiện ở đâu

> ⚠️ **Chưa có kho lưu trữ dùng chung.** Mỗi file đang ở một chỗ khác nhau, mô tả
> bên dưới. Đây là rủi ro còn mở, không phải trạng thái mong muốn.

### Slide & bảng tính — chỉ còn trong lịch sử git

| File | Dung lượng | Trạng thái |
|---|---:|---|
| `BQ-App-Web-Admin-Tinh-Nang.pptx` | 3,5 MB | **không còn trên đĩa** |
| `BQ-QA-Demo-Tracker.xlsx` | 8 KB | **không còn trên đĩa** |

Hai file này bị gỡ khỏi git ở commit `8ec3baa`. Lúc đó `git rm --cached` giữ chúng
trên đĩa, **nhưng khi merge sang `main`** — nơi chúng vẫn đang được track — git xoá
luôn khỏi thư mục làm việc. `.gitignore` không khôi phục lại.

**Lấy lại bất cứ lúc nào** (blob vẫn nguyên trong lịch sử):

```bash
git show f6360fa:docs/BQ-App-Web-Admin-Tinh-Nang.pptx > bq-tinh-nang.pptx
git show f6360fa:docs/BQ-QA-Demo-Tracker.xlsx        > bq-qa-tracker.xlsx
```

### Video demo — chỉ còn trên máy một người

| File | Dung lượng |
|---|---:|
| `01-App-Si-Dat-don-qua-chat-AI.mp4` | 3,3 MB |
| `02-Web-Admin-Tro-ly-AI-Sale.mp4` | 4,7 MB |

Đã chuyển ra `~/Downloads/BQ-demo-videos/` trên máy người phụ trách repo.

> **Hai file này CHƯA TỪNG vào git.** Không có bản nào trong lịch sử, không có bản
> sao ở nơi khác (đã tìm `~/Desktop`, `~/Downloads`, `~/Documents`, `~/Movies`).
> Xoá đi là mất hẳn. Nếu còn giá trị cho việc chốt hợp đồng, **sao lên nơi lưu trữ
> ngoài sớm**.

---

## Kho lưu trữ dùng chung

| Hạng mục | Giá trị |
|---|---|
| Nền tảng | **TODO: chưa có kho lưu trữ** |
| Đường dẫn thư mục | **TODO: chưa có kho lưu trữ** |
| Ai có quyền ghi | **TODO: chưa có kho lưu trữ** |
| Ai có quyền đọc | **TODO: chưa có kho lưu trữ** |
| Quy ước đặt tên phiên bản | **TODO: chưa có kho lưu trữ** |

Điền bảng này rồi xoá cảnh báo ở đầu mục "Tài liệu nhị phân — hiện ở đâu".

## Quy tắc

1. **Không** `git add -f` để ép file nhị phân vào repo.
2. Tài liệu cần review theo commit thì viết bằng **Markdown** và để trong git.
3. Cần version hoá file nhị phân thật sự → bàn chuyển sang **Git LFS** như một
   quyết định riêng, đừng tự thêm.
4. `git rm --cached` **không** giữ file an toàn qua merge — chép file ra ngoài repo
   TRƯỚC khi gỡ khỏi git.
