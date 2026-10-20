# @bq/contracts

Hợp đồng API của BQ, dạng OpenAPI. **Nguồn sự thật dùng chung** giữa backend,
`apps/web` và `apps/mobile`.

## Vì sao package này tồn tại

Backend thật của BQ sẽ là adapter sang **SAP Business One** (xem
`apps/api/app/adapters/sapb1/`), và tại thời điểm viết, stack cuối cùng của backend
chưa chốt. Nếu FE và Mobile phụ thuộc trực tiếp vào backend, mọi thay đổi bên dưới
đều lan ra giao diện.

Có contract tách riêng thì ranh giới rõ ràng:

- Backend **phục vụ** contract này.
- `apps/web` và `apps/mobile` **tiêu thụ** nó (qua `@bq/types` + `@bq/api-client`).
- Đổi backend mà contract không đổi → FE/Mobile không phải sửa gì.

## Cập nhật

```bash
# Backend đang chạy ở cổng 8100
pnpm --filter=@bq/contracts pull
```

Commit `openapi.json` cùng thay đổi backend. Diff của file này chính là **bằng chứng
hợp đồng có vỡ hay không** — hãy đọc nó trong code review.
