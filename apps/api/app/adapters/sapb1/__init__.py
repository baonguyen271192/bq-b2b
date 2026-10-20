"""Adapter SAP Business One — bật sau khi ký hợp đồng (BQ_DATA_SOURCE=sapb1).

TRẠNG THÁI: KHUNG. Luồng xác thực/phân trang/HTTP đã viết đủ dùng; phần ÁNH XẠ
dữ liệu cố tình raise `NeedsMapping` thay vì đoán bừa, vì các điểm sau phụ thuộc
vào bản cài B1 thật của BQ và CHƯA được kiểm chứng:

  1. Bảng size (QUAN TRỌNG NHẤT). B1 không có size-matrix gốc. Mỗi size nhiều khả
     năng là một ItemCode riêng (GBW0295-35, GBW0295-36...) gom theo item cha/UDF,
     hoặc do add-on matrix quản lý. Quy tắc gom nằm ở `mapping.parse_item_code`.
  2. HANA hay MS SQL Server, version + Patch Level (ảnh hưởng b1s/v1 hay v2).
  3. Bậc giá sỉ: PriceLists gán theo BusinessPartner, hay SpecialPrices theo từng
     cặp khách–hàng, hay UDF riêng.
  4. Hạn mức công nợ: dùng thẳng CreditLimit/CurrentAccountBalance hay quy trình
     duyệt riêng của BQ.

Nguyên tắc bất biến của adapter này: ĐỌC có thể qua Service Layer (hoặc DB read-only
cho báo cáo nặng), nhưng GHI luôn qua Service Layer/DI API — không bao giờ INSERT/
UPDATE thẳng vào bảng B1.
"""

from .service_layer import NeedsMapping, ServiceLayerClient, ServiceLayerError

__all__ = ["ServiceLayerClient", "ServiceLayerError", "NeedsMapping"]
