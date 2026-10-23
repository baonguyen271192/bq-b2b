# BQ Đại lý — Đặc tả giao diện v2 (đã chốt)

Tài liệu này là **nguồn chuẩn duy nhất** cho giao diện app `apps/mobile`. Nó **thay thế** mọi đặc tả giao diện trước đó (design system "phòng trưng bày", bản cam/ink cũ, prototype HTML cũ). Prototype HTML cũ chỉ còn giá trị tham khảo về **chức năng và nội dung**.

Ảnh chuẩn: `docs/design/v2/screens/*.png` (33 màn, chụp ở 390×844 pt, @2x). Bản tổng hợp: `docs/design/v2/BQ_Giao_dien_moi.pdf`.
Khi chữ trong tài liệu này và ảnh mâu thuẫn: **số đo trong tài liệu này thắng**, bố cục và thứ bậc thị giác theo ảnh.

---

## 1. Token

### Màu
| Token | Giá trị | Dùng cho |
|---|---|---|
| `ink` | `#1C1915` | Chữ chính, tab bar, nút phụ nền tối, puck size đã chọn, avatar |
| `muted` | `#6B655D` | Chữ phụ (đạt 4.5:1 trên trắng và trên canvas). KHÔNG dùng màu xám nhạt hơn cho chữ |
| `line` | `#E8E5E0` | Viền ô, vạch tồn kho trống, viền chip |
| `divider` | `#EFECE8` | Đường kẻ giữa các dòng trong card |
| `canvas` | `#F6F5F3` | Nền màn hình |
| `paper` | `#FFFFFF` | Nền card, dock đáy, sheet |
| `subtle` | `#F1EFEC` | Nền icon tròn trong list, stepper khi = 0, chip size trong giỏ |
| `plate` | `#EAECF0` | Nền ảnh sản phẩm (khớp nền ảnh gốc) |
| `brand` | `#D23E14` | MỌI nền cam có chữ trắng: CTA, tab đang chọn, thẻ hạn mức, badge, nút gọi. Cùng sắc với logo (≈13°), chỉ đậm hơn để chữ trắng đạt 4.73:1 |
| `brandDeep` / `textBrand` | `#B8330D` | Chữ cam trên nền sáng (5.48:1 trên canvas, 5.97:1 trên paper, 5.17:1 trên tint) và trạng thái nhấn của `brand` |
| `flame` | `#F04F23` (đúng màu logo) | Chỉ cho phần KHÔNG có chữ nhỏ: chấm tiến trình hiện tại, mảng cam header màn Đăng nhập (chỉ chứa logo cỡ lớn), splash. Mã đo từ file logo trong repo, CHƯA đối chiếu brand guideline chính thức của BQ. Khi có mã chính thức: `flame` = mã đó; `brand` và `textBrand` tính lại cùng sắc, chỉ đổi độ đậm cho tới khi đạt 4.5:1 |
| `tint` | `#FDEBE5` | Nền chip cam nhạt ("Giá hạng Vàng", "Size 41 ×"), vòng sáng quanh chấm tiến trình |
| `ok` / `okTint` | `#17734A` / `#E3F3EA` | Lãi, đã nhận, đủ hạn mức, tiền vào |
| `warn` / `warnTint` | `#8A5300` / `#FBEFD9` | Chờ duyệt, sắp đến hạn, ghi chú quan trọng |
| `info` / `infoTint` | `#2350B8` / `#E5ECFB` | Đang giao, icon xe tải, avatar Sale |
| `danger` / `dangerTint` | `#B42318` / `#FDECEA` | Sắp hết hàng (vạch), đăng xuất, vượt hạn mức |
| Vạch tồn kho mức trung bình | `#B86E00` | Chỉ dùng cho vạch, không dùng cho chữ |

Bỏ token cũ `bqDeep #B84A00`. Thẻ hạn mức/công nợ là nền **phẳng** `brand`, không gradient. Ghi tỉ lệ tương phản đã đo vào comment của từng token.

Phủ trên nền `brand`: chip/khối phụ dùng `rgba(0,0,0,0.18)`, track tiến độ `rgba(255,255,255,0.28)`, đường chỉ khâu `rgba(255,255,255,0.32)` nét đứt 1px.
Lớp mờ sau bottom sheet: `rgba(28,25,21,0.5)`.

### Chữ
Font **Be Vietnam Pro** (`@expo-google-fonts/be-vietnam-pro`), weight 400/500/600/700/800. Mọi số tiền, số lượng, mã đơn, ngày: `fontVariant: ['tabular-nums']`.

| Vai trò | Cỡ / dòng | Weight | Letter spacing |
|---|---|---|---|
| Tiêu đề màn tab (Sản phẩm, Đơn hàng, Công nợ, Hồ sơ), tiêu đề Đăng nhập | 30 / 36 | 800 | -1 |
| Số tiền lớn trên thẻ hạn mức | 34 / 38 | 800 | -1.2 |
| Số tiền QR (Chuyển khoản) | 30 | 800 | -1 |
| Giá ở màn Chi tiết | 26 | 800 | -0.8 |
| Tổng ở dock (Chi tiết, Đặt nhanh) | 22 | 800 | -0.5 |
| Tổng ở dock (Giỏ hàng) | 24 | 800 | -0.6 |
| Tên đại lý (Trang chủ), tiêu đề màn có nút back, tên sản phẩm ở Chi tiết | 20 / 26 | 700 | -0.4 |
| Tiêu đề section | 18 | 700 | -0.3 |
| Tiêu đề card nhỏ | 15–16 | 700 | 0 |
| Body / nút | 15–16 | 400 / 600 | 0 |
| Phụ | 13 / 18 | 400–500 | 0 |
| Chip, tag trạng thái, chip size | 12 | 600–700 | 0 |
| Badge số trên icon | 11 | 700 | 0 |

**Mọi chữ mang thông tin (phụ đề, ngày, tồn kho, ghi chú) tối thiểu 13.** Chỉ chip/tag được 12, chỉ badge số được 11.

### Khoảng cách, bo góc, đổ bóng
- Lề màn hình 20. Khoảng cách giữa các khối chính 14–16. Padding card 16 (card chứa list: `16 16 4`).
- Vùng trên cùng: tôn trọng safe area (thiết kế dùng 54 tính từ mép trên trên iPhone 14–17). Không vẽ status bar giả.
- Bo góc: thẻ hạn mức 28 (đường chỉ khâu cách mép 7, bo 22); card 22; ảnh sản phẩm trong lưới 22, thumbnail 14–18; ô thao tác nhanh 20; ô nhập 16; dock và bottom sheet bo 2 góc trên 28; header cam Đăng nhập bo 2 góc dưới 36; chip size trong giỏ 8; chip "Lãi" 7; còn lại (nút, chip, tab, stepper, avatar) là viên thuốc/tròn.
- Đổ bóng CHỈ cho: tab bar (`0 12 32 rgba(28,25,21,0.28)`), dock đáy (`0 -8 28 rgba(28,25,21,0.10)`), tab đang chọn trong segmented control (`0 1 3 rgba(28,25,21,0.08)`). Card thường không đổ bóng.
- Vùng chạm tối thiểu 44×44. Icon chỉ có hình phải có `accessibilityLabel`.

### Icon
Nét (stroke) 2, đầu tròn, khung 24, hiển thị 16–22. Dùng `lucide-react-native` nếu repo đã có, nếu chưa thì `@expo/vector-icons` (Feather/Ionicons outline) chọn hình gần nhất. Không dùng emoji.

---

## 2. Component dùng chung (đặt trong `src/components/ui/`, tuân thủ ràng buộc component đã thống nhất trước đó)

| Component | Đặc tả |
|---|---|
| `IconButton` | Tròn 44. Tone `light`: nền paper, viền 1 line. Tone `glass`: nền trắng 90%, không viền (dùng trên ảnh). Badge: tròn tối thiểu 20, nền brand, chữ trắng 11/700, viền 2 canvas, lệch -4/-4 góc trên phải |
| `Pill` | Cao 54, padding ngang 22, chữ 16/600, icon 20 cách chữ 8. Tone `brand` (nền brand), `ink`, `outline` (nền paper, viền 1.5 ink, chữ ink) |
| `StatusTag` | Cao 26, padding 10, chấm 6 + chữ 12/600, nền tint của trạng thái |
| `CreditCard` | Nền brand phẳng (KHÔNG gradient), padding 22, bo 28, đường chỉ khâu nét đứt. Bên trong: hàng nhãn 14/500 + chip trắng mờ; số tiền 34/800; thanh tiến độ 6; hàng tổng/đã dùng 13 (số in đậm 700); khối phụ (tuỳ màn) nền `rgba(0,0,0,0.18)` bo 18 |
| `QuickAction` | Ô bo 20, cao 88, icon trong vòng tròn 40, nhãn 12/600 phía dưới. Ô đầu (Tạo đơn) nền ink chữ trắng, vòng tròn `rgba(255,255,255,0.14)`; các ô còn lại nền paper, vòng tròn subtle |
| `ProductCard` (lưới) | Ảnh trên plate cao ≈ rộng, bo 22. Tag trên trái (cao 24, nền ink, chữ 11/600 trắng; tối đa 1 tag). Nút ♡ trên phải: vùng chạm 44, hình tròn 32 nền trắng 90%. Nút (+) dưới phải: tròn 44 nền ink, cách mép 8. Dưới ảnh (cách 10): tên 14/19/600 tối đa 2 dòng; hàng giá 15/700 + chip "Lãi xxxk" (cao 22, nền okTint, chữ ok 12/700) căn phải; **dòng tình trạng size bằng chữ** 13/500 (KHÔNG dùng chấm): "Đủ size 38–44" (ok), "Hết size 40" / "Hết size 40, 44" (muted), "Sắp hết, còn size 39, 40" (warn, khi còn ≤ 2 size) |
| `ProductMini` (carousel) | Rộng 150, ảnh 150×150 bo 20, tên 13/18/600, giá 15/700. Hàng cuộn ngang tràn ra mép phải màn hình |
| `SizeRow` | Hàng cao 52 (padding dọc 4), kẻ divider giữa các hàng. Puck tròn 44, số 16/700: đã chọn = nền ink chữ trắng; chưa chọn = nền paper viền 1.5 line; hết hàng = nền subtle, chữ muted gạch ngang. Giữa: 3 vạch 16×4 cách 3 (màu theo mức: ≥50 ok 3 vạch, 15–49 `#B86E00` 2 vạch, 1–14 danger 1 vạch, 0 không vạch) + nhãn 12 muted ("còn 96", "Sắp hết, còn 8", "Hết hàng"). Phải: `Stepper` |
| `Stepper` | Cao 44, nút −/+ mỗi nút 44, số ở giữa rộng tối thiểu 32, 16/700. **Chạm vào con số → bàn phím số** (giới hạn 0…tồn kho, vượt thì tự hạ về tồn kho và báo nhẹ). **Giữ nút +/−** để tăng/giảm liên tục (tăng tốc sau 1 giây). Giá trị 0: nền subtle, số muted, nút − vô hiệu. Giá trị >0: nền paper, viền 1.5 ink. Hết hàng: nền subtle, opacity 0.55, cả 2 nút vô hiệu |
| `SizeChip` | Cao 26, padding 9, bo 8, nền subtle: size (muted) + "×SL" (700) |
| `Dock` | Tuyệt đối dưới đáy, nền paper, bo 2 góc trên 28, đổ bóng dock, padding `14 20` + safe area dưới (thiết kế: 34). Hàng trên: trái nhãn 13 muted + tổng; phải nhãn 13 muted + số 14/600. Hàng dưới: Pill |
| `TabBar` | Viên thuốc nổi, nền ink, padding 6, khoảng cách item 2, cách đáy 24 + safe area, căn giữa. Item 48×48, icon 20 trắng 78%. Item đang chọn: nền brand, padding ngang 16, icon trắng + nhãn 13/600 trắng |
| `ScreenHeader` | Kiểu tab: tiêu đề 30/800 bên trái, nút tròn bên phải. Kiểu back: IconButton back + tiêu đề 20/700 + dòng phụ 13 muted + slot phải |
| `SegmentedControl` | Nền `#ECEAE6`, padding 4, viên thuốc; item cao 40, chữ 13/600; item đang chọn nền paper + bóng nhẹ, chưa chọn chữ muted; đếm số trong ngoặc |
| `ListRow` | Icon trong vòng tròn 40 nền subtle, tiêu đề 15/600 + phụ 13 muted, chevron 18 muted, padding dọc 14, divider |
| `Switch` | 44×26, nền ink khi bật, núm 20 trắng |
| `RadioCard` | Bo 18, padding 14, gap 12. Vòng radio 22: đang chọn viền 6 ink, chưa chọn viền 2 line. Tiêu đề 15/600 (riêng địa chỉ 15/700) + mô tả 13/18 muted. Card đang chọn viền 1.5 ink, chưa chọn viền 1 line. Hai biến thể hành vi: **chạm là chọn rồi đóng sheet** (3.24) / **chạm chỉ chọn**, cần CTA để xác nhận (3.14, 3.27, 3.31) |
| `AddressCard` | Nội dung theo 3.23/3.24: tên 15–16/700 + tag "Mặc định" (nền tint, chữ brandDeep), người nhận + SĐT 14, địa chỉ 13–14 muted. Hai biến thể: `manage` — nút "Sửa" + link "Đặt mặc định", card mặc định viền 1.5 ink (dùng ở 3.23); `select` — bọc trong `RadioCard` (dùng ở 3.24) |
| `Select` | Cùng khung với ô nhập của `Field`: cao 52, bo 16, viền 1 line. Placeholder muted, chevron xuống 18 ink. Chạm → bottom sheet danh sách **có ô tìm kiếm** (danh sách phường/xã tới hàng nghìn mục, không cuộn tay được). Vô hiệu khi chưa chọn cấp trên (Phường/Xã chờ Tỉnh/TP) |
| `DashedButton` | Cao 56, bo 18, viền 1.5 **nét đứt** ink, icon 20 + chữ 15/600 ink |

---

## 3. Màn hình

Dữ liệu trong ảnh là dữ liệu demo. Khi nối API giữ nguyên bố cục; trường nào API chưa có thì để `// TODO(api)` và liệt kê trong báo cáo.

### 3.1 Đăng nhập (`01-Main.png`)
- Header cam: cao 280, nền **flame**, bo 2 góc dưới 36. Hoạ tiết: 2 vòng tròn viền trắng mờ (520 và 360, opacity 0.14 và 0.18, tâm phía trên), đường chỉ khâu nét đứt chạy theo mép dưới (cách mép 10). Chữ/logo **BQ** trắng 72/800, letterSpacing -4, căn giữa, lệch xuống 24. Khi có file logo thật: thay chữ bằng logo trắng cùng kích thước. Header này phải khớp màu nền và vị trí logo với splash để chuyển cảnh liền mạch
- Nội dung (padding trên 32): tiêu đề "Đăng nhập đại lý"; mô tả 15/22 muted; nhãn "Số điện thoại" 14/600; ô nhập cao 56, viền 1.5 ink, bo 16, tiền tố "+84" 16/600 + vạch dọc 1×24; ghi chú "Mã OTP có hiệu lực trong 5 phút." 13 muted; Pill brand "Nhận mã OTP"
- Đáy (cách đáy 34): Pill outline có icon khiên "Kích hoạt từ lời mời của Sale"; dòng "Chưa là đại lý BQ? **Đăng ký ngay**" (link brand 600)

### 3.2 Trang chủ (`02-Home.png`)
Thứ tự từ trên xuống, khoảng cách 16:
1. Header: avatar tròn 44 nền ink chữ viết tắt trắng 15/700; "Chào buổi sáng," 13 muted (đổi theo giờ: sáng/trưa/chiều/tối); tên "Đại lý Minh Phát" 20/700; bên phải IconButton chuông (badge số chưa đọc) và giỏ hàng (badge số mẫu)
2. CreditCard: nhãn "Hạn mức khả dụng", chip "✓ Hạng Vàng, CK 20%"; số khả dụng; thanh tiến độ % đã dùng; hàng "Tổng hạn mức **500 tr**" / "Đã dùng **312,4 tr**" (định dạng rút gọn: tr, tỷ, dấu phẩy thập phân); khối phụ: icon lịch + "Hạn thanh toán 05/11" 12 + số tiền 15/700 + nút trắng nhỏ (cao 36, chữ brand 13/700) "Thanh toán" → màn Chuyển khoản của hoá đơn gần hạn nhất
3. Lưới 4 QuickAction: Tạo đơn (→ Sản phẩm), Đặt lại (→ danh sách đơn cũ để chép thành đơn mới), Đơn nháp (badge số nháp), Trợ lý AI
4. Card đơn đang giao (chỉ hiện khi có đơn chưa hoàn tất; nhiều đơn thì cuộn ngang): icon xe tải trong tròn 40 nền infoTint; mã đơn 15/700 + "Dự kiến nhận 22/10, BQ Express" 13 muted; tổng tiền 15/700 bên phải; tiến trình 4 bước Đặt → Duyệt → Đang giao → Nhận: chấm 12, bước xong nền ink, bước hiện tại nền flame + vòng tint 4, bước chưa tới viền 2 line; đường nối 2px (ink nếu đã qua); nhãn 12 dưới chấm (bước hiện tại 700). Chạm cả card → Chi tiết đơn
5. Section "Bán chạy tuần này" + link "Xem tất cả ›" (14/600 ink) → carousel ProductMini
- KHÔNG có nút AI nổi, KHÔNG có nút "Giỏ hàng" riêng
- TabBar, tab Trang chủ đang chọn

### 3.3 Sản phẩm (`03-Products.png`)
1. Header kiểu tab: "Sản phẩm" + dòng "258 mẫu đang bán" 14 muted (số lấy từ API); IconButton giỏ hàng có badge
2. Hàng tìm kiếm: ô viên thuốc cao 48 (nền paper, viền 1 line, icon kính lúp 18 muted, placeholder "Tìm tên hoặc mã mẫu") + IconButton bộ lọc nâng cao + IconButton quét mã vạch
3. Chip danh mục cuộn ngang (cao 40, chữ 14/600; đang chọn nền ink chữ trắng; còn lại nền paper viền line). Mép phải có dải mờ dần 40px về màu canvas để báo còn nội dung. Dính lên đầu khi cuộn
4. Hàng lọc nhanh: nút "Bán chạy ˅" (cao 36, viền line), chip bộ lọc đang áp dụng nền tint chữ brand có × (ví dụ "Size 41 ×"), bên phải nhãn "Còn hàng" + Switch
5. Lưới 2 cột, khoảng cách ngang 12, dọc 20, dùng ProductCard. Chạm ảnh/tên → Chi tiết; chạm (+) → bottom sheet Đặt nhanh
- TabBar, tab Sản phẩm đang chọn

### 3.4 Đặt nhanh — bottom sheet (`04-QuickAdd.png`)
- Mở từ nút (+). Lớp mờ phía sau. Sheet cao ≈ 85% màn hình, bo 2 góc trên 28, thanh kéo 40×5 màu line
- Đầu sheet: thumbnail 76 (plate, bo 18), mã + dòng sản phẩm 12 muted, tên 17/700, giá 15/700 + "/đôi" 12 muted, nút đóng tròn 44 nền subtle
- Hàng: "Màu" 14/600 + chip màu đang chọn (cao 32, viền 1.5 ink, chấm màu 14) | link gạch chân "+1 mỗi size" 14/600 (vùng chạm 44): cộng 1 đôi cho mọi size còn hàng (không vượt tồn kho)
- Dòng "⟳ Tồn kho cập nhật lúc HH:mm" 13 muted ngay trên danh sách size (dữ liệu cũ hơn 15 phút: màu warn + nút làm mới)
- Danh sách SizeRow (đủ các size, cuộn trong sheet nếu thiếu chỗ)
- Phần đáy (kẻ line phía trên): "18 đôi đã chọn" + tổng 22/800 | "Hạn mức còn" + số 14/600; Pill brand có icon túi "Thêm vào giỏ". Thành công: đóng sheet, hiện toast "Đã thêm 18 đôi" có nút "Xem giỏ"
- Hạn mức còn = khả dụng − (tổng giỏ hiện tại − phần của mẫu này trong giỏ + lựa chọn hiện tại). Âm thì hiện "Vượt X" màu danger, CTA vẫn cho bấm (đơn sẽ chờ duyệt)

### 3.5 Chi tiết sản phẩm + Size Matrix (`05-Detail.png`)
- Ảnh trên cùng cao 250, tràn viền, bo 2 góc dưới 28. Nút glass nổi trên ảnh: back (trái), ♡ và chia sẻ (phải)
- Nội dung padding `16 20`, khoảng cách 12: hàng "OX-001, BQ Elite" 13 muted + StatusTag kiểu brand "Giá hạng Vàng"; tên 20/26/700; hàng giá: "1.080.000đ" 26/800 + "/đôi" 13 muted | bên phải "Lãi 270.000đ/đôi" 13/700 ok và "Giá lẻ 1.350.000đ" 12 muted; hàng màu: radio dạng viên thuốc cao 40 (chấm màu 28 + tên; đang chọn viền 1.5 ink chữ 600) | link "+1 mỗi size"; tiêu đề "Chọn size và số lượng" 16/700; dòng "⟳ Tồn kho cập nhật lúc HH:mm" (như Đặt nhanh); danh sách SizeRow
- Size Matrix phải bắt đầu xuất hiện ngay trong màn hình đầu tiên (không cần cuộn mới thấy)
- Dock: "32 đôi đã chọn" + tổng | "Hạn mức còn" + số; Pill brand icon túi "Thêm vào giỏ" (nếu mẫu đã có trong giỏ: "Cập nhật giỏ hàng")

### 3.6 Giỏ hàng (`06-Cart.png`)
- ScreenHeader back: "Giỏ hàng", phụ "2 mẫu, 50 đôi"
- Card địa chỉ: icon ghim trong tròn 40, "Giao đến" 12 muted, tên kho 14/600, địa chỉ 13 muted, chevron → chọn địa chỉ
- Mỗi mẫu một card (padding 12): thumbnail 88×100 bo 16; mã + màu 12 muted; tên 14/600; nút × xoá (vùng chạm ≥ 36, ưu tiên 44); hàng SizeChip; đáy: link gạch chân "Sửa size" (→ mở lại Đặt nhanh/Chi tiết) | "32 đôi" 12 muted + thành tiền 15/700
- Card tổng kết: Tạm tính (N đôi), Vận chuyển (Miễn phí màu ok), Thanh toán (Công nợ 30 ngày); khối okTint "✓ Sau đơn này hạn mức còn X". Nếu vượt hạn mức: khối warnTint "Đơn vượt hạn mức X. Bạn vẫn đặt được, đơn sẽ chờ Sale duyệt."
- Dock: "Tổng thanh toán" + số 24/800; hàng nút: Pill outline "Lưu nháp" + Pill brand (flex 1) "Đặt hàng" (vượt hạn mức: "Gửi đơn chờ duyệt")
- Giỏ trống: empty state (icon túi trong tròn 72 nền paper, "Giỏ hàng đang trống", mô tả muted, Pill "Xem sản phẩm")

### 3.7 Đơn hàng (`07-Orders.png`)
- Header kiểu tab "Đơn hàng" + IconButton tìm kiếm
- SegmentedControl: Tất cả / Chờ duyệt (1) / Đang giao (1) / Đã nhận
- Mỗi đơn một card: mã 15/700 + ngày 13 muted | StatusTag; hàng thumbnail 52 (bo 14, tối đa 3, nếu nhiều hơn thì ô "+N") | "2 mẫu, 52 đôi" 13 muted + tổng 17/700 căn phải. Đơn đã nhận có thêm hàng nút (kẻ divider phía trên) căn phải: nút viền ink cao 40 icon đặt lại "Mua lại" → chép đơn vào giỏ
- Trạng thái: Chờ duyệt hạn mức (warn), Đang giao (info), Đã nhận hàng (ok), Đã huỷ (danger)
- TabBar, tab Đơn hàng đang chọn

### 3.8 Chi tiết đơn đang giao (`08-OrderDetail.png`) — ĐÃ CẬP NHẬT, xem ảnh mới
- Dòng thời gian 5 bước khớp 1-1 với trạng thái backend: Gửi đơn › BQ xác nhận (hoặc Chờ Sale duyệt) › Đang đóng gói › Bàn giao vận chuyển › Đã nhận hàng. Mỗi bước có giờ; bước chưa tới để trống hoặc "Dự kiến …". Card đơn đang giao ở Trang chủ dùng cùng 5 bước, nhãn ngắn: Đặt / Duyệt / Đóng gói / Bàn giao / Nhận
- Header KHÔNG có tag trạng thái; phụ đề "mã đơn, đặt ngày …"
- Card 1: Dự kiến nhận + đơn vị vận chuyển + mã vận đơn rút gọn có nút sao chép, rồi dòng thời gian
- Card 2: Giao đến (tên, người nhận, SĐT, địa chỉ) + Ghi chú cho BQ
- Card 3: sản phẩm (gộp theo mẫu, ghi số đôi từng màu) + Tạm tính / VAT / Tổng / Thanh toán (số từ backend)
- Mã vận đơn: bản dựng để trên HAI dòng và hiện ĐỦ mã kèm nút sao chép, không rút gọn như ảnh (quyết định §5-M.2)
- Dòng sản phẩm: hiện chip size khi `OrderItem` chưa có màu; khi backend trả màu (A7.2) thì mỗi màu một hàng, tên màu đứng trước chip size
- Phần mô tả cũ dưới đây chỉ còn giá trị tham khảo
- ScreenHeader back: "Chi tiết đơn", phụ mã đơn, slot phải StatusTag
- Card vận chuyển: icon xe tải tròn 44 nền infoTint; "Dự kiến nhận" 13 muted + "Thứ Năm, 22/10/2026" 18/700; khối subtle bo 14: "BQ Express, mã vận đơn" 12 muted + mã 14/600 + nút sao chép 44; timeline dọc: chấm 22 (xong: nền ink + dấu ✓ trắng; hiện tại: nền tint + chấm flame 10; chưa tới: viền 2 line), đường nối 2px, tên bước 14/600 (hiện tại 700) + thời gian 12 muted
- Card sản phẩm: thumbnail 56 + tên 13/600, mỗi màu một hàng (tên màu 12 muted + SizeChip); đáy: "36 đôi, công nợ 30 ngày" | tổng 700
- Dock (không có hàng tổng): Pill outline icon đặt lại "Mua lại" + Pill brand (flex 1) "Đã nhận hàng" (chỉ hiện khi đơn đang giao)

### 3.9 Công nợ (`09-Debt.png`)
- Header kiểu tab "Công nợ"
- CreditCard: nhãn "Dư nợ hiện tại", chip "✓ Quá hạn 0đ" (nếu quá hạn > 0: chip nền trắng chữ danger, ghi số tiền); hàng "Hạn mức **500 tr**" / "Khả dụng **187,6 tr**"; không có khối phụ
- Card "Hoá đơn chưa thanh toán" + "3 hoá đơn" 13 muted: mỗi dòng mã 14/700, "Hạn 05/11, còn 14 ngày" 12 muted (hoá đơn gần hạn nhất ≤ 15 ngày: phần "còn N ngày" màu warn 600), số tiền 15/700, bên phải: hoá đơn gần hạn có nút brand nhỏ "Trả ngay" (cao 36) → Chuyển khoản; còn lại chevron
- Card "Giao dịch gần đây": icon tròn 40 (tiền vào: nền okTint mũi tên vào, số màu ok có dấu +; ghi nợ: nền subtle mũi tên ra, số màu ink có dấu −), tiêu đề 14/600, ngày 12 muted
- TabBar, tab Công nợ đang chọn

### 3.10 Chuyển khoản (`10-Transfer.png`)
- ScreenHeader back: "Chuyển khoản", phụ "Thanh toán HD-0921"
- Card QR: ảnh VietQR 188×188 bo 20 (sinh theo chuẩn VietQR từ ngân hàng, STK, số tiền, nội dung; trong ảnh thiết kế đang là ô giữ chỗ nét đứt); "Số tiền" 13 muted + số 30/800; nút nền subtle cao 40 icon chia sẻ "Lưu ảnh QR"
- Card thông tin: các dòng nhãn 12 muted + giá trị 15/700, kẻ divider; dòng Số tài khoản và Nội dung chuyển khoản có nút "Sao chép" (cao 36, viền line, icon copy 14). Sao chép xong hiện toast "Đã sao chép"
- Khối ghi chú nền warnTint chữ warn 13/19 có icon i: "Ghi đúng nội dung để BQ tự đối soát. Hạn mức được cập nhật khi BQ ghi nhận thanh toán."
- Đáy: Pill brand "Tôi đã chuyển khoản" (nền canvas phía sau, không phải dock trắng)

### 3.11 Hồ sơ (`11-Profile.png`)
- Header kiểu tab "Hồ sơ"
- Card đại lý: avatar 60 nền ink chữ 20/700; tên 18/700; "DL-0215, MST 0401 234 567" 13 muted; StatusTag brand "Hạng Vàng, chiết khấu 20%"
- Card ListRow: Thông tin đại diện, Sổ địa chỉ giao hàng, Đơn nháp, Hoá đơn VAT, Thông báo đẩy (Switch thay chevron)
- Card Sale phụ trách: avatar 44 nền infoTint chữ info; "Sale phụ trách" 12 muted, tên 15/600, SĐT 13 muted; nút gọi tròn 48 nền brand icon điện thoại trắng
- Nút chữ "Đăng xuất" màu danger, icon logout, cao 48. Dưới cùng: "Phiên bản x.y.z" 12 muted
- TabBar, tab Hồ sơ đang chọn

### 3.12 Trợ lý AI (`12-AI.png`)
- Header: back + avatar tròn 40 nền ink icon lấp lánh trắng + "Trợ lý BQ" 17/700 + "Tra tồn kho, công nợ, lên đơn" 13 muted
- Bong bóng trợ lý: nền paper, bo `20 20 20 6`, chữ 15/21, rộng tối đa 82%. Bong bóng người dùng: nền ink chữ trắng, bo `20 20 6 20`, căn phải, tối đa 78%
- Card đơn nháp do AI tạo (rộng 300, nền paper, bo như bong bóng trợ lý): câu dẫn; khối sản phẩm nền `#F7F6F4` bo 16 (thumbnail 56, mã + màu, tên, SizeChip); hàng Giao đến / số đôi + tổng 15/700; **dòng căn cứ** 13 muted có icon i: "Chia đều 20 đôi cho 3 size (7, 7, 6). Bấm “Sửa” để đổi số lượng từng size." (luôn nói rõ cách AI suy ra số lượng); dòng ok "✓ Đủ tồn kho, trong hạn mức" (nếu không đủ: warn, nêu size thiếu); 2 nút cao 44: "Sửa" viền ink (→ Chi tiết với lựa chọn điền sẵn) và "Thêm vào giỏ" nền brand
- Đáy: hàng chip gợi ý cuộn ngang (cao 40, viền line); ô nhập viên thuốc cao 52 + nút gửi tròn 52 nền brand
- Không có TabBar
- Việc giữ ô "Trợ lý AI" trong thao tác nhanh ở v1: chờ quyết định sản phẩm, tạm giữ

### 3.13 Nhập mã OTP (`13-OTP.png`)
- ScreenHeader back (về Đăng nhập), tiêu đề "Nhập mã OTP"
- Mô tả 15/22 muted có số điện thoại in đậm + link "Đổi số"
- 6 ô 48×58 bo 14: đã nhập viền 1.5 ink chữ 24/700; ô đang nhập viền 2 brand + con trỏ; ô trống viền 1 line. Một input ẩn `autocomplete="one-time-code"` để iOS tự điền từ SMS
- "Gửi lại mã sau 00:42" 14 muted | nút "Gửi lại" (vô hiệu khi đang đếm ngược)
- Pill "Xác nhận" vô hiệu (opacity 0.4) cho đến khi đủ 6 số; đủ 6 số thì tự gửi
- Khối ghi chú nền paper: hướng dẫn khi không nhận được mã
- Lỗi mã sai: 6 ô viền danger + dòng lỗi 13 danger "Mã không đúng, còn N lần thử"

### 3.14 Vượt hạn mức (`14-OverLimit.png`)
- Bottom sheet mở khi bấm "Thêm vào giỏ"/"Đặt hàng" mà tổng vượt hạn mức khả dụng
- Icon i trong tròn 48 nền warnTint; tiêu đề 20/700 "Đơn vượt hạn mức X"; mô tả 14 muted (tổng giỏ sau khi thêm, hạn mức khả dụng, in đậm số)
- Thanh 10px chia 2 đoạn: trong hạn mức (ink) | phần vượt (danger), nhãn 13 hai đầu
- 3 lựa chọn dạng radio card (bo 18, đang chọn viền 1.5 ink): Gửi đơn chờ Sale duyệt (mặc định) / Thanh toán bớt công nợ trước (→ Chuyển khoản hoá đơn gần hạn nhất) / Giảm số lượng (→ quay lại chọn size). Mỗi card: tiêu đề 15/600 + mô tả 13 muted
- Pill brand đổi nhãn theo lựa chọn ("Gửi đơn chờ duyệt" / "Thanh toán" / "Sửa số lượng")

### 3.15 Mất kết nối / dữ liệu cũ (`15-Offline.png`)
- Banner `role=status` nền warnTint dưới header: icon i, "Mất kết nối mạng" 14/700, "Đang hiện dữ liệu lúc HH:mm. Giá và tồn kho có thể đã thay đổi." 13, nút trắng "Thử lại"
- Card sản phẩm thay dòng tình trạng size bằng "Tồn kho lúc HH:mm"; lưới opacity 0.85
- Khối ghi chú: khi mất mạng vẫn chọn hàng và lưu đơn nháp; đơn chỉ gửi khi có mạng
- Áp dụng banner cho mọi màn đọc dữ liệu (Trang chủ, Sản phẩm, Chi tiết, Công nợ). Nút đặt hàng/thanh toán vô hiệu, nút lưu nháp vẫn dùng được

### 3.16 Tìm không ra (`16-NoResults.png`)
- Header: back + ô tìm kiếm đang focus (viền 1.5 ink) có nút xoá từ khoá
- Hàng "Đang lọc:" + chip bộ lọc (bỏ được)
- Empty state: icon kính lúp, "Không tìm thấy “từ khoá”", gợi ý cụ thể (kiểm tra mã / bỏ bộ lọc nào)
- 2 nút cao 48: "Bỏ bộ lọc" (outline) | "Hỏi Sale" (ink, icon điện thoại)
- Card "Mã gần giống": tối đa 3 dòng (thumbnail 52, mã, tên, giá)

### 3.17 Giỏ hàng trống (`17-CartEmpty.png`)
- Empty state + Pill "Xem sản phẩm"
- Section "Đặt lại nhanh": card đơn gần nhất đã nhận (thumbnail, mã, ngày, số đôi) + nút "Mua lại"; card đơn nháp (ListRow) nếu có

### 3.18 Đơn bị từ chối (`18-Rejected.png`)
- Header như Chi tiết đơn, StatusTag danger "Bị từ chối"
- Khối nền dangerTint bo 22: "Sale đã từ chối đơn này" 16/700 danger, "Lý do: …" 14, người từ chối + thời gian 13 muted
- Timeline: Gửi đơn (xong) → Chờ duyệt hạn mức (chấm warn) → Bị từ chối (chấm danger dấu ×)
- Card sản phẩm như Chi tiết đơn; ghi chú 13 muted: không ghi nợ, hàng không được giữ
- Dock: "Gọi Sale" (outline) + "Sửa và gửi lại" (brand: chép đơn vào giỏ, kiểm tra lại tồn kho)

### 3.19 Đăng ký đại lý (`19-Register.png`)
- ScreenHeader back, phụ "Bước 1/2: Thông tin doanh nghiệp"; thanh 2 đoạn 4px (bước hiện tại ink)
- Field: nhãn 14/600 + input cao 52 bo 16 viền 1 line + gợi ý 13 muted khi cần. Bước 1: Tên DN/hộ KD, MST, Người đại diện, SĐT (gợi ý "Dùng số này để đăng nhập bằng OTP"), Giấy phép kinh doanh (ô thêm ảnh 96×96 viền đứt ink, tối đa 3). Bước 2: Địa chỉ kinh doanh + địa chỉ giao hàng (dùng form của Sổ địa chỉ), xác nhận
- Dock: Pill "Tiếp tục" (bước 2: "Gửi đăng ký"). Lỗi field: viền danger + dòng lỗi 13 danger dưới input
- Sau khi gửi: màn xác nhận dùng empty state ("Đã gửi đăng ký", "Sale BQ sẽ liên hệ để xác minh thông tin")

### 3.20 Thông báo (`20-Notifications.png`)
- ScreenHeader back, phụ "N chưa đọc", slot phải nút chữ gạch chân "Đọc tất cả"
- SegmentedControl: Tất cả / Đơn hàng / Công nợ / Hoá đơn
- Nhóm theo thời gian ("Hôm nay", "Trước đó": nhãn 13/600 muted), mỗi nhóm một card
- Dòng: icon tròn 40 tô theo loại (đang giao info, chờ duyệt warn, đến hạn brand/tint, đã thanh toán ok, hoá đơn subtle), tiêu đề 15 (chưa đọc 700, đã đọc 600), nội dung 13/18 muted, thời gian 13 muted, chấm brand 8 bên phải nếu chưa đọc. Chạm → màn liên quan

### 3.21 Đơn nháp (`21-Drafts.png`)
- ScreenHeader back, phụ "N đơn đã lưu"
- Mỗi nháp một card: mã + "Lưu ngày …" | nút chữ danger "Xoá" (hỏi xác nhận); từng mẫu (thumbnail 56, mã + màu, tên, SizeChip); tổng "2 mẫu, 52 đôi" | số 18/800; khối warnTint "Giá và tồn kho sẽ được kiểm tra lại khi chuyển vào giỏ"; 2 nút cao 48: "Sửa" (outline) | "Chuyển vào giỏ" (brand, icon túi)
- Ghi chú cuối 13 muted: nháp lưu trên tài khoản, mở được trên mọi thiết bị

### 3.22 Hoá đơn VAT (`22-VAT.png`)
- ScreenHeader back, phụ mã đơn, StatusTag ok "Đã ký số"
- Bản xem hoá đơn: card paper viền 1 line bo 22: logo BQ 44, Ký hiệu/Số căn phải; tiêu đề "HOÁ ĐƠN GIÁ TRỊ GIA TĂNG" 15/800 + ngày; lưới thông tin 2 cột (nhãn 96px muted); bảng Hàng hoá/SL/Đơn giá/Thành tiền (số căn phải, tabular); Cộng tiền hàng, Thuế GTGT, Tổng thanh toán 16/800; Mã tra cứu + nút sao chép
- Dock: "Chia sẻ" (outline, icon) | "Tải PDF" (brand)
- Danh sách hoá đơn (vào từ Hồ sơ): ListRow mỗi hoá đơn (số, ngày, tổng, StatusTag)

### 3.23 Sổ địa chỉ (`23-Addresses.png`)
- ScreenHeader back, phụ "N địa chỉ giao hàng"
- Mỗi địa chỉ một card: tên 16/700 + tag brand "Mặc định" (card mặc định viền 1.5 ink); người nhận + SĐT 14; địa chỉ 14/20 muted; nút "Sửa" (viền line, cao 40) + nút chữ gạch chân "Đặt mặc định" (ẩn ở địa chỉ mặc định)
- Dock: Pill brand icon + "Thêm địa chỉ mới". Form thêm/sửa dùng Field như Đăng ký

### 3.24 Sheet chọn địa chỉ giao hàng (`24-AddressSheet.png`)
- Mở khi chạm card "Giao đến" ở Giỏ hàng. KHÔNG rời màn Giỏ hàng
- Tiêu đề "Giao đến" 20/700 + nút đóng tròn 44
- Mỗi địa chỉ là một radio card (bo 18; đang chọn viền 1.5 ink + vòng radio đặc): tên 15/700 + tag "Mặc định" (nền tint, chữ brandDeep), người nhận + SĐT 14, địa chỉ 13 muted. **Chạm là chọn và đóng sheet ngay** (không cần nút xác nhận)
- Dưới danh sách: nút viền đứt ink cao 56 "+ Thêm địa chỉ mới" → chuyển sheet sang bước form (3.25), không rời Giỏ hàng
- Ghi chú 13 muted: sửa/xoá địa chỉ ở Hồ sơ › Sổ địa chỉ
- Khi đại lý chỉ có 1 địa chỉ: card "Giao đến" VẪN có chevron (để thêm địa chỉ mới); sheet hiện 1 card + nút thêm
- Khi chưa có địa chỉ nào: card "Giao đến" hiện "Thêm địa chỉ giao hàng" (chữ brandDeep), chạm mở thẳng form 3.25; nút "Đặt hàng" vô hiệu cho đến khi có địa chỉ

### 3.25 Sheet thêm địa chỉ mới (`25-AddressForm.png`)
- Cùng sheet với 3.24, bước 2: nút back (về danh sách) + tiêu đề "Thêm địa chỉ mới"
- Field: Tên gợi nhớ; Người nhận | Số điện thoại (2 cột); Tỉnh/Thành phố (chọn từ danh sách); Phường/Xã (chọn, phụ thuộc tỉnh); Số nhà, tên đường; Switch "Đặt làm địa chỉ mặc định"
- Đơn vị hành chính 2 cấp (Tỉnh/Thành phố → Phường/Xã). Danh sách lấy từ API/bộ dữ liệu chính thức, không hardcode
- Đáy: Pill brand "Lưu và giao đến đây": lưu vào sổ địa chỉ, chọn luôn cho đơn hiện tại, đóng sheet
- Màn Sổ địa chỉ (3.23) dùng lại đúng component card địa chỉ và form này

### 3.26 Trang chủ khi đã vượt hạn mức (`26-HomeOverLimit.png`)
- Số khả dụng KHÔNG BAO GIỜ âm: dừng ở `0đ`. Phần vượt hiện bằng chip nền trắng chữ danger có icon i: "Vượt 247,4 tr"
- Thanh tiến độ đầy trắng 100%; hàng dưới: "Hạn mức **500 tr**" / "Dư nợ **747,4 tr**"
- Khối phụ (nền `rgba(0,0,0,0.18)`): "Dư nợ gồm **N đơn chờ duyệt (X tr)**. Đơn mới sẽ cần Sale duyệt cho tới khi bạn thanh toán bớt." + nút trắng chữ brandDeep "Thanh toán công nợ" → 3.31. Bỏ câu "gồm N đơn chờ duyệt" nếu BQ xác nhận đơn chờ duyệt KHÔNG tính vào dư nợ
- Áp dụng cùng quy tắc cho CreditCard ở mọi nơi (Trang chủ, Công nợ)

### 3.27 Vượt hạn mức khi nợ cũ đã vượt (`27-OverLimitDebt.png`)
- Biến thể của 3.14, dùng khi khả dụng ≤ 0 TRƯỚC khi tính đơn hiện tại
- Tiêu đề "Hạn mức đã dùng hết" + mô tả: đơn này cần Sale duyệt dù ít hay nhiều
- Khối nền `#F7F6F4` bo 18: "Đang vượt hạn mức" (số danger) / "Đơn này" (+số) / gạch ngang / "Cần duyệt tổng" (17/800). KHÔNG dùng thanh so sánh
- Chỉ 2 lựa chọn: "Gửi đơn chờ Sale duyệt" (mặc định, mô tả: hàng chưa được giữ trong lúc chờ) và "Thanh toán công nợ trước" (→ 3.31). BỎ "Giảm số lượng"
- Gửi xong → 3.28

### 3.28 Đơn chờ duyệt (`28-OrderPending.png`)
- Header KHÔNG có tag trạng thái (trạng thái nằm ở dòng thời gian, xem 3.8)
- Khối nền warnTint: lý do chờ ("Đơn vượt hạn mức X, đang chờ Sale duyệt"), câu "Muốn huỷ hoặc sửa đơn này, gọi Sale phụ trách…", nút trắng "Gọi <tên Sale>". Khi có API huỷ đơn: thêm nút "Huỷ đơn" (outline danger) và bỏ câu gọi Sale
- Dòng thời gian 5 bước, bước 2 "Chờ Sale duyệt" dùng chấm warn
- Card Giao đến, card tổng (Tạm tính / VAT / Tổng)

### 3.29 Chi tiết sau khi thêm vào giỏ (`29-DetailAdded.png`)
- Header Chi tiết: back | ♡ + giỏ hàng có badge (thay nút chia sẻ)
- Toast nền ink bo 18, nằm ngay trên dock: icon check + "Đã thêm N đôi vào giỏ" 15/600 + nút trắng "Xem giỏ" (cao 44). Tự ẩn sau 4 giây
- Sau khi thêm, CTA dock đổi thành "Cập nhật giỏ hàng"
- "Thêm 1 đôi mỗi size" (đổi tên từ "+1 mỗi size") nằm cùng hàng tiêu đề "Chọn size và số lượng", không cạnh giá

### 3.30 Ghi chú cho BQ (`30-NoteSheet.png`)
- Giỏ hàng có card "Ghi chú cho BQ" (ListRow có icon tài liệu, hiện nội dung hoặc "Thêm ghi chú"), đặt sau danh sách sản phẩm
- Bottom sheet: tiêu đề + nút đóng; mô tả 14 muted; textarea viền 1.5 ink bo 16, tối đa 254 ký tự (giới hạn trường Comments của SAP B1), bộ đếm "N/254"; chip gợi ý chèn nhanh; Pill "Lưu ghi chú"
- Chi tiết đơn hiện lại ghi chú trong card Giao đến

### 3.31 Thanh toán công nợ, cho phép trả một phần (`31-PayAmount.png`)
- Vào từ: nút "Thanh toán công nợ" trên thẻ Công nợ (9), thẻ Trang chủ khi vượt hạn mức (26), sheet 27
- RadioCard: "Hoá đơn gần hạn nhất" / "Toàn bộ dư nợ" / "Số tiền khác" (mở rộng: ô nhập số 30/800 gạch chân ink + chip 20 tr / 50 tr / 100 tr)
- Khối okTint: "Khi BQ ghi nhận, hạn mức khả dụng tăng thêm X"
- Ghi chú quy tắc cấn trừ (chờ BQ xác nhận)
- Dock: "Tạo mã chuyển khoản" → màn Chuyển khoản (10) với số tiền đã chọn; nội dung chuyển khoản không gắn số hoá đơn khi trả số tiền khác (ví dụ "DL0215 TT")

### 3.32 Sửa và xoá địa chỉ (`32-AddressEdit.png`) — dựng trong SHEET, xem §5-M.1
- Vào từ nút "Sửa" ở Sổ địa chỉ (23). Form như 3.25, điền sẵn; Tỉnh/TP và Phường/Xã cùng một hàng 2 cột
- Nút outline danger "Xoá địa chỉ này" (hỏi xác nhận trước khi xoá). Địa chỉ mặc định: nút vô hiệu + ghi chú "Địa chỉ mặc định không xoá được: hãy đặt địa chỉ khác làm mặc định trước"
- Nút "Lưu thay đổi" nằm NGOÀI vùng cuộn, dán đáy sheet nên luôn ở trên bàn phím
- Ảnh vẽ một màn riêng; bản dựng để trong bottom sheet cao ≥ 90% (quyết định §5-M.1). Ảnh vẫn đúng về nội dung và thứ tự trường

### 3.33 Xoá tài khoản (`33-DeleteAccount.png`)
- Vào từ Hồ sơ (link chữ danger "Xoá tài khoản" cùng hàng với "Đăng xuất"). Bắt buộc theo quy định App Store với app có đăng nhập
- Danh sách hệ quả (không đăng nhập được nữa; chứng từ vẫn được lưu theo quy định kế toán; công nợ vẫn phải thanh toán; đơn chờ duyệt bị huỷ)
- Khối warnTint nếu còn dư nợ
- Checkbox xác nhận; nút nền danger "Gửi yêu cầu xoá" vô hiệu cho tới khi tick. Nội dung pháp lý cụ thể chờ BQ xác nhận

---

## 4. Hành vi chung
- Định dạng tiền: `1.080.000đ` (dấu chấm hàng nghìn, chữ đ liền sau). Số rút gọn: `312,4 tr`, `1,2 tỷ`
- Kéo xuống để làm mới ở các màn tab (màu spinner brand). Loading: skeleton theo hình khối, không spinner toàn màn
- Nội dung cuộn phải có padding dưới đủ để không bị TabBar/Dock che (TabBar: ≥ 120; Dock: bằng chiều cao dock + 16). Lưu ý: trong ảnh 06-Cart và 10-Transfer, phần cuối nội dung bị dock đè là giới hạn của khung mock cố định, app thật phải cuộn được tới hết
- Phản hồi nhấn: scale 0.98 cho Pill/card, 0.94 cho IconButton; không có animation tự chạy
- Hỗ trợ Dynamic Type tới cỡ lớn hơn 1 bậc mà không vỡ bố cục: tên sản phẩm cắt 2 dòng, số tiền dùng `adjustsFontSizeToFit` khi cần

## 5. Sửa đổi sau review (ưu tiên cao hơn phần còn lại của SPEC)
- **A. Cam làm chữ:** nền cam có chữ trắng = `brand #D23E14`; chữ cam trên nền sáng (canvas, paper, tint) = `brandDeep #B8330D` (5.48:1 trên canvas, 5.17:1 trên tint). Token ngữ nghĩa `textBrand = brandDeep`
- **B.** Đầu cột bảng hoá đơn VAT 13px. Chữ mang thông tin ≥ 13px, không ngoại lệ
- **C. VAT (ĐÃ SỬA sau rà soát dữ liệu thật):** giá trong app là giá CHƯA gồm VAT. Giỏ hàng và Chi tiết đơn hiện Tạm tính / VAT x% / Tổng đúng số backend trả về; dock ghi "Tổng thanh toán, đã gồm VAT". Khi API chưa trả trường VAT: bỏ dòng VAT, ghi "Giá chưa gồm VAT" (13 muted) ngay trên Tổng. App không tự tính, không hardcode 8%. Mọi so sánh hạn mức dùng tổng đã gồm VAT nếu BQ ghi nợ theo tổng hoá đơn (chờ BQ xác nhận)
- **D. Gửi đơn:** đang gửi (spinner trong Pill, khoá thao tác, chống gửi trùng) → thiếu hàng: sheet "Tồn kho đã thay đổi" theo khuôn 14-OverLimit (lựa chọn "Đặt theo số còn lại" / "Bỏ size này") → lỗi mạng: giữ giỏ, toast "Thử lại" → thành công: màn xác nhận khuôn empty state (icon check okTint, "Đã gửi đơn DH-…", nút "Xem đơn" / "Về trang chủ")
- **E.** `flame` vs cam logo: chưa chốt, giữ một token duy nhất
- **F.** Sau "Tôi đã chuyển khoản": hoá đơn ở Công nợ hiện tag info "Đang chờ BQ ghi nhận" thay nút "Trả ngay"
- **G. Không có màn "Xác nhận đơn" riêng.** Gửi đơn thẳng từ Giỏ hàng. Route checkout cũ bị xoá sau khi chuyển hết logic và xử lý lỗi sang Giỏ hàng
- **H. Địa chỉ giao hàng = sổ địa chỉ của đại lý** (3.24, 3.25). Kho xuất của BQ do backend cấu hình, KHÔNG hiển thị trên app. Danh sách cứng "Kho HCM / Hà Nội / Đà Nẵng" trong code cũ bị bỏ. Đơn gửi lên phải mang `addressId` có cấu trúc, không ghép vào ghi chú
- **I. Hình thức thanh toán:** hiển thị read-only theo điều khoản hợp đồng của đại lý (ví dụ "Công nợ 30 ngày"), KHÔNG có bộ chọn theo từng đơn, chờ BQ xác nhận. Danh sách 3 lựa chọn trong code cũ bị bỏ
- **K. Rà soát với dữ liệu thật (23/10/2026):** thêm 3.26–3.33; 3.8 dùng 5 bước theo backend; Hồ sơ thêm "Điều khoản và chính sách" và "Xoá tài khoản"; nhãn trạng thái ngắn ("Chờ duyệt", không "Chờ duyệt (vượt hạn mức)"); icon trạng thái đơn theo bước (đồng hồ / hộp / xe tải / check / ×); số tiền mọi nơi dùng "đ"
- **L. Bộ màu theo logo (thay A, E):** `flame #F04F23` (đúng màu logo, cho splash, header Đăng nhập, chấm tiến trình), `brand #D23E14` (nền cam có chữ), `textBrand #B8330D` (chữ cam trên nền sáng, trạng thái nhấn), `tint #FDEBE5`. Cả ba cùng sắc ≈13° với logo. Thay toàn bộ giá trị cũ #C24E00 / #9E3F00 / #E65C00 / #FDEDE2 trong `packages/tokens`, splash và native splash
- **M. Ba chỗ bản dựng lệch ảnh, đã quyết (23/10/2026):**
  1. **Sửa địa chỉ (3.32) GIỮ trong sheet**, không tách màn riêng. Điều kiện: sheet cao ≥ 90% khi sửa; `KeyboardAvoidingView` + vùng cuộn; nút "Lưu thay đổi" luôn nằm trên bàn phím; xoá phải hỏi xác nhận; địa chỉ mặc định không xoá được. Thân biểu mẫu tách thành component `AddressForm` dùng chung cho Thêm và Sửa
  2. **Chi tiết đơn (3.8) GIỮ mã vận đơn hai dòng, hiện đủ mã** kèm nút sao chép — mã rút gọn như ảnh thì phải mở chỗ khác mới đọc được đủ. Dòng sản phẩm hiện chip size cho tới khi backend trả màu (A7.2); khi có thì thêm tên màu trước chip size, mỗi màu một hàng
  3. **Trường thiếu dữ liệu thì ẨN, không hiện ô trống hay "—".** Áp cho mọi chỗ dùng thông tin đại lý:
     - MST: ẩn khỏi dòng định danh (`dealerIdLine`)
     - Chiết khấu: chip chỉ ghi "Hạng Vàng" khi thiếu % — áp cả chip ở Hồ sơ lẫn thẻ hạn mức Trang chủ (`tierLabel`)
     - Sale phụ trách: thiếu thì ẩn hẳn **card** "Sale phụ trách" ở Hồ sơ. Mọi nút/câu "Gọi Sale" (3.28 đơn chờ duyệt, 3.18 đơn bị từ chối, 3.16 tìm không ra, 3.14/3.27 sheet vượt hạn mức, 3.13 OTP) rơi về "Gọi tổng đài BQ". Câu chữ dùng "Sale phụ trách sẽ xem xét", không gắn tên người
     - **Hàng "Gọi tổng đài BQ" trong card danh sách ở Hồ sơ:** icon điện thoại trong tròn 40 nền subtle; tiêu đề "Gọi tổng đài BQ"; phụ đề là số hotline (13 muted, tabular-nums); bên phải nút tròn 44 nền `brand` icon điện thoại trắng THAY chevron, chạm là `tel:`. Vị trí: hàng cuối của card danh sách, ngay trên "Điều khoản và chính sách". **LUÔN hiện, kể cả khi đã có Sale phụ trách** — Sale có thể không nghe máy, lúc đó đại lý cần một số khác ngay trên cùng màn. Khi có `sales_rep` thì card "Sale phụ trách" hiện như thiết kế và hàng tổng đài vẫn giữ
     - Số hotline lấy từ `app.json` › `expo.extra.supportPhone` (`TODO(api)`: số thật chưa được BQ xác nhận). **Chưa cấu hình số thì ẩn hàng này và ẩn mọi nút gọi, không hiện số giả** — một số điện thoại sai còn tệ hơn không có số, vì đại lý sẽ gọi nó
     - Một chỗ quyết định duy nhất: `src/lib/support.ts` và `src/lib/dealer.ts`

- **Ngoài phạm vi đợt này:** dark mode, onboarding lần đầu
