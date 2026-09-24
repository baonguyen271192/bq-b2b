"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, ChevronDown } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import TabHeader from "@/components/TabHeader";
import { api, Product, Dealer } from "@/lib/api";
import { useStore } from "@/lib/store";

const SORTS = [
  { key: "new", label: "Mới nhất" },
  { key: "price-asc", label: "Giá: thấp → cao" },
  { key: "price-desc", label: "Giá: cao → thấp" },
  { key: "name", label: "Tên A → Z" },
];

function ProductsInner() {
  const { dealer } = useStore();
  const params = useSearchParams();
  const initCat = params.get("cat") || "";
  const [cat, setCat] = useState(initCat);
  const [cats, setCats] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [d, setD] = useState<Dealer | null>(null);
  const [q, setQ] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  const [sort, setSort] = useState("new");
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => { api.categories().then(setCats).catch(() => {}); api.dealer(dealer).then(setD).catch(() => {}); }, [dealer]);
  useEffect(() => { api.products(dealer, cat || undefined).then(setProducts).catch(() => {}); }, [dealer, cat]);

  const filtered = q ? products.filter((p) => (p.name + p.code).toLowerCase().includes(q.toLowerCase())) : products;
  const shown = [...filtered].sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    if (sort === "name") return a.name.localeCompare(b.name, "vi");
    return 0; // "new": giữ thứ tự BE
  });
  const sortLabel = SORTS.find((s) => s.key === sort)?.label || "Mới nhất";

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <TabHeader title="Đặt hàng" />
      {/* Search */}
      <div style={{ background: "#fff", padding: "12px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bq-bg)",
          borderRadius: 12, padding: "12px 14px" }}>
          <Search size={18} color="var(--bq-muted)" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm sản phẩm, SKU…"
            style={{ border: "none", outline: "none", flex: 1, fontSize: 14, background: "transparent", fontFamily: "var(--font-geist)" }} />
        </div>
        {/* Filter pill: Danh mục (chip cho từng danh mục) */}
        <div className="no-scrollbar" style={{ display: "flex", gap: 8, overflowX: "auto", padding: "12px 0" }}>
          <button onClick={() => setCatOpen(!catOpen)}
            style={{ border: `1px solid ${cat ? "var(--bq-orange)" : "var(--bq-line)"}`,
              color: cat ? "var(--bq-orange)" : "var(--bq-ink)",
              background: "#fff", borderRadius: 20, padding: "7px 14px", fontSize: 13, whiteSpace: "nowrap", cursor: "pointer",
              fontFamily: "var(--font-geist)" }}>
            {cat || "Danh mục"} ▾
          </button>
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(cat === c ? "" : c)}
              style={{ border: `1px solid ${cat === c ? "var(--bq-orange)" : "var(--bq-line)"}`,
                color: cat === c ? "var(--bq-orange)" : "var(--bq-ink)",
                background: cat === c ? "var(--bq-orange-soft)" : "#fff", borderRadius: 20, padding: "7px 14px",
                fontSize: 13, whiteSpace: "nowrap", cursor: "pointer", fontFamily: "var(--font-geist)" }}>{c}</button>
          ))}
        </div>
        {catOpen && (
          <div style={{ paddingBottom: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["", ...cats].map((c) => (
              <button key={c || "all"} onClick={() => { setCat(c); setCatOpen(false); }}
                style={{ border: `1px solid ${cat === c ? "var(--bq-orange)" : "var(--bq-line)"}`,
                  color: cat === c ? "var(--bq-orange)" : "var(--bq-ink)", background: cat === c ? "var(--bq-orange-soft)" : "#fff",
                  borderRadius: 20, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}>{c || "Tất cả"}</button>
            ))}
          </div>
        )}
      </div>

      {/* Count + sort */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px 8px", position: "relative" }}>
        <span style={{ fontSize: 13, color: "var(--bq-muted)", fontFamily: "var(--font-geist)" }}>{shown.length} sản phẩm</span>
        <button onClick={() => setSortOpen(!sortOpen)}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--bq-orange)",
            fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
          {sortLabel} <ChevronDown size={15} />
        </button>
        {sortOpen && (
          <div style={{ position: "absolute", top: "100%", right: 16, zIndex: 20, background: "#fff",
            border: "1px solid var(--bq-line)", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.08)", overflow: "hidden", minWidth: 168 }}>
            {SORTS.map((s) => (
              <button key={s.key} onClick={() => { setSort(s.key); setSortOpen(false); }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 14px", fontSize: 13,
                  background: sort === s.key ? "var(--bq-orange-soft)" : "#fff", color: sort === s.key ? "var(--bq-orange)" : "var(--bq-ink)",
                  fontWeight: sort === s.key ? 700 : 500, border: "none", cursor: "pointer" }}>{s.label}</button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "4px 16px 96px" }}>
        {shown.map((p) => <ProductCard key={p.code} p={p} tier={d?.tier} />)}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return <Suspense><ProductsInner /></Suspense>;
}
