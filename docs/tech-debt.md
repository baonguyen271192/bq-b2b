# Nợ kỹ thuật — lint findings đã hoãn

Mỗi mục dưới đây tương ứng một `// eslint-disable-next-line ... -- TODO(BQ-debt-#n)`
trong mã nguồn. Tìm bằng:

```bash
grep -rn "TODO(BQ-debt-" apps --include='*.tsx' --include='*.ts'
```

**Không tắt rule ở cấp config.** Mỗi chỗ hoãn phải có lý do riêng tại đúng dòng đó,
để lần sau ai đụng vào biết mình đang bỏ qua cái gì.

Đã xử lý trong đợt này, không còn nợ: **#5** (`window.location.assign` + `new URL`)
và **#7** (tính trước mảng góc bằng `reduce`).

---

## BQ-debt-1 — `setState` trong effect nạp danh mục (mobile)

| | |
|---|---|
| **Vị trí** | `apps/mobile/app/(tabs)/products.tsx:41` |
| **Rule** | `react-hooks/set-state-in-effect` |
| **Hành vi hiện tại** | `useEffect(() => { void load(); }, [load])` → render lần 1 với `products === null` (hiện spinner), effect chạy, `setProducts` → render lần 2. |
| **Rủi ro khi sửa** | `load()` đang dùng lại ở `onRefresh` (kéo-để-làm-mới) và ở nhánh đổi `category`. Đổi sang cách khác phải viết lại cả ba đường, dễ làm hỏng pull-to-refresh. |
| **Hướng sửa đề xuất** | Dùng thư viện lấy dữ liệu có cache (`@tanstack/react-query` hoặc `swr`) thay cho cặp `useEffect` + `useCallback`. Không có SSR nên **không** dính hydration như bên web. |
| **Điều kiện để sửa** | Khi thêm thư viện lấy dữ liệu cho toàn app mobile — làm lẻ một màn thì được hai pattern song song, tệ hơn hiện tại. |

## BQ-debt-2 — `setState` trong effect đọc `localStorage` (sổ địa chỉ)

| | |
|---|---|
| **Vị trí** | `apps/web/app/(shop)/addresses/page.tsx:28` |
| **Rule** | `react-hooks/set-state-in-effect` |
| **Hành vi hiện tại** | Render lần 1 danh sách rỗng → effect đọc `localStorage` → `setList` + `setSelected` → render lần 2. Người dùng thấy một nhịp nháy. |
| **Rủi ro khi sửa** | Đọc `localStorage` ngay lúc render (lazy `useState`) gây **hydration mismatch**: server không có `localStorage`, HTML từ server khác HTML client dựng ra. Lỗi này **không lộ ra ở `next dev`**, chỉ thấy ở bản build. |
| **Hướng sửa đề xuất** | `useSyncExternalStore` với `getServerSnapshot` trả **giá trị rỗng** — đó là cách React xử lý đúng "state chỉ có ở client". |
| **Điều kiện để sửa** | Phải kiểm bằng `next build && next start`, **không chỉ `next dev`**. Dev server không dựng HTML phía server nên mismatch bị giấu. |

## BQ-debt-3 — `setState` đồng bộ lựa chọn theo giỏ hàng

| | |
|---|---|
| **Vị trí** | `apps/web/app/(shop)/cart/page.tsx:24` |
| **Rule** | `react-hooks/set-state-in-effect` |
| **Hành vi hiện tại** | Mỗi khi `cart` đổi, effect dựng lại map `selected` theo khoá `code:size`, **giữ lại lựa chọn cũ** (`prev[K] ?? true`) và mặc định tick mới là `true`. |
| **Rủi ro khi sửa** | Đây là đồng bộ hai nguồn state. Làm sai cách (ví dụ tính `selected` thẳng trong render) sẽ **mất trạng thái tick của người dùng** mỗi lần giỏ đổi — lỗi im lặng, người dùng chỉ thấy "tự nhiên bỏ chọn". |
| **Hướng sửa đề xuất** | `useSyncExternalStore` với `getServerSnapshot` trả rỗng, hoặc chuyển `selected` thành dẫn xuất có khoá (`key` trên component) thay vì state riêng. |
| **Điều kiện để sửa** | Cần test tay: thêm/xoá mặt hàng khi đã bỏ tick vài size, xác nhận tick giữ nguyên. Kiểm bằng `next build && next start`. |

## BQ-debt-4 — `Date.now()` gọi trong lúc render

| | |
|---|---|
| **Vị trí** | `apps/web/app/(shop)/page.tsx:47` |
| **Rule** | `react-hooks/purity` |
| **Hành vi hiện tại** | Số ngày tới hạn tính bằng `Date.now()` ngay trong thân component. React 19 coi là hàm không thuần vì hai lần render có thể ra số khác nhau. |
| **Rủi ro khi sửa** | Đưa ra khỏi render (dùng `useState` khởi tạo một lần hoặc tính trong effect) sẽ **đóng băng số ngày tại thời điểm mount**. Màn hình để mở qua đêm sẽ hiện số cũ. |
| **Hướng sửa đề xuất** | Tính trong `useEffect` + `setInterval` làm mới mỗi giờ, hoặc chỉ hiện **ngày tới hạn** và bỏ hẳn số ngày đếm ngược. |
| **Điều kiện để sửa** | ⚠️ **Kiểm trước:** component này có chạy SSR không. Nếu có thì `Date.now()` lúc render **đã đang** gây hydration mismatch sẵn (giờ server ≠ giờ client) — tức đây có thể là bug đang tồn tại chứ không chỉ là nợ phong cách. Xác minh bằng `next build && next start` rồi xem cảnh báo hydration trong console. |

## BQ-debt-6 — `<img>` thay vì `next/image`

| | |
|---|---|
| **Vị trí** | `apps/web/app/admin/orders/page.tsx:355` |
| **Rule** | `@next/next/no-img-element` |
| **Hành vi hiện tại** | Ảnh sản phẩm trong chi tiết đơn tải bằng `<img>` thô — không tối ưu kích thước, không lazy-load, ảnh hưởng LCP. |
| **Rủi ro khi sửa** | `next/image` **bắt buộc** khai `images.remotePatterns` trong `next.config.ts` cho domain nguồn. Thiếu khai → **ảnh không hiện**, lỗi lúc chạy chứ không phải lúc build. |
| **Hướng sửa đề xuất** | Đổi sang `next/image` và khai `remotePatterns`. |
| **Điều kiện để sửa** | **Làm cùng lúc với việc nối SAP B1**, khi đã chốt domain ảnh thật. Hiện ảnh đến từ `cdn.hstatic.net` (dữ liệu demo cào về); nối ERP xong domain sẽ đổi, làm bây giờ là phải làm lại. |

## BQ-debt-8 — `setState` trong effect khôi phục giỏ hàng

| | |
|---|---|
| **Vị trí** | `apps/web/lib/store.tsx:35` |
| **Rule** | `react-hooks/set-state-in-effect` |
| **Hành vi hiện tại** | `StoreProvider` render lần 1 với `dealer="DL001"` và giỏ rỗng, effect đọc `localStorage` rồi `setDealerState`/`setCart`/`setReady(true)`. Cờ `ready` chặn hai effect ghi ngược xuống `localStorage` trước khi đọc xong. |
| **Rủi ro khi sửa** | Giống BQ-debt-2, **nhưng nặng hơn**: đây là provider gốc, mọi màn trong `(shop)` phụ thuộc. Sửa sai gây hydration mismatch toàn khu vực, hoặc tệ hơn — ghi đè giỏ hàng đã lưu bằng giỏ rỗng nếu cờ `ready` bị bỏ sót. |
| **Hướng sửa đề xuất** | `useSyncExternalStore` với `getServerSnapshot` trả rỗng, đọc trực tiếp từ `localStorage` ở `getSnapshot`. Khi đó cờ `ready` không còn cần. |
| **Điều kiện để sửa** | Kiểm bằng `next build && next start`, không chỉ `next dev`. Kịch bản bắt buộc test: thêm hàng vào giỏ → tải lại trang → giỏ phải còn nguyên. |

---

# Hoãn phạm vi — không phải lint finding

Mục dưới đây không gắn với `eslint-disable` nào. Đây là phần giao diện đã bàn
nhưng **cố ý không làm** trong đợt dựng lại theo `docs/design/v2/SPEC.md`.

## BQ-scope-1 — Dark mode

| | |
|---|---|
| **Phạm vi** | Toàn bộ `apps/mobile` |
| **Hiện trạng** | `SPEC.md` v2 chỉ định nghĩa một bảng màu sáng. Token màu trong `packages/tokens/src/colors.ts` là hằng số phẳng, không có lớp theme. |
| **Vì sao hoãn** | Chưa có bảng màu tối được duyệt. Tự nghĩ ra bảng tối đồng nghĩa với việc phát minh thêm một design system thứ hai, trái với nguyên tắc "SPEC là nguồn chuẩn duy nhất". |
| **Điều kiện để làm** | Cần SPEC bổ sung bảng màu tối kèm tỉ lệ tương phản đo được cho từng cặp — nhất là cam trên nền tối, vốn là chỗ khó nhất. Trước khi đó, chuyển token sang dạng hàm theo scheme là làm thừa. |

## BQ-scope-2 — Onboarding lần đầu

| | |
|---|---|
| **Phạm vi** | Sau `01-Main` / `13-OTP`, trước `02-Home` |
| **Hiện trạng** | Đăng nhập xong vào thẳng Trang chủ. Không có màn giới thiệu hạn mức, size matrix hay công nợ. |
| **Vì sao hoãn** | Chưa có thiết kế trong bộ 23 màn. Chưa rõ sản phẩm có muốn onboarding hay không — đại lý thường được Sale hướng dẫn trực tiếp lúc kích hoạt tài khoản. |
| **Điều kiện để làm** | Quyết định sản phẩm trước, rồi mới thiết kế. Nếu làm thì nên gắn vào lần đầu mở từng màn (coach mark) hơn là một chuỗi màn riêng. |
