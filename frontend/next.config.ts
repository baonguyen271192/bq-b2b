import type { NextConfig } from "next";

// Đọc từ .env — đổi môi trường (dev/staging/production) chỉ cần đổi 2 biến này,
// KHÔNG cần sửa code/build lại. Mặc định về localhost cho chạy local như cũ.
const BQ_API_URL = process.env.BQ_API_URL || "http://localhost:8100";
const COMMERCE_API_URL = process.env.COMMERCE_API_URL || "http://localhost:8200";

const nextConfig: NextConfig = {
  // Cho phép dev server nhận request từ tunnel ngrok (chia sẻ demo cho đồng nghiệp).
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok-free.dev", "*.ngrok.app", "*.ngrok.io"],

  // Proxy API sang backend BQ → chỉ cần 1 tunnel/domain cho web, backend KHÔNG cần
  // expose ra ngoài (Next server tự gọi nội bộ).
  // /commerce-api/* → service Commerce (đơn khách lẻ qua bot Facebook, xem
  // ../zalo-rag-bot/commerce) — BQ admin đọc/thao tác đơn lẻ qua đây, không giữ DB riêng.
  //
  // Lên production: đặt BQ_API_URL / COMMERCE_API_URL trong .env của môi trường đó
  // trỏ tới đúng địa chỉ server thật, KHÔNG sửa file này.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BQ_API_URL}/api/:path*` },
      { source: "/commerce-api/:path*", destination: `${COMMERCE_API_URL}/api/:path*` },
    ];
  },
};

export default nextConfig;
