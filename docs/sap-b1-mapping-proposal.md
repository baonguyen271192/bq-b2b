# SAP B1 ⇄ BQ — bảng ánh xạ đề xuất (cần BQ xác nhận)

Gửi: bộ phận IT/SAP và bộ phận nghiệp vụ của Giày BQ
Ngày: 2026-10-20

---

## Tài liệu này dùng thế nào

Đây **không phải bảng câu hỏi**. Đây là bảng ánh xạ chúng tôi **đề xuất** dựa trên mô
hình dữ liệu chuẩn của SAP Business One. Việc của BQ chỉ là đọc và **đánh dấu Đúng /
Sai**, chỗ nào sai thì sửa lại một dòng.

Lý do làm theo cách này: nhanh hơn cho BQ, và sai sót lộ ra ngay thay vì ẩn trong câu
chữ mơ hồ.

> **Vì sao không đoán bừa rồi làm:** mã hàng ánh xạ sai sẽ tạo đơn **sai số lượng, sai
> mặt hàng trong ERP thật** — ảnh hưởng tồn kho và kế toán, không sửa lại bằng code
> được. Nên chúng tôi dừng ở đúng 6 điểm dưới đây và chờ xác nhận.

Ký hiệu: ✅ đúng · ❌ sai (xin ghi lại cho đúng) · ❓ không chắc

---

## PHẦN A — dành cho IT/SAP (trả lời bằng dữ liệu)

### A1. Mã hàng theo size ⚠️ quan trọng nhất

Chúng tôi giả định **mỗi size là một `ItemCode` riêng**, dạng `<mã gốc>-<size>`:

| Mã trong B1 | Nghĩa |
|---|---|
| `GBW0295-35` | mẫu GBW0295, size 35 |
| `GBW0295-36` | mẫu GBW0295, size 36 |

| | |
|---|---|
| ✅ / ❌ / ❓ | |
| Nếu sai, mã thật trông thế nào? | |
| Size nằm ở trường nào khác (UDF `U_Size`…)? | |
| BQ có dùng add-on matrix của bên thứ ba không? | |

**Cách trả lời nhanh nhất** — gửi kèm kết quả của một trong hai:

```
# Service Layer (OData)
GET /b1s/v1/Items?$select=ItemCode,ItemName,ItemsGroupCode&$filter=startswith(ItemCode,'GBW0295')
```
```sql
-- Hoặc truy vấn trực tiếp (chỉ đọc)
SELECT TOP 20 "ItemCode", "ItemName", "ItmsGrpCod" FROM OITM WHERE "ItemCode" LIKE 'GBW0295%';
```

Chọn mẫu giày nào cũng được, miễn là **có đủ các size**.

---

### A2. Bảng giá và bậc đại lý

BQ có 4 bậc: **Đồng · Bạc · Vàng · Kim Cương**. Chúng tôi giả định mỗi bậc ứng với một
Price List trong B1, gán sẵn trên hồ sơ khách (`PriceListNum` của `BusinessPartners`).

| | |
|---|---|
| ✅ / ❌ / ❓ | |
| Số Price List ⇄ tên bậc (điền vào) | 1 = ____ · 2 = ____ · 3 = ____ · 4 = ____ |
| Có `SpecialPrices` (giá riêng theo từng khách) ghi đè không? | Có / Không |

```
GET /b1s/v1/PriceLists?$select=PriceListNo,PriceListName
```
```sql
SELECT "ListNum", "ListName" FROM OPLN;
```

---

### A3. Hồ sơ đại lý và hạn mức công nợ

Chúng tôi giả định đọc từ `BusinessPartners` (`CardType = cCustomer`):

| Trường BQ cần | Trường B1 |
|---|---|
| Hạn mức công nợ | `CreditLimit` |
| Công nợ hiện tại | `CurrentAccountBalance` |
| Bậc đại lý | `PriceListNum` (xem A2) |

| | |
|---|---|
| ✅ / ❌ / ❓ | |
| Nếu BQ quản hạn mức bằng quy trình riêng (không dùng `CreditLimit`), thì ở đâu? | |

```
GET /b1s/v1/BusinessPartners('DL001')?$select=CardCode,CardName,PriceListNum,CreditLimit,CurrentAccountBalance
```

Xin **một** đại lý bất kỳ là đủ; che thông tin nhạy cảm cũng được.

---

### A4. Sổ địa chỉ giao hàng của đại lý ⚠️ hiện CHƯA có đường về B1

**Hiện trạng trong mã — đây là lỗ hổng, không phải đề xuất.**

`SapB1Orders.create()` (`apps/api-java/.../adapters/sapb1/SapB1Orders.java:52`) làm hai
việc tách rời:

| | Giá trị | Vào đâu trong B1 |
|---|---|---|
| Kho xuất | `bq.sapb1.warehouse` — **một giá trị cố định trong cấu hình** | `DocumentLine.WarehouseCode` |
| Nơi đại lý nhận hàng | chuỗi đại lý chọn trên app | **chỉ nối vào `Comments`**: `"BQ app · Kho HCM · Công nợ 30 ngày"` |

Tức địa chỉ giao hàng đang là **ghi chú tự do** (`Comments` của B1 cắt ở 254 ký tự),
không phải dữ liệu có cấu trúc. Không có `ShipToCode` hay `AddressExtension` ở bất kỳ
đâu trong `apps/api-java`. Kho xuất của BQ và nơi đại lý nhận hàng là hai khái niệm
khác nhau nhưng đang bị trộn vào một trường.

Giao diện v2 (`docs/design/v2/SPEC.md` §3.23–3.25, quyết định H) yêu cầu đại lý có
**sổ địa chỉ riêng**, mỗi địa chỉ có người nhận và số điện thoại, và đơn gửi lên phải
mang **mã địa chỉ có cấu trúc**.

#### A4.1 Ánh xạ đề xuất

Đề xuất dựa trên mô hình chuẩn của B1: địa chỉ giao hàng nằm trong
`BusinessPartners.BPAddresses` với `AddressType = bo_ShipTo`, và đơn chọn một địa chỉ
bằng `ShipToCode`.

| Trường BQ cần | Trường B1 đề xuất |
|---|---|
| Mã địa chỉ (khoá) | `BPAddresses.AddressName` — duy nhất trong phạm vi một đại lý |
| Tên gợi nhớ ("Kho Hội An") | `BPAddresses.AddressName` |
| Tỉnh / Thành phố | `BPAddresses.State` (hoặc `City` — xin BQ chốt, xem A4.3) |
| Phường / Xã | `BPAddresses.County` |
| Số nhà, tên đường | `BPAddresses.Street` + `StreetNo` |
| Quốc gia | `BPAddresses.Country = "VN"` |
| Địa chỉ đã chọn cho đơn | `Orders.ShipToCode` = `AddressName` tương ứng |

> ⚠️ Tên trường trong bảng trên lấy theo mô hình Service Layer chuẩn, **chúng tôi chưa
> đối chiếu với bản B1 thật của BQ**. Xin IT xác nhận bằng một lần gọi thật (A4.4).

| | |
|---|---|
| ✅ / ❌ / ❓ | |
| Nếu sai, BQ đang lưu địa chỉ giao hàng của đại lý ở đâu? | |

#### A4.2 Người nhận và số điện thoại — chưa có chỗ chuẩn

`BPAddresses` của B1 **không có trường số điện thoại**. Nhưng giao diện v2 bắt buộc mỗi
địa chỉ có người nhận + SĐT (tài xế gọi trước khi giao). Ba cách, xin BQ chọn **một**:

| | Cách làm | Đánh đổi |
|---|---|---|
| 1 | UDF trên địa chỉ: `U_BQ_Recipient`, `U_BQ_Phone` | Sạch nhất, nhưng BQ phải tạo 2 UDF trên `BPAddresses` |
| 2 | Dùng `ContactEmployees` của đại lý, đơn gửi kèm `ContactPersonCode` | Không cần UDF, nhưng người liên hệ và địa chỉ là hai danh sách rời nhau — đại lý phải ghép đúng cặp |
| 3 | Sổ địa chỉ nằm trong CSDL của BQ, chỉ đẩy sang B1 phần `AddressExtension` của từng đơn | Không đụng dữ liệu gốc B1, nhưng B1 không có sổ địa chỉ để dùng cho kênh khác |

| | |
|---|---|
| Chọn cách nào (1 / 2 / 3)? | |

#### A4.3 Đơn vị hành chính 2 cấp

Từ 2025 Việt Nam bỏ cấp huyện, địa chỉ còn **Tỉnh/Thành phố → Phường/Xã**. B1 có bốn ô
`State`, `City`, `County`, `Street`. Cần chốt ô nào giữ cấp nào, vì chọn sai thì **phiếu
giao hàng và hoá đơn in ra sai địa chỉ**.

| | |
|---|---|
| Tỉnh/TP nằm ở trường nào? | |
| Phường/Xã nằm ở trường nào? | |
| B1 của BQ đã khai bảng `States` cho Việt Nam chưa? | |

#### A4.4 Ai được tạo địa chỉ mới — câu hỏi quan trọng nhất phần này

Giao diện v2 cho **đại lý tự thêm địa chỉ** ngay trong lúc đặt hàng (§3.25). Nếu ánh xạ
thẳng vào `BPAddresses` thì **đại lý đang ghi vào dữ liệu gốc của ERP**. Nhiều nơi
không cho phép điều đó.

| | |
|---|---|
| Đại lý được tự thêm địa chỉ vào B1 không? (Có / Không / Phải qua Sale duyệt) | |
| Nếu không: lưu ở CSDL BQ rồi chỉ đẩy `AddressExtension` theo từng đơn — chấp nhận được không? | |

Xin một lần gọi thật để chúng tôi đối chiếu tên trường:

```
GET /b1s/v1/BusinessPartners('DL001')?$select=CardCode,BPAddresses
```

---

### A5. Làm tròn trên hoá đơn VAT

Giao diện v2 (quyết định C) chốt: **app hiển thị đúng số hệ thống trả về, không tự
tính, không hardcode thuế suất**. Nhưng số trong bộ ảnh thiết kế đang không khớp nhau:

| Dòng | Số |
|---|---|
| Đơn giá chưa thuế | `462.963` |
| Số lượng | `40` |
| `462.963 × 40` | `18.518.520` |
| Thành tiền ghi trên hoá đơn | `18.518.519`  ← lệch 1 đồng |
| Tiền thuế | `1.481.481` |
| Tổng thanh toán | `20.000.000` |

Lệch 1 đồng vì thành tiền đang **tính ngược từ tổng đã gồm thuế** (`20.000.000 / 1,08`)
chứ không nhân lên từ đơn giá. Kế toán sẽ hỏi.

| | |
|---|---|
| Quy tắc làm tròn chính thức là gì? (nhân lên từ đơn giá / chia ngược từ tổng) | |
| Thuế suất do hệ thống HĐĐT quyết hay do B1 quyết? | |
| Trường nào trả về thuế suất? | |

App sẽ hiển thị nguyên số nhận được. Xin backend trả về **bộ số đã nhất quán** để app
không phải chọn hộ.

---

### A6. Hợp đồng API đề xuất cho `createOrder`

Hệ quả của A4 và của quyết định I (hình thức thanh toán read-only theo hợp đồng).

**Hiện tại** (`CreateOrderRequest.java`):

```jsonc
POST /api/orders
{
  "dealer_code": "DL001",
  "lines": [{ "code": "OX-001", "sizes": { "40": 8, "41": 12 } }],
  "delivery": "Kho HCM",          // chuỗi tự do -> rơi vào Comments
  "payment":  "Công nợ 30 ngày",  // app tự chọn
  "channel":  "app"
}
```

**Đề xuất:**

```jsonc
POST /api/orders
{
  "dealer_code": "DL001",
  "lines": [{ "code": "OX-001", "sizes": { "40": 8, "41": 12 } }],
  "address_id": "KHO-HOI-AN",     // MỚI, bắt buộc với channel=app
  "channel":    "app"
}
```

| Thay đổi | Lý do |
|---|---|
| Thêm `address_id` | Quyết định H. Server tự tra ra `ShipToCode` + `AddressExtension`. `address_id` không thuộc đại lý đó → **422**, không im lặng rơi về mặc định |
| Bỏ `payment` khỏi request | Quyết định I. Điều khoản công nợ là thuộc tính hợp đồng của đại lý, không phải lựa chọn từng đơn. Server đọc từ hồ sơ đại lý |
| `delivery` thành **deprecated** | Giữ lại để Web Admin và dữ liệu cũ không vỡ. App bỏ hẳn. Bỏ luôn `deliveryOrDefault()` trả `"Kho HCM"` — mặc định ngầm kiểu này là nguồn gốc của chính sự lẫn lộn ở A4 |
| Thêm idempotency key | Quyết định D: chống gửi trùng khi mạng chập chờn |

**Endpoint mới cần có:**

```
GET    /api/dealers/{code}/addresses              danh sách sổ địa chỉ
POST   /api/dealers/{code}/addresses              thêm (phụ thuộc A4.4)
PATCH  /api/dealers/{code}/addresses/{id}         sửa
DELETE /api/dealers/{code}/addresses/{id}         xoá
PUT    /api/dealers/{code}/addresses/{id}/default đặt mặc định
GET    /api/geo/provinces                         Tỉnh/TP, nguồn chính thức
GET    /api/geo/provinces/{code}/wards            Phường/Xã theo tỉnh
```

Dạng một địa chỉ:

```jsonc
{
  "id": "KHO-HOI-AN",
  "label": "Kho Hội An",
  "recipient": "Trần Văn Bình",
  "phone": "0905 662 731",
  "province_code": "49", "province": "Quảng Nam",
  "ward_code": "20350",  "ward": "Phường Cẩm Châu",
  "street": "210 Cửa Đại",
  "is_default": false
}
```

> Dữ liệu demo hiện tại (`demo/dealers.json`) chỉ có `invoice_address` — **chưa có sổ
> địa chỉ nào**. Màn §3.23 sẽ chạy bằng mock gắn `// TODO(api)` cho tới khi có endpoint.

---

### A7. Ba lỗ hổng phát hiện khi dựng giao diện v2 ⚠️

Ba việc dưới đây **không phải chuyện giao diện**. Chúng phát hiện được vì màn hình
cần số liệu mà API không có, hoặc có nhưng sai cách.

#### A7.1 Backend LỌC IM LẶNG size vượt tồn kho

`OrderService.create` duyệt từng size với điều kiện `qty <= stock`; size nào không
thoả thì **bỏ hẳn khỏi đơn**, rồi vẫn tạo đơn thành công. Comment trong mã ghi:
*"Lọc im lặng thay vì báo lỗi là hành vi của bản Python — giữ nguyên để FE không
phải đổi."*

Hệ quả thật: đại lý đặt 6 đôi size 40, đơn tạo xong **không có size 40 nào**, và
không màn nào báo gì. Họ chỉ phát hiện khi hàng về thiếu.

App v2 đang vá bằng cách gọi thêm `GET /api/products` **trước mỗi lần đặt** để tự
so sánh (`checkStock`). Cách này tốn một vòng gọi và vẫn còn khe hở đua giữa hai
lần gọi.

| | |
|---|---|
| Đề xuất: trả **lỗi có cấu trúc** (mã lỗi + danh sách `{code, size, wanted, left}`) thay vì lọc im lặng. ✅ / ❌ | |
| Nếu giữ hành vi cũ, ai chịu trách nhiệm báo cho đại lý? | |

#### A7.2 Màu sản phẩm không đi được vào đơn — **ƯU TIÊN CAO**

`Product.colors` đã có và app đã cho đại lý chọn màu (SPEC §3.4, §3.5). Nhưng
`OrderItem` và giỏ hàng chỉ có `code` + `sizes` — **không có trường màu**. Đại lý
chọn "Nâu" rồi đặt thì BQ nhận đơn không biết màu nào.

Giao diện hiện để lựa chọn màu ở mức **chỉ đổi thứ đang xem**, kèm cảnh báo trong
mã, chứ không âm thầm bỏ đi.

| | |
|---|---|
| Thêm `color` vào `OrderItem` và payload tạo đơn? ✅ / ❌ | |
| Một mã + nhiều màu là **một dòng nhiều màu** hay **nhiều dòng**? | |
| Trong B1, màu là `ItemCode` riêng hay thuộc tính của dòng? | |

**Hệ quả đo được khi rà soát 23/10:** một đơn đặt nhiều màu của CÙNG một mẫu
hiện ra không phân biệt được màu nào bao nhiêu đôi — màn Chi tiết đơn chỉ hiện
chip size cộng dồn. Thiết kế `08-OrderDetail.png` vẽ "Đen 24 đôi, Nâu 12 đôi",
app không dựng được dòng đó. Đây là lý do nâng mức ưu tiên.

#### A7.3 Thiếu endpoint "đại lý báo đã chuyển khoản"

`POST /api/orders/{id}/pay` ghi nhận thanh toán và **giảm công nợ ngay**
(`OrderController.pay`). Đó là thao tác **đối soát của BQ**. App đại lý **không
gọi** nó — gọi nghĩa là đại lý tự xoá nợ của mình.

Nút "Tôi đã chuyển khoản" (SPEC §3.10) vì vậy hiện chỉ ghi nhận trong phiên, và
hoá đơn đổi sang nhãn "Chờ BQ ghi nhận".

| | |
|---|---|
| Thêm `POST /api/orders/{id}/payment-declared` (không đổi công nợ, chỉ báo cho BQ)? ✅ / ❌ | |
| BQ muốn nhận thông báo đó qua đâu: màn admin, email, Zalo? | |

---

## PHẦN B — dành cho bộ phận nghiệp vụ (không cần biết kỹ thuật)

Ba câu dưới đây **không có trong dữ liệu** — chúng là chính sách của BQ, phải người
làm nghiệp vụ quyết.

### B1. Trạng thái đơn hàng — ✅ BQ đã xác nhận trong họp

BQ cho biết SAP B1 **đã có sẵn đúng 5 trạng thái** trùng với 5 bước của BQ. Rất tốt —
phần code đã viết xong và **chờ đúng hai thông tin**:

| Cần biết | Điền vào |
|---|---|
| 5 trạng thái đó nằm ở **trường nào** trên đơn bán? | `_____________` (vd `U_BQ_Status`) |
| Giá trị lưu trong trường đó là gì? | xem bảng dưới |

| Bước của BQ | Giá trị trong SAP |
|---|---|
| Chờ xác nhận | `______` |
| Đã xác nhận | `______` |
| Đang đóng gói | `______` |
| Đang bàn giao vận chuyển | `______` |
| Đại lý đã nhận | `______` |

*(Nếu SAP lưu thẳng chữ tiếng Việt như trên thì ghi "lưu nguyên chữ" là đủ.)*

**Cách trả lời nhanh nhất** — mở một đơn bán bất kỳ trong SAP, cho biết tên trường
hiển thị trạng thái; hoặc gửi kết quả:

```
GET /b1s/v1/Orders(<DocEntry>)
```
rồi chỉ cho chúng tôi trường nào trong kết quả đó là trạng thái.

> **Một điểm cần đối chiếu:** SAP B1 chuẩn trên đơn bán chỉ phân biệt *đang mở* /
> *đã đóng*. 5 trạng thái của BQ vì vậy gần như chắc chắn nằm trong một **trường tuỳ
> biến (UDF)** do BQ tự thêm. Nếu thực ra chúng là 5 **chứng từ** khác nhau (đơn bán →
> phiếu soạn hàng → phiếu giao → hoá đơn) thì xin nói rõ — cách ánh xạ sẽ khác.

**Còn một câu phụ:** khi sale duyệt đơn vượt hạn mức, SAP có lưu **ai duyệt** và **ghi
chú duyệt** không? Nếu có thì ở trường nào? *(Hiện chúng tôi chưa ghi hai thông tin
này sang SAP vì chưa biết chỗ.)*

---

### B2. Tồn kho bán được tính thế nào

Khi đại lý đặt 10 đôi size 38, hệ thống so với con số nào?

- [ ] Tồn thực tế trong kho
- [ ] Tồn thực tế **trừ** phần đã giữ cho đơn khác *(đề xuất của chúng tôi)*
- [ ] Trừ cả hàng đang về
- [ ] Cách khác: ______________________

**Kho nào dùng để bán sỉ?** Mã kho: ____________
*(Để trống = cộng tồn mọi kho, sẽ ra số lớn hơn lượng thực bán được.)*

---

### B3. Ghi nhận thanh toán

Khi đại lý trả tiền, SAP đối trừ vào đâu?

- [ ] Vào **hoá đơn bán** (A/R Invoice) *(đề xuất của chúng tôi — quy trình chuẩn)*
- [ ] Vào **đơn hàng**
- [ ] Cách khác: ______________________

**Quy trình hiện tại của BQ là:** Đơn bán → Giao hàng → Hoá đơn → Thu tiền?
✅ / ❌ (nếu khác, xin mô tả ngắn)

---

## PHẦN C — hạ tầng (IT)

### C1. Kết nối tới Service Layer

| | |
|---|---|
| Địa chỉ Service Layer | `https://________:50000/b1s/v____` |
| B1 chạy trên **SAP HANA** hay **MS SQL Server**? | |
| Phiên bản + Patch Level | |
| Service Layer có truy cập được từ **ngoài mạng nội bộ** không? | Có / Không |

> Nếu **không**: hệ thống BQ phải đặt trong mạng của BQ, hoặc nối qua VPN. Đây là
> quyết định hạ tầng cần chốt sớm vì nó ảnh hưởng tới nơi triển khai và tiến độ.

### C2. Tài khoản tích hợp

| | |
|---|---|
| Có môi trường **test/sandbox** riêng không? | Có / Không |
| Thời gian dự kiến cấp tài khoản | |

---

### A8. Trường còn thiếu trong `GET /api/dealers/{code}` ⚠️

Phát hiện khi dựng Hồ sơ và thẻ hạn mức theo bộ ảnh v2 (SPEC §3.11, §3.26). Ba
trường thiết kế có mà API không trả, nên app đang **ẩn** đúng phần đó thay vì
hiện ô trống — xem quyết định SPEC §5-M.3.

| Trường | Thiết kế dùng ở đâu | Nguồn trong SAP B1 |
|---|---|---|
| `tax_code` | Hồ sơ, dòng dưới tên: "DL-0215, MST 0401 234 567". Cũng là trường bắt buộc trên hoá đơn VAT | `BusinessPartners.FederalTaxID` |
| `discount_percent` | Chip hạng: "Hạng Vàng, CK 20%" — hiện chỉ ghi được "Hạng Vàng" | nhóm chiết khấu theo hạng, hoặc `SpecialPrices` |
| `sales_rep { name, phone }` | Card "Sale phụ trách" ở Hồ sơ, và mọi nút "Gọi Sale" trong app | `BusinessPartners.SalesPersonCode` → `SalesPersons` |

Thiếu `sales_rep` là thiếu nặng nhất: năm luồng trong app có nút gọi người hỗ
trợ (đơn chờ duyệt, đơn bị từ chối, tìm không ra, sheet vượt hạn mức, màn OTP),
cả năm đang phải rơi về tổng đài chung. Đại lý gọi tổng đài rồi mới được chuyển
máy tới đúng Sale của mình.

**Số tổng đài hiện dùng (`02363745745`) lấy từ ảnh thiết kế `11-Profile.png`,
BQ chưa xác nhận.** Nó nằm ở `app.json` › `expo.extra.supportPhone`, đổi một chỗ.


## Việc sẽ làm sau khi nhận xác nhận

| Phần | Nếu đúng như đề xuất | Nếu khác |
|---|---|---|
| A1 mã size | đổi 1 biến cấu hình | viết lại hàm tách mã (khoanh vùng 1 file) |
| A2 bảng giá | đổi 1 biến cấu hình | viết lại cách lấy giá |
| A3 hồ sơ đại lý | không phải sửa gì | ánh xạ lại trường |
| B1 trạng thái | nối vào Pick List + Delivery | cần BQ tạo UDF, hoặc đổi thiết kế |
| B2 tồn kho | đổi công thức (1 dòng) | — |
| B3 thanh toán | nối IncomingPayments | đổi cách đối trừ |
| A4 sổ địa chỉ | thêm `ShipToCode` vào payload + 5 endpoint mới | tuỳ cách chọn ở A4.2/A4.4, có thể phải dựng sổ địa chỉ trong CSDL BQ |
| A5 làm tròn VAT | app không sửa gì — chỉ hiển thị | backend chỉnh nguồn số |
| A6 hợp đồng API | thêm `address_id`, bỏ `payment`, `delivery` deprecated | — |
| A7.1 lọc tồn kho | app bỏ được vòng gọi `checkStock` phụ | giữ nguyên, app tiếp tục tự so sánh |
| **A7.2 màu vào đơn — ƯU TIÊN CAO** | thêm một trường, app đã sẵn sàng gửi | bỏ hẳn chức năng chọn màu khỏi giao diện |
| A8 trường hồ sơ đại lý | thêm 3 trường, app tự hiện phần đang ẩn | giữ nguyên, app tiếp tục ẩn và dùng tổng đài chung |
| A7.3 báo đã chuyển khoản | nối một endpoint | giữ nguyên, BQ đối soát thủ công như hiện nay |

Phần đã xong và **không phụ thuộc** các câu trên: đăng nhập, giữ phiên, phân trang,
đọc danh mục, đọc hồ sơ đại lý, tạo đơn bán, cache, xử lý lỗi.
