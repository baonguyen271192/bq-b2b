// Địa chỉ nhận hàng CỦA ĐẠI LÝ — BQ giao tới địa chỉ được chọn (mô hình B2B).
// Dùng chung cho checkout, review, và chi tiết đơn để địa chỉ luôn khớp nhau.
export type Warehouse = { label: string; address: string; tag: string; receiver: string; phone: string };

export const WAREHOUSES: Record<string, Warehouse> = {
  "Kho tổng Q.5 (Mặc định)": { label: "Kho tổng Q.5 (Mặc định)", address: "123 Nguyễn Trãi, P.7, Q.5, TP.HCM", tag: "Kho hàng", receiver: "Nguyễn Văn Minh", phone: "0901 234 567" },
  "Cửa hàng Q.1": { label: "Cửa hàng Q.1", address: "45 Lê Lợi, P.Bến Nghé, Q.1, TP.HCM", tag: "Cửa hàng", receiver: "Trần Thị Lan", phone: "0913 999 888" },
  "Chi nhánh Bình Tân": { label: "Chi nhánh Bình Tân", address: "89 Tên Lửa, P.An Lạc, Q.Bình Tân, TP.HCM", tag: "Chi nhánh", receiver: "Lê Văn Hùng", phone: "0905 777 666" },
};
export const WH_KEYS = Object.keys(WAREHOUSES);

// Đơn lưu delivery = nhãn kho (có thể mất hậu tố "(Mặc định)"). Tra khớp linh hoạt.
export function getWarehouse(label?: string): Warehouse | null {
  if (!label) return null;
  if (WAREHOUSES[label]) return WAREHOUSES[label];
  const clean = label.replace(" (Mặc định)", "").trim();
  return Object.values(WAREHOUSES).find((w) => w.label.replace(" (Mặc định)", "").trim() === clean) || null;
}
