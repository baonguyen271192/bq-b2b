import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ORDER_STEPS, ORDER_STEPS_SHORT, orderAwaitingApproval, orderIsOpen, orderStep,
  statusLabel, statusReason,
} from "./order-lifecycle.ts";

/**
 * Chuỗi trạng thái THẬT do backend trả về, chép từ `GET /api/orders?dealer_code=DL001`
 * ngày 23/10/2026. Test bám vào chuỗi thật chứ không vào chuỗi tự nghĩ ra —
 * `orderStep` so khớp bằng `includes`, nên chỉ chuỗi thật mới chứng minh được gì.
 */
const REAL = {
  waiting: "Chờ xác nhận",
  pendingApproval: "Chờ duyệt (vượt hạn mức)",
  confirmed: "Đã xác nhận",
  packing: "Đang đóng gói",
  handover: "Đang bàn giao vận chuyển",
  received: "Đại lý đã nhận",
  rejected: "Đã từ chối",
  cancelled: "Đã huỷ",
} as const;

test("ORDER_STEPS có đúng 5 bước, khớp số nhãn ngắn", () => {
  assert.equal(ORDER_STEPS.length, 5);
  assert.equal(ORDER_STEPS_SHORT.length, 5);
});

test("orderStep: mỗi trạng thái backend về đúng một bậc", () => {
  assert.equal(orderStep(REAL.waiting), 1);
  assert.equal(orderStep(REAL.pendingApproval), 1);
  assert.equal(orderStep(REAL.confirmed), 2);
  assert.equal(orderStep(REAL.packing), 2);
  assert.equal(orderStep(REAL.handover), 3);
  assert.equal(orderStep(REAL.received), 4);
});

test("orderStep: huỷ và từ chối đều là -1", () => {
  assert.equal(orderStep(REAL.rejected), -1);
  assert.equal(orderStep(REAL.cancelled), -1);
  // Viết "hủy" không dấu móc cũng phải bắt được — hai cách gõ đều có trong dữ liệu.
  assert.equal(orderStep("Đã hủy"), -1);
});

test("orderStep: bậc luôn nằm trong -1…4", () => {
  for (const s of Object.values(REAL)) {
    const step = orderStep(s);
    assert.ok(step >= -1 && step <= 4, `${s} -> ${step}`);
  }
});

test("đơn đã nhận thì KHÔNG còn mở; đơn huỷ cũng không", () => {
  assert.equal(orderIsOpen(REAL.received), false);
  assert.equal(orderIsOpen(REAL.rejected), false);
  assert.equal(orderIsOpen(REAL.cancelled), false);
  assert.equal(orderIsOpen(REAL.waiting), true);
  assert.equal(orderIsOpen(REAL.handover), true);
});

test("orderAwaitingApproval chỉ đúng với đơn chờ DUYỆT, không phải chờ xác nhận", () => {
  assert.equal(orderAwaitingApproval(REAL.pendingApproval), true);
  assert.equal(orderAwaitingApproval(REAL.waiting), false);
});

test("statusLabel cắt phần trong ngoặc, statusReason lấy đúng phần đó", () => {
  assert.equal(statusLabel(REAL.pendingApproval), "Chờ duyệt");
  assert.equal(statusReason(REAL.pendingApproval), "vượt hạn mức");
  assert.equal(statusLabel(REAL.received), "Đại lý đã nhận");
  assert.equal(statusReason(REAL.received), null);
  // Chuỗi chỉ có ngoặc thì giữ nguyên, không trả chuỗi rỗng.
  assert.equal(statusLabel("(abc)"), "(abc)");
});
