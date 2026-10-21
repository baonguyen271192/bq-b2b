import path from "node:path";
import type { NextConfig } from "next";

// Đọc từ .env — đổi môi trường (dev/staging/production) chỉ cần đổi 2 biến này,
// KHÔNG cần sửa code/build lại. Mặc định về localhost cho chạy local như cũ.
const BQ_API_URL = process.env.BQ_API_URL || "http://localhost:8100";

const nextConfig: NextConfig = {
  // Các package nội bộ xuất thẳng TypeScript nguồn (just-in-time packages) —
  // Next phải tự transpile, đổi lại không cần bước build riêng cho từng package.
  transpilePackages: ["@bq/types", "@bq/core", "@bq/api-client"],

  // Trong monorepo, Next cần biết gốc workspace để trace đúng file khi build
  // standalone — nếu không sẽ thiếu file của packages/* trong output.
  outputFileTracingRoot: path.join(__dirname, "../../"),

  // Cho dev server nhận request từ tunnel ngrok (chia sẻ demo cho đồng nghiệp).
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok-free.dev", "*.ngrok.app", "*.ngrok.io"],

  // Proxy API sang backend BQ → chỉ cần 1 tunnel/domain cho web, backend KHÔNG cần
  // expose ra ngoài (Next server tự gọi nội bộ).
  // Đơn lẻ (bot Facebook/Zalo) cũng đi qua đây: /api/retail/* thuộc backend BQ,
  // không còn proxy sang service ngoài nào.
  //
  // Lên production: đặt BQ_API_URL trong .env của môi trường đó
  // trỏ tới đúng địa chỉ server thật, KHÔNG sửa file này.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BQ_API_URL}/api/:path*` },
    ];
  },
};

export default nextConfig;
