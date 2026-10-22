import { vnd } from "@bq/core";
import { Num } from "./Num";
import type { TProps } from "./T";

export interface PriceProps extends Omit<TProps, "children"> {
  value: number;
  /** Hậu tố sau số tiền, vd "/đôi". Nhỏ hơn và mờ hơn phần số. */
  suffix?: string;
}

/**
 * Số tiền VND đã định dạng, luôn tabular-nums.
 * Dùng thay cho việc gọi `vnd()` rồi bọc trong {@link Num} ở từng chỗ — để định
 * dạng tiền chỉ có MỘT nguồn.
 */
export function Price({ value, suffix, variant = "bodyStrong", ...rest }: PriceProps) {
  return (
    <Num variant={variant} {...rest}>
      {vnd(value)}
      {suffix ? <Num variant="chip" tone="muted">{suffix}</Num> : null}
    </Num>
  );
}
