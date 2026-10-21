# @bq/mobile — App đại lý BQ

React Native + Expo SDK 58 · **một codebase cho cả iOS và Android**.
Giao diện dựng theo prototype `BQ Dealer App.html` của BQ.

## Chạy

```bash
pnpm install
cp .env.example .env          # đặt EXPO_PUBLIC_API_BASE

pnpm dev:api                  # backend Java  :8100
pnpm dev:assistant            # trợ lý AI     :8101
pnpm dev:mobile               # Expo
```

| Chạy trên | `EXPO_PUBLIC_API_BASE` |
|---|---|
| Simulator iOS | `http://localhost:8100` |
| Emulator Android | `http://10.0.2.2:8100` — **không phải** localhost |
| Máy thật | `https://<subdomain>.ngrok-free.app` |

App native **không có lớp proxy** như `apps/web`, nên URL phải tuyệt đối. App chặn
ngay lúc khởi động nếu thiếu biến này.

### Chạy trên máy ảo iOS

```bash
pnpm dev:mobile          # Metro, ở terminal khác
pnpm --filter=@bq/mobile ios
```

Lệnh `ios` gọi `scripts/run-ios.sh`, **không** gọi `expo run:ios`. Lý do: Xcode 27
(06/2026) đã bỏ `Simulator.app` và thay bằng `DeviceHub.app`; Expo CLI vẫn dò
đường dẫn cũ nên build xong thì dừng ở bước mở máy ảo
([expo/expo#46671](https://github.com/expo/expo/issues/46671)). Script đi thẳng
`xcodebuild` + `simctl` nên chạy được cả Xcode 27 lẫn bản cũ hơn.

Chỉ định máy ảo: `pnpm --filter=@bq/mobile ios "iPhone 17 Pro Max"`.

> Trên Xcode 27, cửa sổ xem máy ảo là **Device Hub**
> (`Xcode.app/Contents/Applications/DeviceHub.app`), không phải Simulator nữa.
> Đừng mất công đi tìm `Simulator.app` — nó không còn tồn tại.

### Xem nhanh trên trình duyệt

```bash
npx expo export --platform web --output-dir /tmp/bq-web
cd /tmp/bq-web && python3 -m http.server 8777
```

`react-native-web` giữ lại có chủ ý: xem giao diện không cần mở simulator, và chụp
ảnh màn hình để đối chiếu thiết kế.

## Cấu trúc

```
theme/           tokens.ts (màu · khoảng cách · bo góc · thang chữ) + Text
components/      Button · Card · Badge · Screen · EmptyState
                 CreditMeter · SizeMatrix · ProductCard · OrderRow
lib/             api.ts · session.tsx · cart.tsx
app/             expo-router (file-based)
  index.tsx          đăng nhập
  (tabs)/            Trang chủ · Sản phẩm · Đơn hàng · Công nợ · Hồ sơ
  product/[code]     chi tiết + Bảng size
  cart · checkout    giỏ hàng & xác nhận đơn
  order/[id]         chi tiết đơn + dòng thời gian
  assistant          trợ lý AI
```

Kiểu dữ liệu, client API và logic nghiệp vụ dùng chung với `apps/web` qua
`@bq/types` · `@bq/api-client` · `@bq/core` — sửa một lần, hai app cùng nhận.

## Khác prototype ở đâu, và vì sao

| Thay đổi | Lý do |
|---|---|
| **Bảng size dùng nút +/−** thay cho ô nhập số | Gõ số cho lưới 8 size trên bàn phím điện thoại vừa chậm vừa dễ sai. Chạm giữ dấu + cộng 5 đôi. |
| **Tồn kho hiện dưới từng size**, size hết hàng bị khoá | Thà chặn trước còn hơn cho bấm rồi mới báo lỗi lúc gửi đơn. |
| **"Size Run"** điền sẵn cả dải theo phân bố thường gặp | Phần lớn đơn sỉ bắt đầu từ một dải chuẩn rồi mới chỉnh. |
| **Thanh hạn mức đổi màu** theo mức sử dụng (xanh → hổ phách → đỏ) | Người dùng quét mắt thấy màu trước khi đọc số. |
| **Xem trước hạn mức sau đơn** vẽ bằng vạch đứt trên cùng thanh | Biết mình sắp chạm trần TRƯỚC khi bấm gửi. |
| **Lãi/đôi hiện ngay trên thẻ sản phẩm** | Đó mới là con số đại lý dùng để quyết định, không phải giá nhập. |
| **Mọi trạng thái rỗng đều có nút hành động** | Màn rỗng không lối đi tiếp là ngõ cụt. |

## Hai điểm khác biệt iOS ⇄ Android đã xử lý

- **Độ đậm chữ**: Android bỏ qua `fontWeight` khi dùng font tuỳ biến. `fontForWeight`
  trong `theme/tokens.ts` ánh xạ sang đúng file Inter.
- **Bóng đổ**: iOS dùng `shadow*`, Android dùng `elevation`. Token `shadow` khai cả hai.

## Chưa có (backend chưa có endpoint)

Xem `docs/architecture.md` §11. Các màn này **cố ý để rỗng và nói thật** thay vì bịa
dữ liệu giả — dữ liệu giả trong app bàn giao sẽ bị nhầm là tính năng đã chạy:

- Đăng nhập OTP thật (hiện đăng nhập bằng đại lý demo `DL001`)
- Thông báo · Sổ địa chỉ · Hoá đơn VAT · Hướng dẫn chuyển khoản
- Đơn nháp (giỏ hàng hiện giữ trong bộ nhớ, mất khi tắt app)

## Kiểm tra

```bash
npx tsc --noEmit
npx expo-doctor
npx expo export --platform ios
npx expo export --platform android
```
