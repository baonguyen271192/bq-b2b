#!/usr/bin/env node
/**
 * Kéo đặc tả OpenAPI từ backend đang chạy về `openapi.json` (commit vào repo).
 *
 * Nguồn sinh là `apps/api-java` (springdoc). Trước đây là service FastAPI; khi
 * Python thu lại chỉ còn làm trợ lý AI thì nguồn đó biến mất.
 *
 * Vì sao phải COMMIT file này thay vì sinh lúc build: nó là HỢP ĐỒNG giữa BE và
 * FE/Mobile. Khi backend đổi (nối SAP B1, đổi adapter, đổi cả ngôn ngữ), diff của
 * file này cho thấy NGAY hợp đồng có vỡ hay không. Sinh lúc build thì không ai
 * nhìn thấy sự thay đổi cho tới khi giao diện hỏng.
 *
 *   # backend Java đang chạy ở 8100
 *   pnpm --filter=@bq/contracts pull
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
      `Khởi động backend trước:\n` +
      `  export JAVA_HOME=$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home\n` +
      `  pnpm dev:api`,
  );
  process.exit(1);
}

const spec = await res.json();
await writeFile(out, JSON.stringify(spec, null, 2) + "\n");

const paths = Object.keys(spec.paths ?? {}).length;
const schemas = Object.keys(spec.components?.schemas ?? {}).length;
console.log(`openapi.json đã cập nhật: ${paths} đường dẫn, ${schemas} schema.`);
