# Ảnh đối chiếu thiết kế ⇄ app

Mỗi màn một file `NN-<Tên>.png`: **trái là ảnh thiết kế** (`../screens/NN-*.png`),
**phải là ảnh chụp app thật**, cùng khổ 390×844 pt.

Chụp bằng:

```bash
cd apps/mobile
BQ_SHOTS=0,0.45,1 ./scripts/preview-web.sh "/(tabs)" 390 844
```

`BQ_SHOTS` là các vị trí cuộn (0 = đầu trang, 1 = cuối). `BQ_SETTLE` là số giây
chờ splash thoát trước khi chụp (mặc định 5).

## Ngoại lệ

`00-Showcase-390x844.png` không có ảnh thiết kế đối ứng: đó là route dev
`/_dev/ui` trưng bày toàn bộ component §2, không nằm trong 25 màn của SPEC.
Lưới 3×3 theo thứ tự cuộn từ đầu tới cuối trang.
