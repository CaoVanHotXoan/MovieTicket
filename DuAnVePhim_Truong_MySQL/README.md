# DuAn VePhim — TEAM BẤT ỔN

Website đặt vé xem phim (HTML/CSS/JS + Express + SQL Server).

## Yêu cầu môi trường

| Công cụ | Phiên bản |
|---------|-----------|
| **Node.js** | **>= 20.14.0** (ví dụ 20.14.0 LTS trên máy trường) |
| **npm** | >= 10.0.0 (đi kèm Node 20) |
| SQL Server | Tùy chọn (không kết nối được thì chạy chế độ Demo) |

Kiểm tra phiên bản:

```bash
node -v    # ví dụ: v20.14.0
npm -v
npm run check-node
```

## Cài đặt và chạy (máy trường / máy nhà)

1. Cài [Node.js 20 LTS](https://nodejs.org/) (20.14.0 trở lên).

2. Mở terminal trong thư mục dự án:

```bash
npm install
```

3. Chạy development (khuyến nghị):

```bash
npm run dev
```

4. Mở trình duyệt: **http://localhost:3003**

## Scripts

| Lệnh | Mô tả |
|------|--------|
| `npm run dev` | Chạy server + Vite (hot reload) |
| `npm run start` | Chạy server (không watch) |
| `npm run build` | Build frontend vào `dist/` |
| `npm run lint` | Kiểm tra TypeScript |
| `npm run check-node` | Kiểm tra Node >= 20.14.0 |

## Ghi chú kỹ thuật

- Server viết bằng **TypeScript** (`server.ts`). `npm run dev` dùng **esbuild** build sang `.cache/server.mjs` rồi chạy bằng **node** (tránh lỗi `ERR_INVALID_URL_SCHEME` khi dùng `tsx` + `@tailwindcss/vite` trên Windows).
- Cấu hình Vite: `vite.config.mjs` + `vite.shared.mjs`.
- Package `msnodesqlv8` cần SQL Server Native Client trên Windows; nếu `npm install` báo lỗi build native, vẫn có thể chạy web ở chế độ **Mock Data** khi không kết nối DB.
- File `.nvmrc` ghi `20.14.0` — nếu dùng [nvm-windows](https://github.com/coreybutler/nvm-windows): `nvm use`

## Cấu trúc chính

- `server.ts` — API Express
- `ThuTuc.sql` — Stored procedures SQL Server
- `admin.html` — Trang quản trị
- `index.html`, `Phim/`, `DatVe/`, `LichSu/`, … — Giao diện người dùng
