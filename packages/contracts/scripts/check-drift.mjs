#!/usr/bin/env node
/**
 * Đối chiếu kiểu dữ liệu viết tay (`@bq/types`) với hợp đồng OpenAPI của backend.
 *
 * VÌ SAO cần: `@bq/types` do người viết, `openapi.json` do backend Java sinh. Hai
 * nguồn có thể trôi khỏi nhau trong im lặng — backend đổi tên trường, frontend vẫn
 * biên dịch sạch vì nó đang đọc kiểu tự khai, rồi hỏng lúc chạy.
 *
 * VÌ SAO không sinh thẳng type từ OpenAPI: hình dạng sinh ra là
 * `components["schemas"]["Order"]`, kéo theo sửa import ở cả web lẫn mobile và mất
 * toàn bộ chú thích tiếng Việt đang giải thích nghiệp vụ. Đối chiếu bắt được đúng
 * loại lỗi đó mà không phải đánh đổi gì.
 *
 * QUY TẮC BẤT ĐỐI XỨNG — đây là phần quan trọng nhất:
 *   LỖI   frontend khai một trường mà hợp đồng KHÔNG có
 *         -> frontend đang trông chờ dữ liệu backend không gửi
 *   BỎ QUA hợp đồng có trường mà frontend không khai
 *         -> backend gửi dư, frontend không dùng. Bình thường và vô hại.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SPEC = join(ROOT, "packages", "contracts", "openapi.json");
const TYPES_DIR = join(ROOT, "packages", "types", "src");

/**
 * interface của frontend -> schema trong OpenAPI.
 * `null` = cố ý KHÔNG đối chiếu, kèm lý do.
 */
const MAP = {
  Order: "Order",
  OrderItem: "OrderItem",
  Product: "Product",
  Payment: "Payment",
  Analytics: "Analytics",
  CreditDetail: "CreditDetail",
  // FE gọi là Dealer; API trả DealerView (Dealer + công nợ đã tính).
  Dealer: "DealerView",
  CreateOrderInput: "CreateOrderRequest",
  OrderLineInput: "Line",

  // Không đối chiếu — kèm lý do:
  RetailOrder: null,          // thuộc service Commerce, ngoài repo này
  RetailOrderItem: null,      // thuộc service Commerce
  AssistantReply: null,       // Java proxy trợ lý, khai trả JsonNode tự do
  SaleAssistantReply: null,   // như trên
  AssistantProductCard: null, // nằm trong JsonNode
  SaleOrderCard: null,        // nằm trong JsonNode
};

/** Đọc mọi interface xuất ra từ packages/types/src bằng compiler của TypeScript. */
function readInterfaces() {
  const out = {};
  const files = ts.sys
    .readDirectory(TYPES_DIR, [".ts"])
    .filter((f) => !f.endsWith("index.ts"));

  for (const file of files) {
    const sf = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.ES2022,
      true,
    );
    sf.forEachChild((node) => {
      if (!ts.isInterfaceDeclaration(node)) return;
      const exported = node.modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.ExportKeyword,
      );
      if (!exported) return;

      const props = {};
      for (const member of node.members) {
        if (!ts.isPropertySignature(member) || !member.name) continue;
        props[member.name.getText(sf)] = { optional: !!member.questionToken };
      }
      out[node.name.text] = { props, file: file.split("/types/src/")[1] };
    });
  }
  return out;
}

function readSchemas() {
  const spec = JSON.parse(readFileSync(SPEC, "utf8"));
  return spec.components?.schemas ?? {};
}

// --------------------------------------------------------------------------

const interfaces = readInterfaces();
const schemas = readSchemas();

const problems = [];
const notes = [];
let compared = 0;

for (const [name, info] of Object.entries(interfaces)) {
  if (!(name in MAP)) {
    problems.push(
      `interface \`${name}\` (${info.file}) chưa có trong bảng MAP của script này. ` +
        `Thêm ánh xạ tới schema, hoặc đặt null kèm lý do.`,
    );
    continue;
  }
  const schemaName = MAP[name];
  if (schemaName === null) continue;

  const schema = schemas[schemaName];
  if (!schema) {
    problems.push(
      `interface \`${name}\` ánh xạ tới schema \`${schemaName}\`, nhưng openapi.json ` +
        `không có schema đó. Hợp đồng đã đổi?`,
    );
    continue;
  }

  compared++;
  const specProps = Object.keys(schema.properties ?? {});
  const tsProps = Object.keys(info.props);

  // LỖI: frontend khai trường mà hợp đồng không có.
  const missing = tsProps.filter((p) => !specProps.includes(p));
  for (const p of missing) {
    problems.push(
      `${name}.${p} — frontend khai trường này, hợp đồng (${schemaName}) KHÔNG có. ` +
        `Backend sẽ không gửi; đọc ra undefined lúc chạy.`,
    );
  }

  // Ghi chú: hợp đồng dư trường. Không phải lỗi.
  const extra = specProps.filter((p) => !tsProps.includes(p));
  if (extra.length) {
    notes.push(`${name}: hợp đồng có thêm ${extra.map((p) => `\`${p}\``).join(", ")} (frontend chưa dùng)`);
  }
}

// --------------------------------------------------------------------------

console.log(`Đối chiếu @bq/types ⇄ packages/contracts/openapi.json`);
console.log(`  interface đã đối chiếu : ${compared}`);
console.log(`  interface bỏ qua có lý do: ${Object.values(MAP).filter((v) => v === null).length}`);

if (notes.length) {
  console.log(`\n  Ghi chú (không phải lỗi):`);
  for (const n of notes) console.log(`    · ${n}`);
}

if (problems.length) {
  console.error(`\n  ✖ ${problems.length} vấn đề:`);
  for (const p of problems) console.error(`    ✖ ${p}`);
  console.error(
    `\n  Cách xử lý: nếu backend đã đổi, chạy \`pnpm contracts:pull\` rồi sửa @bq/types.`,
  );
  process.exit(1);
}

console.log(`\n  ✓ Không phát hiện drift.`);
