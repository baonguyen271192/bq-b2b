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

## Việc sẽ làm sau khi nhận xác nhận

| Phần | Nếu đúng như đề xuất | Nếu khác |
|---|---|---|
| A1 mã size | đổi 1 biến cấu hình | viết lại hàm tách mã (khoanh vùng 1 file) |
| A2 bảng giá | đổi 1 biến cấu hình | viết lại cách lấy giá |
| A3 hồ sơ đại lý | không phải sửa gì | ánh xạ lại trường |
| B1 trạng thái | nối vào Pick List + Delivery | cần BQ tạo UDF, hoặc đổi thiết kế |
| B2 tồn kho | đổi công thức (1 dòng) | — |
| B3 thanh toán | nối IncomingPayments | đổi cách đối trừ |

Phần đã xong và **không phụ thuộc** các câu trên: đăng nhập, giữ phiên, phân trang,
đọc danh mục, đọc hồ sơ đại lý, tạo đơn bán, cache, xử lý lỗi.
