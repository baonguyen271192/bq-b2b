import type { Metadata } from "next";
import { Outfit, Geist } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";

const outfit = Outfit({ subsets: ["latin", "latin-ext"], variable: "--font-outfit", weight: ["400", "600", "700", "800"] });
const geist = Geist({ subsets: ["latin", "latin-ext"], variable: "--font-geist", weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "BQ Wholesale — Đặt sỉ B2B",
  description: "Hệ thống đặt hàng sỉ đa kênh cho Giày BQ",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${outfit.variable} ${geist.variable}`}>
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
