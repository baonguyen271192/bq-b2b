# @bq/contracts

Hợp đồng API của BQ, dạng OpenAPI. **Nguồn sự thật dùng chung** giữa backend,
`apps/web` và `apps/mobile`.

## Vì sao package này tồn tại

Backend thật của BQ là adapter sang **SAP Business One**
(`apps/api-java/.../adapters/sapb1/`). Nếu FE và Mobile phụ thuộc trực tiếp vào
backend, mọi thay đổi bên dưới đều lan ra giao diện.

Có contract tách riêng thì ranh giới rõ ràng:

- Backend **phục vụ** contract này.
- `apps/web` và `apps/mobile` **tiêu thụ** nó (qua `@bq/types` + `@bq/api-client`).
- Đổi backend mà contract không đổi → FE/Mobile không phải sửa gì.

## Cập nhật

Sinh từ `apps/api-java` bằng springdoc:

```bash
pnpm dev:api                            # backend Java ở cổng 8100
pnpm --filter=@bq/contracts pull        # hoặc: pnpm contracts:pull
```

`apps/api-java` có test (`OpenApiContractTest`) bảo đảm spec sinh ra **mô tả đúng**
JSON mà API thật trả về — từng dính lỗi spec ghi `dealerCode` còn API trả
`dealer_code`.

Commit `openapi.json` cùng thay đổi backend. Diff của file này chính là **bằng chứng
hợp đồng có vỡ hay không** — hãy đọc nó trong code review.
