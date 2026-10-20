#!/usr/bin/env node
/**
 * Kéo đặc tả OpenAPI từ backend đang chạy về `openapi.json` (commit vào repo).
 *
 * Vì sao phải commit file này: nó là HỢP ĐỒNG giữa BE và FE/Mobile. Khi backend
 * đổi stack (FastAPI demo -> adapter SAP B1, hay thậm chí đổi hẳn ngôn ngữ), diff
 * của file này cho thấy NGAY hợp đồng có vỡ hay không — trong khi nếu chỉ sinh lúc
 * build thì không ai nhìn thấy sự thay đổi.
 *
 *   BQ_API_URL=http://localhost:8100 pnpm --filter=@bq/contracts pull
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const base = process.env.BQ_API_URL ?? "http://localhost:8100";
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "openapi.json");

const res = await fetch(`${base}/openapi.json`);
if (!res.ok) {
  console.error(
    `Không lấy được OpenAPI từ ${base} (HTTP ${res.status}).\n` +
      `Khởi động backend trước: cd apps/api && ./.venv/bin/uvicorn app.main:app --port 8100`,
  );
  process.exit(1);
}

const spec = await res.json();
await writeFile(out, JSON.stringify(spec, null, 2) + "\n");

const paths = Object.keys(spec.paths ?? {}).length;
const schemas = Object.keys(spec.components?.schemas ?? {}).length;
console.log(`openapi.json đã cập nhật: ${paths} đường dẫn, ${schemas} schema.`);
