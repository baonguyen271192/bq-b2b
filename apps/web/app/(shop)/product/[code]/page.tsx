"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { api, Product, vnd } from "@/lib/api";
import { useStore } from "@/lib/store";

export default function ProductDetail({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { dealer, addToCart } = useStore();
  const router = useRouter();
  const [p, setP] = useState<Product | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [imgIdx, setImgIdx] = useState(0);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    api.products(dealer).then((list) => setP(list.find((x) => x.code === code.toUpperCase()) || null));
  }, [dealer, code]);

  if (!p) return (<div style={{ padding: 40, textAlign: "center", color: "var(--bq-muted)" }}>Đang tải…</div>);

  const images = (p.images && p.images.length > 0) ? p.images : [p.image]; // gallery ảnh thật nhiều góc
  const setSize = (s: string, v: number, max: number) => setQty((q) => ({ ...q, [s]: Math.max(0, Math.min(max, v)) }));
  const totalPairs = Object.values(qty).reduce((a, b) => a + b, 0);
  const totalMoney = totalPairs * p.price;

  const add = () => {
    const valid = Object.fromEntries(Object.entries(qty).filter(([, v]) => v > 0));
    if (Object.keys(valid).length === 0) return;
    addToCart({ code: p.code, name: p.name, image: p.image, unit_price: p.price, sizes: valid });
    router.push("/cart");
  };

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* app-header 56px */}
      <div style={{ height: 56, background: "#fff", padding: "0 16px", display: "flex", alignItems: "center", gap: 8,
        position: "sticky", top: 0, zIndex: 20, borderBottom: "1px solid var(--bq-line)" }}>
        <Link href="/products" style={{ color: "var(--bq-orange)", display: "flex" }}><ChevronLeft size={22} /></Link>
        <div className="font-head" style={{ color: "var(--bq-orange)", fontWeight: 700, fontSize: 18 }}>{p.name.split("—")[0].trim()}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
        {/* hero: carousel có nút ‹ ›, vuốt được, bấm phóng to */}
        <div style={{ position: "relative", background: "#fff", overflow: "hidden" }}>
          <div className="no-scrollbar"
            onScroll={(e) => setImgIdx(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
            style={{ display: "flex", overflowX: "auto", scrollSnapType: "x mandatory" }} id="gallery">
            {images.map((src, i) => (
              <div key={i} style={{ position: "relative", flex: "0 0 100%", scrollSnapAlign: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={p.name} onClick={() => setZoom(true)}
                  style={{ width: "100%", height: 220, objectFit: "cover", display: "block", cursor: "zoom-in" }} />
              </div>
            ))}
          </div>
          {/* badge số ảnh gọn */}
          <span style={{ position: "absolute", top: 10, right: 12, background: "rgba(0,0,0,.55)", color: "#fff",
            fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 20, fontFamily: "var(--font-geist)" }}>
            {imgIdx + 1}/{images.length}
          </span>
          {/* nút prev/next */}
          {["prev", "next"].map((dir) => (
            <button key={dir}
              onClick={() => {
                const el = document.getElementById("gallery"); if (!el) return;
                const w = el.clientWidth;
                el.scrollTo({ left: (dir === "next" ? imgIdx + 1 : imgIdx - 1) * w, behavior: "smooth" });
              }}
              style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", [dir === "prev" ? "left" : "right"]: 10,
                width: 34, height: 34, borderRadius: "50%", border: "none", background: "rgba(255,255,255,.9)",
                boxShadow: "0 1px 4px rgba(0,0,0,.2)", cursor: "pointer", fontSize: 18, color: "var(--bq-ink)",
                display: "flex", alignItems: "center", justifyContent: "center" } as React.CSSProperties}>
              {dir === "prev" ? "‹" : "›"}
            </button>
          ))}
          <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4 }}>
            {images.map((_, i) => (
              <span key={i} style={{ width: i === imgIdx ? 16 : 6, height: 6, borderRadius: 3,
                background: i === imgIdx ? "var(--bq-orange)" : "#cbd5e1", transition: "width .2s" }} />
            ))}
          </div>
        </div>

        {/* Thumbnail nhiều góc — bấm để xem từng góc */}
        {images.length > 1 && (
          <div className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 16px", marginTop: -8 }}>
            {images.map((src, i) => (
              <button key={i}
                onClick={() => { const el = document.getElementById("gallery"); if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" }); setImgIdx(i); }}
                style={{ flex: "0 0 auto", width: 56, height: 56, borderRadius: 10, overflow: "hidden", padding: 0, cursor: "pointer",
                  border: `2px solid ${i === imgIdx ? "var(--bq-orange)" : "var(--bq-line)"}`, background: "#fff" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`${p.name} góc ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </button>
            ))}
          </div>
        )}

        {/* info-block pad 16 gap 8 */}
        <div style={{ background: "#fff", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--bq-muted)", fontFamily: "var(--font-geist)" }}>SKU: {p.code}</span>
            <span style={{ background: "var(--bq-amber-soft)", color: "var(--bq-amber)", fontSize: 10, fontWeight: 700,
              padding: "4px 8px", borderRadius: 4 }}>Mức sỉ đặc biệt</span>
          </div>
          <div className="font-head" style={{ fontSize: 20, fontWeight: 700, color: "var(--bq-ink)" }}>{p.name}</div>
          <div style={{ display: "flex", alignItems: "stretch", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: "var(--bq-muted)", height: 16 }}>Giá sỉ buôn</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: "var(--bq-orange)", fontFamily: "var(--font-geist)", lineHeight: 1 }}>{vnd(p.price)}</span>
            </div>
            <span style={{ width: 1, background: "var(--bq-line)" }} />
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, color: "var(--bq-muted)", height: 16 }}>Giá bán lẻ đề xuất</span>
              <span style={{ fontSize: 16, fontWeight: 600, color: "var(--bq-muted)", textDecoration: "line-through", fontFamily: "var(--font-geist)", lineHeight: 1 }}>{vnd(p.retail)}</span>
            </div>
          </div>
          <div style={{ height: 1, background: "var(--bq-line)", margin: "4px 0" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--bq-green)", fontFamily: "var(--font-geist)" }}>
            Ưu đãi: Chiết khấu thêm khi đặt từ 50 đôi trở lên.
          </span>
        </div>

        {/* size-matrix pad 16 gap 12 */}
        <div style={{ background: "#fff", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="font-head" style={{ fontSize: 14, fontWeight: 700, color: "var(--bq-orange)" }}>BẢNG SIZE MATRIX &amp; ĐẶT SỐ LƯỢNG</div>
          {/* header */}
          <div style={{ display: "grid", gridTemplateColumns: "48px 1fr auto", paddingBottom: 8, borderBottom: "1px solid var(--bq-line)" }}>
            <span style={hdr}>Size</span><span style={hdr}>Tồn kho</span><span style={{ ...hdr, textAlign: "right" }}>Đặt mua</span>
          </div>
          {Object.entries(p.sizes).map(([s, stock]) => {
            const low = stock > 0 && stock <= 5;
            const soldout = stock === 0;
            const v = qty[s] || 0;
            return (
              <div key={s} style={{ display: "grid", gridTemplateColumns: "48px 1fr auto", alignItems: "center", height: 30 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--bq-ink)", fontFamily: "var(--font-geist)" }}>{s}</span>
                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "var(--font-geist)",
                  color: soldout ? "#c7cbd2" : low ? "var(--bq-red)" : "var(--bq-green)" }}>
                  {soldout ? "Hết hàng" : `${stock} đôi${low ? " (Sắp hết)" : ""}`}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button disabled={soldout} onClick={() => setSize(s, v - 1, stock)} style={stepBtn}>−</button>
                  <span style={{ width: 28, textAlign: "center", fontSize: 14, fontWeight: 700, fontFamily: "var(--font-geist)",
                    color: v > 0 ? "var(--bq-orange)" : "var(--bq-muted)" }}>{v}</span>
                  <button disabled={soldout} onClick={() => setSize(s, v + 1, stock)} style={stepBtn}>+</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overlay zoom ảnh */}
      {zoom && (
        <div onClick={() => setZoom(false)}
          style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.92)",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <span style={{ position: "absolute", top: 16, right: 20, color: "#fff", fontSize: 28 }}>✕</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[imgIdx]} alt={p.name} style={{ width: "100%", maxHeight: "100%", objectFit: "contain" }} />
        </div>
      )}

      {/* bottom-cta: dính đáy màn khi cuộn, không để lại khoảng trống thừa */}
      <div style={{ position: "sticky", bottom: 0, background: "#fff", borderTop: "1px solid var(--bq-line)",
        padding: "12px 16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, color: "var(--bq-muted)", fontFamily: "var(--font-geist)" }}>Đã chọn: {totalPairs} đôi</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--bq-orange)", fontFamily: "var(--font-geist)" }}>{vnd(totalMoney)}</span>
        </div>
        <button onClick={add} disabled={totalPairs === 0}
          className="font-head"
          style={{ height: 48, borderRadius: 8, border: "none", fontSize: 16, fontWeight: 700, color: "#fff",
            background: totalPairs === 0 ? "#d8dbe0" : "var(--bq-orange)", cursor: totalPairs === 0 ? "not-allowed" : "pointer" }}>
          Thêm vào đơn hàng
        </button>
      </div>
    </div>
  );
}

const hdr: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "var(--bq-muted)", fontFamily: "var(--font-geist)" };
const stepBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 4, background: "var(--bq-bg)", border: "none",
  fontSize: 16, fontWeight: 700, color: "var(--bq-muted)", cursor: "pointer", lineHeight: 1,
};
