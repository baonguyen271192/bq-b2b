# Đính chính mô tả commit

File này ghi lại các chỗ **mô tả trong commit message** sai sự thật, trong khi code
thì đúng. Dùng cách này thay vì sửa lại lịch sử (`--amend`/rebase).

---

## `7219d7e` — chore(repo): harden gitignore for env/log and add missing web env example

**Câu sai trong commit message:**

> apps/web/.gitignore và apps/mobile/.gitignore **đều** khai `.env*` mà THIẾU dòng
> phủ định `!.env.example`.

**Thực tế:** chỉ `apps/web/.gitignore` có lỗi đó. `apps/mobile/.gitignore` dòng 34 là
**`.env*.local`** — mẫu này chỉ khớp `.env.local`, `.env.production.local`…, **không
bao giờ** khớp `.env.example`. Mobile chưa từng có lỗi này.

**Nguyên nhân báo sai:** lệnh kiểm tra dùng `grep -q "^\.env"`, khớp trúng chuỗi con
trong `.env*.local` rồi kết luận nhầm là `.env*`.

**Code không bị ảnh hưởng:** commit `7219d7e` chỉ sửa `apps/web/.gitignore`
(`apps/mobile/.gitignore` không có trong diff vì thực tế không đổi byte nào).

Trạng thái đã kiểm chứng lại bằng `git check-ignore -v`:

| Đường dẫn | Quy tắc áp dụng |
|---|---|
| `apps/mobile/.env.example` | không bị chặn ✓ |
| `apps/mobile/.env` | `.gitignore:22` (root) ✓ |
| `apps/mobile/.env.local` | `apps/mobile/.gitignore:34` ✓ |
