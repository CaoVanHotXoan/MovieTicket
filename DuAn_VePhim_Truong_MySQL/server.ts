import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createHttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { pool as mysqlPool, testConnection, sql, poolWithRequest } from "./db/index.js";

const app = express();
// Tạo HTTP server để Socket.io có thể hoạt động
const httpServer = createHttpServer(app);
// Khởi tạo Socket.io với HTTP server
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = 3015;

// Middleware cho phép parse JSON trong body của request
app.use(express.json());

/**
 * ========== QUẢN LÝ REAL-TIME BOOKING (Socket.io) ==========
 * Lưu trữ trạng thái ghế và người dùng đang chọn ghế
 */
// Map lưu trữ: key = "movieId_roomId_date", value = { seatId: { userId, userName, timestamp } }
const activeSeatSelections = new Map();

// Map lưu trữ user sessions
const userSessions = new Map(); // key = socketId, value = { userId, userName, movieId, roomId, date }

/**
 * Socket.io - Xử lý kết nối realtime từ client
 */
io.on("connection", (socket) => {
  console.log(`🟢 Client kết nối: ${socket.id}`);

  /**
   * Sự kiện: Client gửi thông tin đăng nhập (userId, userName, movieId, roomId, date)
   * Dùng để xác định người dùng đang booking phim nào, phòng nào
   */
  socket.on("login", (data) => {
    const { userId, userName, movieId, roomId, date } = data;
    // Lưu session người dùng
    userSessions.set(socket.id, {
      userId,
      userName,
      movieId,
      roomId,
      date
    });

    const roomKey = `${movieId}_${roomId}_${date}`;
    socket.join(roomKey);

    console.log(`📝 ${userName} (ID: ${userId}) bắt đầu booking phim ${movieId}, phòng ${roomId} (${date})`);
  });

  /**
   * Sự kiện: Client chọn ghế (seat)
   * Gửi thông tin ghế đang được chọn đến tất cả các client khác
   */
  socket.on("selectSeat", (data) => {
    const { seatId, seatPrice, action } = data; // action: 'select' hoặc 'deselect'
    const session = userSessions.get(socket.id);
    
    if (!session) return;

    // Tạo key để xác định phòng chiếu (movieId_roomId_date)
    const roomKey = `${session.movieId}_${session.roomId}_${session.date}`;
    
    if (!activeSeatSelections.has(roomKey)) {
      activeSeatSelections.set(roomKey, {});
    }

    const seatMap = activeSeatSelections.get(roomKey);

    if (action === "select") {
      // Lưu trạng thái ghế được chọn bởi người dùng
      seatMap[seatId] = {
        userId: session.userId,
        userName: session.userName,
        timestamp: Date.now()
      };
      console.log(`✅ ${session.userName} chọn ghế: ${seatId}`);
    } else if (action === "deselect") {
      // Xóa trạng thái ghế khi người dùng hủy chọn
      delete seatMap[seatId];
      console.log(`❌ ${session.userName} hủy chọn ghế: ${seatId}`);
    }

    // 📡 Phát sự kiện đến tất cả client khác trong cùng suất chiếu
    socket.to(roomKey).emit("seatUpdate", {
      seatId,
      action,
      userName: session.userName,
      userId: session.userId,
      seatPrice,
      movieId: session.movieId,
      roomId: session.roomId,
      date: session.date
    });
  });

  /**
   * Sự kiện: Client yêu cầu danh sách ghế đang được chọn hiện tại
   */
  socket.on("getActiveSeatSelections", (data) => {
    const { movieId, roomId, date } = data;
    const roomKey = `${movieId}_${roomId}_${date}`;
    const seatMap = activeSeatSelections.get(roomKey) || {};
    
    // Gửi lại danh sách ghế đang được chọn
    socket.emit("activeSeatSelections", seatMap);
  });

  /**
   * Sự kiện: Client ngắt kết nối (tắt trình duyệt, rời trang, vv)
   */
  socket.on("disconnect", () => {
    const session = userSessions.get(socket.id);
    if (session) {
      console.log(`🔴 ${session.userName} (ID: ${session.userId}) ngắt kết nối`);
      
      // Xóa tất cả ghế của người dùng này khi rời
      const roomKey = `${session.movieId}_${session.roomId}_${session.date}`;
      const seatMap = activeSeatSelections.get(roomKey);
      
      if (seatMap) {
        Object.keys(seatMap).forEach(seatId => {
          if (seatMap[seatId].userId === session.userId) {
            delete seatMap[seatId];
            // Thông báo cho các client khác trong cùng suất chiếu rằng ghế này đã được giải phóng
            socket.to(roomKey).emit("seatUpdate", {
              seatId,
              action: "deselect",
              userName: session.userName,
              userId: session.userId,
              movieId: session.movieId,
              roomId: session.roomId,
              date: session.date
            });
          }
        });
      }
    }
    userSessions.delete(socket.id);
  });
});








// --- DỮ LIỆU GIẢ (MOCK DATA) CHO CHẾ ĐỘ DEMO ---
// Các mảng dữ liệu này được sử dụng khi server không thể kết nối tới SQL Server thực tế.
let mockMovieTypes = [
  { MaLoai: 1, TenLoai: "Hành động" },
  { MaLoai: 2, TenLoai: "Tình cảm" },
  { MaLoai: 3, TenLoai: "Kinh dị" }
];

let mockMovies = [
  { MaPhim: 1, TenPhim: "Fast & Furious", MoTa: "Đua xe tốc độ", ThoiLuong: 120, NgayKhoiChieu: "2024-05-01", TrangThai: "Đang chiếu", MaLoai: 1, HinhAnh: "https://picsum.photos/seed/fast/200/300", Trailer: "https://www.youtube.com/embed/2TAOizOnNPo" },
  { MaPhim: 2, TenPhim: "Titanic", MoTa: "Tình yêu", ThoiLuong: 180, NgayKhoiChieu: "2024-06-01", TrangThai: "Đang chiếu", MaLoai: 2, HinhAnh: "https://picsum.photos/seed/titanic/200/300", Trailer: "https://www.youtube.com/embed/kVrqfYjknIc" },
  { MaPhim: 3, TenPhim: "Conjuring", MoTa: "Phim ma", ThoiLuong: 110, NgayKhoiChieu: "2024-07-01", TrangThai: "Sắp chiếu", MaLoai: 3, HinhAnh: "https://picsum.photos/seed/conjuring/200/300", Trailer: "https://www.youtube.com/embed/k10ETZ41q5o" }
];

let mockRooms = [
  { MaPhong: 1, TenPhong: "Phòng 1" },
  { MaPhong: 2, TenPhong: "Phòng 2" },
  { MaPhong: 3, TenPhong: "Phòng VIP" }
];

let mockSeatTypes = [
  { MaLoaiGhe: 1, TenLoai: "Thường", GiaGhe: 80000 },
  { MaLoaiGhe: 2, TenLoai: "VIP", GiaGhe: 120000 },
  { MaLoaiGhe: 3, TenLoai: "Đôi", GiaGhe: 160000 }
];

let mockSeats = [
  { MaGhe: 1, MaPhong: 1, SoGhe: "A1", MaLoaiGhe: 1 },
  { MaGhe: 2, MaPhong: 1, SoGhe: "A2", MaLoaiGhe: 2 },
  { MaGhe: 3, MaPhong: 2, SoGhe: "B1", MaLoaiGhe: 1 }
];

let mockShowtimes = [
  { MaSuat: 1, MaPhim: 1, MaPhong: 1, NgayChieu: "2024-05-10", GioBatDau: "18:00", GioKetThuc: "20:00" },
  { MaSuat: 2, MaPhim: 2, MaPhong: 2, NgayChieu: "2024-05-11", GioBatDau: "19:00", GioKetThuc: "22:00" },
  { MaSuat: 3, MaPhim: 3, MaPhong: 3, NgayChieu: "2024-05-12", GioBatDau: "20:00", GioKetThuc: "22:00" }
];

let mockCustomerTypes = [
  { MaLoaiUser: 1, TenLoai: "Admin" },
  { MaLoaiUser: 2, TenLoai: "Khách hàng" },
  { MaLoaiUser: 3, TenLoai: "Nhân viên" }
];

let mockCustomers = [
  { MaKH: 1, Ten: "Nguyễn Văn A", TenDangNhap: "user1", MatKhau: "123", Email: "a@gmail.com", SDT: "0123456789", MaLoaiUser: 2, HinhAnh: "" },
  { MaKH: 2, Ten: "Trần Thị B", TenDangNhap: "user2", MatKhau: "123", Email: "b@gmail.com", SDT: "0987654321", MaLoaiUser: 2, HinhAnh: "" },
  { MaKH: 3, Ten: "Admin", TenDangNhap: "admin", MatKhau: "123", Email: "admin@gmail.com", SDT: "0111111111", MaLoaiUser: 1, HinhAnh: "" }
];

// Chú thích: PhuongThuc hiện tại lưu ID của phương thức thanh toán (1: Tiền mặt, 2: Chuyển khoản, 3: Momo)
let mockInvoices = [
  { MaHoaDon: 1, MaKH: 1, NgayDat: "2024-04-20T10:00:00", TongTien: 200000, PhuongThuc: 1, MaQR: "a1111111-1111-1111-1111-111111111101" },
  { MaHoaDon: 2, MaKH: 2, NgayDat: "2024-04-21T11:00:00", TongTien: 150000, PhuongThuc: 2, MaQR: "a2222222-2222-2222-2222-222222222202" },
  { MaHoaDon: 3, MaKH: 1, NgayDat: "2024-04-22T12:00:00", TongTien: 300000, PhuongThuc: 3, MaQR: "a3333333-3333-3333-3333-333333333303" }
];

let mockInvoiceDetails = [
  { MaCT: 1, MaHoaDon: 1, MaPhim: 1, MaSuat: 1, MaGhe: 1, GiaVe: 100000 },
  { MaCT: 2, MaHoaDon: 1, MaPhim: 1, MaSuat: 1, MaGhe: 2, GiaVe: 100000 },
  { MaCT: 3, MaHoaDon: 2, MaPhim: 2, MaSuat: 2, MaGhe: 3, GiaVe: 150000 }
];

// Dữ liệu bình luận mẫu (Demo) — thay bằng bảng BinhLuan khi kết nối SQL
let mockComments: Array<Record<string, any>> = [];

let mockPayments = [
  { MaThanhToan: 1, TenPhuongThuc: "Tiền mặt", HinhAnh: "https://cdn-icons-png.flaticon.com/512/2331/2331717.png" },
  { MaThanhToan: 2, TenPhuongThuc: "Chuyển khoản", HinhAnh: "https://cdn-icons-png.flaticon.com/512/2830/2830284.png" },
  { MaThanhToan: 3, TenPhuongThuc: "Momo", HinhAnh: "https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png" }
];

let mockBanners = [
  { MaBanner: 1, TenBanner: "Banner Doremon", LinkBanner: "https://res.cloudinary.com/dlzmsdoxa/image/upload/v1779084718/banner_Doremon_j07ivo.jpg", MaPhim: 3 },
  { MaBanner: 2, TenBanner: "Banner Lotte 1", LinkBanner: "https://media.lottecinemavn.com/Media/WebAdmin/8d3058aae1ae4d2190532e7f03cd9cfa.jpg", MaPhim: 1 },
  { MaBanner: 3, TenBanner: "Banner Lotte 2", LinkBanner: "https://media.lottecinemavn.com/Media/WebAdmin/615f1744212c4dc199f149d97d7ddf48.jpg", MaPhim: 2 }
];

let mockProductCategories = [
  { MaLoaiSP: 1, TenLoaiSP: "Đồ ăn" },
  { MaLoaiSP: 2, TenLoaiSP: "Nước uống" }
];

let mockProducts = [
  { MaSP: 1, MaLoaiSP: 1, TenSP: "Bắp rang bơ", Gia: 50000, HinhAnh: "https://picsum.photos/seed/popcorn/200", MoTa: "Bắp rang bơ phô mai" },
  { MaSP: 2, MaLoaiSP: 2, TenSP: "Coca Cola", Gia: 30000, HinhAnh: "https://picsum.photos/seed/coca/200", MoTa: "Nước ngọt có ga" }
];

let useMockData = true; // Biến đánh dấu xem có đang sử dụng dữ liệu giả hay không
type DbPool = ReturnType<typeof poolWithRequest>;
let dbPool: DbPool | null = null;
let connectionAttempted = false; // Đánh dấu đã thử kết nối DB chưa

/**
 * Hàm lấy pool MySQL (đọc .env: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME).
 * Nếu không kết nối được, hệ thống chuyển sang chế độ Demo (Mock Data).
 */
async function getPool(): Promise<DbPool | null> {
  if (dbPool) return dbPool;
  if (connectionAttempted && useMockData) return null;

  connectionAttempted = true;
  const ok = await testConnection();
  if (ok) {
    dbPool = poolWithRequest(mysqlPool);
    useMockData = false;
    return dbPool;
  }
  console.warn("Chuyển sang chế độ Demo với dữ liệu giả.");
  useMockData = true;
  return null;
}

// Thử kết nối MySQL khi khởi động server
getPool();

/** Kiểm tra DB (GET /api/db-health) */
app.get("/api/db-health", async (_req, res) => {
  try {
    const p = await getPool();
    if (!p || useMockData) {
      return res.status(503).json({ ok: false, mode: "demo", message: "Đang dùng dữ liệu giả" });
    }
    const [rows] = await mysqlPool.query("SELECT DATABASE() AS db, VERSION() AS version");
    res.json({ ok: true, mode: "mysql", info: (rows as Record<string, unknown>[])[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  }
});

/** Chuyển uniqueidentifier SQL Server sang chuỗi GUID (JSON/client đọc được) */
function parseSqlGuid(value: any): string | null {
  if (value == null || value === undefined) return null;

  if (typeof value === "string") {
    const s = value.replace(/[{}]/g, "").trim();
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return s;
    return s.length > 0 && s !== "null" ? s : null;
  }

  if (Buffer.isBuffer(value) && value.length >= 16) {
    const p1 = value.readUInt32LE(0).toString(16).padStart(8, "0");
    const p2 = value.readUInt16LE(4).toString(16).padStart(4, "0");
    const p3 = value.readUInt16LE(6).toString(16).padStart(4, "0");
    const p4 = value.slice(8, 10).toString("hex");
    const p5 = value.slice(10, 16).toString("hex");
    return `${p1}-${p2}-${p3}-${p4}-${p5}`;
  }

  if (typeof value === "object" && value.type === "Buffer" && Array.isArray(value.data)) {
    return parseSqlGuid(Buffer.from(value.data));
  }

  try {
    const s = String(value).replace(/[{}]/g, "").trim();
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return s;
  } catch { /* ignore */ }
  return null;
}

/** Chuẩn hóa một dòng hóa đơn từ recordset SQL */
function normalizeInvoiceRow(row: Record<string, any>) {
  const obj: Record<string, any> = {};
  for (const key in row) {
    const lowerKey = key.toLowerCase();
    if (lowerKey === "mahoadon") obj.MaHoaDon = row[key];
    else if (lowerKey === "makh") obj.MaKH = row[key];
    else if (lowerKey === "ngaydat") obj.NgayDat = row[key];
    else if (lowerKey === "tongtien") obj.TongTien = Number(row[key]) || 0;
    else if (lowerKey === "tenkhachhang") obj.TenKhachHang = row[key];
    else if (lowerKey === "maqr") obj.MaQR = parseSqlGuid(row[key]);
    else if (lowerKey === "tenphim") obj.TenPhim = row[key];
    else if (lowerKey === "phuongthuc") obj.MaPhuongThuc = row[key];
    else if (lowerKey === "tenphuongthuc") obj.TenPhuongThuc = row[key];
    else obj[key] = row[key];
  }
  if (!obj.MaQR) {
    for (const key of Object.keys(row)) {
      if (key.toLowerCase() === "maqr") {
        obj.MaQR = parseSqlGuid(row[key]);
        break;
      }
    }
  }
  obj.PhuongThuc = obj.TenPhuongThuc || obj.MaPhuongThuc;
  return obj;
}

/** Chuẩn hóa một dòng chi tiết hóa đơn */
function normalizeInvoiceDetailRow(row: Record<string, any>) {
  const obj: Record<string, any> = {};
  for (const key in row) {
    const lowerKey = key.toLowerCase();
    if (lowerKey === "mact") obj.MaCT = row[key];
    else if (lowerKey === "mahoadon") obj.MaHoaDon = row[key];
    else if (lowerKey === "maphim") obj.MaPhim = row[key];
    else if (lowerKey === "masuat") obj.MaSuat = row[key];
    else if (lowerKey === "maghe") obj.MaGhe = row[key];
    else if (lowerKey === "giave") obj.GiaVe = Number(row[key]) || 0;
    else if (lowerKey === "tenphim") obj.TenPhim = row[key];
    else if (lowerKey === "soghe") obj.SoGhe = row[key];
    else if (lowerKey === "tenphong") obj.TenPhong = row[key];
    else if (lowerKey === "ngaychieu") obj.NgayChieu = row[key];
    else if (lowerKey === "giobatdau") obj.GioBatDau = row[key];
    else if (lowerKey === "gioketthuc") obj.GioKetThuc = row[key];
    else if (lowerKey === "masp") obj.MaSP = row[key];
    else if (lowerKey === "soluongsp") obj.SoLuongSP = row[key];
    else if (lowerKey === "giasp") obj.GiaSP = Number(row[key]) || 0;
    else if (lowerKey === "gianiemyet") obj.GiaNiemYet = Number(row[key]) || 0;
    else if (lowerKey === "tensp") obj.TenSP = row[key];
    else obj[key] = row[key];
  }
  return obj;
}

// API Đăng nhập
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const pool = await getPool();
    let user;
    if (useMockData) {
      user = mockCustomers.find(c => (c.TenDangNhap === username || c.Email === username || c.SDT === username) && c.MatKhau === password);
      if (user) {
        // Gắn roleName cho dữ liệu giả
        const type = mockCustomerTypes.find(t => t.MaLoaiUser === user.MaLoaiUser);
        user = { ...user, roleName: type ? type.TenLoai : "Customer" };
      }
    } else {
      // Sử dụng Stored Procedure để kiểm tra đăng nhập và lấy roleName trong một lần gọi
      const result = await pool!.request()
        .input('username', sql.VarChar, username)
        .input('password', sql.VarChar, password)
        .execute("sp_Login");
      user = result.recordset[0];
    }

    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: "Sai tài khoản hoặc mật khẩu!" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// --- CÁC ĐƯỜNG DẪN API (API ROUTES) ---

// 1. Quản lý Loại Phim (Movie Types) - Cung cấp các API để CRUD thể loại phim
// API: Lấy danh sách loại phim
app.get("/api/movie-types", async (req, res) => {
  try {
    const pool = await getPool();
    // Nếu đang ở chế độ Demo, trả về dữ liệu giả
    if (useMockData) return res.json(mockMovieTypes);

    // Gọi stored procedure để lấy danh sách loại phim
    const result = await pool!.request().execute("sp_GetAllMovieTypes");
    // Chuẩn hóa tên cột trả về (loại bỏ sự khác biệt hoa/thường của SQL Server)
    const normalized = result.recordset.map((row: Record<string, any>) => {
      const obj: Record<string, any> = {};
      for (const key in row) {
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'maloai') obj.MaLoai = row[key];
        else if (lowerKey === 'tenloai') obj.TenLoai = row[key];
        else obj[key] = row[key];
      }
      return obj;
    });
    res.json(normalized);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Thêm mới loại phim
app.post("/api/movie-types", async (req, res) => {
  const { TenLoai } = req.body;
  try {
    const pool = await getPool();
    if (useMockData) {
      const nextId = mockMovieTypes.length > 0 ? Math.max(...mockMovieTypes.map(t => t.MaLoai)) + 1 : 1;
      const newItem = { MaLoai: nextId, TenLoai };
      mockMovieTypes.push(newItem);
      return res.status(201).json({ message: "Đã thêm loại phim mới (Demo)" });
    }
    await pool!.request().input('TenLoai', sql.NVarChar, TenLoai).execute("sp_AddMovieType");
    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Cập nhật thông tin loại phim
app.put("/api/movie-types/:id", async (req, res) => {
  const { id } = req.params;
  const { TenLoai } = req.body;
  try {
    const pool = await getPool();
    if (useMockData) {
      const index = mockMovieTypes.findIndex(t => t.MaLoai === parseInt(id));
      if (index !== -1) {
        mockMovieTypes[index] = { ...mockMovieTypes[index], TenLoai };
        return res.json({ message: "Đã cập nhật loại phim (Demo)" });
      }
      return res.status(404).json({ error: "Không tìm thấy" });
    }
    await pool!.request().input('id', sql.Int, id).input('TenLoai', sql.NVarChar, TenLoai).execute("sp_UpdateMovieType");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Xóa loại phim
app.delete("/api/movie-types/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const idInt = parseInt(id);
    if (useMockData) {
      // Xếp chồng xóa trong bản demo: xóa cả phim thuộc loại này
      mockMovies = mockMovies.filter(m => m.MaLoai !== idInt);
      mockMovieTypes = mockMovieTypes.filter(t => t.MaLoai !== idInt);
      return res.json({ message: "Đã xóa loại phim và các bộ phim liên quan (Demo)" });
    }
    await pool!.request().input('id', sql.Int, id).execute("sp_DeleteMovieType");
    res.json({ success: true });
  } catch (err: any) {
    if (err.message.includes('REFERENCE constraint')) {
      return res.status(409).json({ error: "Không thể xóa loại phim này vì đang có các bộ phim thuộc loại này." });
    }
    res.status(500).json({ error: err.message });
  }
});


// 2. Quản lý Phim (Movies) - Cung cấp các API để quản lý thông tin phim
// API: Lấy danh sách toàn bộ phim
app.get("/api/movies", async (req, res) => {
  try {
    const pool = await getPool();
    // Trả về dữ liệu giả kèm theo tên loại phim nếu trong chế độ Demo
    if (useMockData) return res.json(mockMovies.map(m => ({ ...m, TenLoai: mockMovieTypes.find(l => l.MaLoai === m.MaLoai)?.TenLoai })));

    // Lấy phim và thông tin thể loại thông qua JOIN trong stored procedure
    const result = await pool!.request().execute("sp_GetAllMovies");

    // Chuẩn hóa toàn bộ tên cột cho đồng bộ với giao diện phía client (Frontend)
    const normalized = result.recordset.map((row: Record<string, any>) => {
      const obj: Record<string, any> = {};
      for (const key in row) {
        const value = row[key];
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'maphim') obj.MaPhim = value;
        else if (lowerKey === 'tenphim') obj.TenPhim = value;
        else if (lowerKey === 'mota') obj.MoTa = value;
        else if (lowerKey === 'thoiluong') obj.ThoiLuong = value;
        else if (lowerKey === 'ngaykhoichieu') obj.NgayKhoiChieu = value;
        else if (lowerKey === 'trangthai') obj.TrangThai = value;
        else if (lowerKey === 'maloai') obj.MaLoai = value;
        else if (lowerKey === 'hinhanh') obj.HinhAnh = value;
        else if (lowerKey === 'trailer') obj.Trailer = value;
        else if (lowerKey === 'tenloai') obj.TenLoai = value;
        else obj[key] = value;
      }
      return obj;
    });
    res.json(normalized);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Thêm mới một bộ phim
app.post("/api/movies", async (req, res) => {
  const { TenPhim, MoTa, ThoiLuong, NgayKhoiChieu, TrangThai, MaLoai, HinhAnh, Trailer } = req.body;
  try {
    const pool = await getPool();
    if (useMockData) {
      const nextId = mockMovies.length > 0 ? Math.max(...mockMovies.map(m => m.MaPhim)) + 1 : 1;
      const newItem = { MaPhim: nextId, TenPhim, MoTa, ThoiLuong, NgayKhoiChieu, TrangThai, MaLoai, HinhAnh, Trailer };
      mockMovies.push(newItem);
      return res.status(201).json({ message: "Đã thêm phim mới (Demo)" });
    }
    await pool!.request()
      .input('TenPhim', sql.NVarChar, TenPhim)
      .input('MoTa', sql.NVarChar, MoTa)
      .input('ThoiLuong', sql.Int, ThoiLuong)
      .input('NgayKhoiChieu', sql.Date, NgayKhoiChieu)
      .input('TrangThai', sql.NVarChar, TrangThai)
      .input('MaLoai', sql.Int, MaLoai)
      .input('HinhAnh', sql.VarChar, HinhAnh)
      .input('Trailer', sql.VarChar, Trailer)
      .execute("sp_AddMovie");
    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Cập nhật thông tin một bộ phim
app.put("/api/movies/:id", async (req, res) => {
  const { id } = req.params;
  const { TenPhim, MoTa, ThoiLuong, NgayKhoiChieu, TrangThai, MaLoai, HinhAnh, Trailer } = req.body;
  try {
    const pool = await getPool();
    if (useMockData) {
      const index = mockMovies.findIndex(m => m.MaPhim === parseInt(id));
      if (index !== -1) {
        mockMovies[index] = { ...mockMovies[index], TenPhim, MoTa, ThoiLuong, NgayKhoiChieu, TrangThai, MaLoai, HinhAnh, Trailer };
        return res.json({ message: "Đã cập nhật thông tin phim (Demo)" });
      }
      return res.status(404).json({ error: "Không tìm thấy phim" });
    }
    await pool!.request()
      .input('id', sql.Int, id)
      .input('TenPhim', sql.NVarChar, TenPhim)
      .input('MoTa', sql.NVarChar, MoTa)
      .input('ThoiLuong', sql.Int, ThoiLuong)
      .input('NgayKhoiChieu', sql.Date, NgayKhoiChieu)
      .input('TrangThai', sql.NVarChar, TrangThai)
      .input('MaLoai', sql.Int, MaLoai)
      .input('HinhAnh', sql.VarChar, HinhAnh)
      .input('Trailer', sql.VarChar, Trailer)
      .execute("sp_UpdateMovie");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Xóa một bộ phim
app.delete("/api/movies/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const idInt = parseInt(id);
    if (useMockData) {
      // Xếp chồng xóa: xóa cả suất chiếu của phim này trong bản demo
      mockShowtimes = mockShowtimes.filter(s => s.MaPhim !== idInt);
      mockMovies = mockMovies.filter(m => m.MaPhim !== idInt);
      return res.json({ message: "Đã xóa phim và các suất chiếu liên quan (Demo)" });
    }
    await pool!.request().input('id', sql.Int, id).execute("sp_DeleteMovie");
    res.json({ success: true });
  } catch (err: any) {
    if (err.message.includes('REFERENCE constraint')) {
      return res.status(409).json({ error: "Không thể xóa phim này vì đã có suất chiếu được tạo (Lỗi ràng buộc dữ liệu)." });
    }
    res.status(500).json({ error: err.message });
  }
});


// 3. Quản lý Phòng (Rooms) - Quản lý danh sách các phòng chiếu trong rạp
// API: Lấy danh sách các phòng
app.get("/api/rooms", async (req, res) => {
  try {
    const pool = await getPool();
    if (useMockData) return res.json(mockRooms);
    const result = await pool!.request().execute("sp_GetAllRooms");
    const normalized = result.recordset.map((row: Record<string, any>) => {
      const obj: Record<string, any> = {};
      for (const key in row) {
        const lowerKey = key.toLowerCase();
        // Chuẩn hóa tên trường MaPhong và TenPhong
        if (lowerKey === 'maphong') obj.MaPhong = row[key];
        else if (lowerKey === 'tenphong') obj.TenPhong = row[key];
        else obj[key] = row[key];
      }
      return obj;
    });
    res.json(normalized);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Thêm mới một phòng chiếu
app.post("/api/rooms", async (req, res) => {
  const { TenPhong } = req.body;
  try {
    const pool = await getPool();
    if (useMockData) {
      const nextId = mockRooms.length > 0 ? Math.max(...mockRooms.map(r => r.MaPhong)) + 1 : 1;
      const newItem = { MaPhong: nextId, TenPhong };
      mockRooms.push(newItem);
      return res.status(201).json({ message: "Đã thêm phòng mới (Demo)" });
    }
    await pool!.request().input('TenPhong', sql.NVarChar, TenPhong).execute("sp_AddRoom");
    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Cập nhật thông tin một phòng chiếu
app.put("/api/rooms/:id", async (req, res) => {
  const { id } = req.params;
  const { TenPhong } = req.body;
  try {
    const pool = await getPool();
    if (useMockData) {
      const index = mockRooms.findIndex(r => r.MaPhong === parseInt(id));
      if (index !== -1) {
        mockRooms[index] = { ...mockRooms[index], TenPhong };
        return res.json({ message: "Đã cập nhật tên phòng (Demo)" });
      }
      return res.status(404).json({ error: "Không tìm thấy" });
    }
    await pool!.request().input('id', sql.Int, id).input('TenPhong', sql.NVarChar, TenPhong).execute("sp_UpdateRoom");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Xóa một phòng chiếu
app.delete("/api/rooms/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const idInt = parseInt(id);
    if (useMockData) {
      // Xếp chồng xóa: xóa cả ghế và suất chiếu của phòng này
      mockSeats = mockSeats.filter(s => s.MaPhong !== idInt);
      mockShowtimes = mockShowtimes.filter(s => s.MaPhong !== idInt);
      mockRooms = mockRooms.filter(r => r.MaPhong !== idInt);
      return res.json({ message: "Đã xóa phòng và toàn bộ ghế/suất chiếu liên quan (Demo)" });
    }
    await pool!.request().input('id', sql.Int, id).execute("sp_DeleteRoom");
    res.json({ success: true });
  } catch (err: any) {
    if (err.message.includes('REFERENCE constraint')) {
      return res.status(409).json({ error: "Không thể xóa phòng này vì đang có suất chiếu hoặc ghế liên kết." });
    }
    res.status(500).json({ error: err.message });
  }
});


// 4. Quản lý Loại Ghế (Seat Types) - Định nghĩa các loại ghế và giá vé tương ứng
// API: Lấy danh sách loại ghế
app.get("/api/seat-types", async (req, res) => {
  try {
    const pool = await getPool();
    if (useMockData) return res.json(mockSeatTypes);
    const result = await pool!.request().execute("sp_GetAllSeatTypes");
    const normalized = result.recordset.map((row: Record<string, any>) => {
      const obj: Record<string, any> = {};
      for (const key in row) {
        const lowerKey = key.toLowerCase();
        // Định danh các trường cho loại ghế
        if (lowerKey === 'maloaighe') obj.MaLoaiGhe = row[key];
        else if (lowerKey === 'tenloai') obj.TenLoai = row[key];
        else if (lowerKey === 'giaghe') obj.GiaGhe = row[key];
        else obj[key] = row[key];
      }
      return obj;
    });
    res.json(normalized);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Thêm mới loại ghế
app.post("/api/seat-types", async (req, res) => {
  const { TenLoai, GiaGhe } = req.body;
  try {
    const pool = await getPool();
    if (useMockData) {
      const nextId = mockSeatTypes.length > 0 ? Math.max(...mockSeatTypes.map(s => s.MaLoaiGhe)) + 1 : 1;
      const newItem = { MaLoaiGhe: nextId, TenLoai, GiaGhe };
      mockSeatTypes.push(newItem);
      return res.status(201).json({ message: "Đã thêm loại ghế mới (Demo)" });
    }
    await pool!.request()
      .input('TenLoai', sql.NVarChar, TenLoai)
      .input('GiaGhe', sql.Decimal(18, 2), GiaGhe)
      .execute("sp_AddSeatType");
    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Cập nhật thông tin loại ghế
app.put("/api/seat-types/:id", async (req, res) => {
  const { id } = req.params;
  const { TenLoai, GiaGhe } = req.body;
  try {
    const pool = await getPool();
    if (useMockData) {
      const index = mockSeatTypes.findIndex(s => s.MaLoaiGhe === parseInt(id));
      if (index !== -1) {
        mockSeatTypes[index] = { ...mockSeatTypes[index], TenLoai, GiaGhe };
        return res.json({ message: "Đã cập nhật loại ghế (Demo)" });
      }
      return res.status(404).json({ error: "Không tìm thấy" });
    }
    await pool!.request()
      .input('id', sql.Int, id)
      .input('TenLoai', sql.NVarChar, TenLoai)
      .input('GiaGhe', sql.Decimal(18, 2), GiaGhe)
      .execute("sp_UpdateSeatType");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Xóa loại ghế
app.delete("/api/seat-types/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const idInt = parseInt(id);
    if (useMockData) {
      mockSeats = mockSeats.filter(s => s.MaLoaiGhe !== idInt);
      mockSeatTypes = mockSeatTypes.filter(s => s.MaLoaiGhe !== idInt);
      return res.json({ message: "Đã xóa loại ghế và các ghế liên quan (Demo)" });
    }
    await pool!.request().input('id', sql.Int, id).execute("sp_DeleteSeatType");
    res.json({ success: true });
  } catch (err: any) {
    if (err.message.includes('REFERENCE constraint')) {
      return res.status(409).json({ error: "Không thể xóa loại ghế này vì đang có các ghế thuộc loại này." });
    }
    res.status(500).json({ error: err.message });
  }
});


// 5. Quản lý Ghế (Seats) - Thiết lập sơ đồ ghế cho từng phòng chiếu
// API: Lấy danh sách toàn bộ ghế (kèm thông tin phòng và loại ghế)
app.get("/api/seats", async (req, res) => {
  try {
    const pool = await getPool();
    // Chế độ Demo: Kết hợp dữ liệu ghế với tên phòng và loại ghế tương ứng
    if (useMockData) return res.json(mockSeats.map(s => ({
      ...s,
      TenPhong: mockRooms.find(r => r.MaPhong == s.MaPhong)?.TenPhong,
      TenLoaiGhe: mockSeatTypes.find(lt => lt.MaLoaiGhe == s.MaLoaiGhe)?.TenLoai,
      GiaGhe: mockSeatTypes.find(lt => lt.MaLoaiGhe == s.MaLoaiGhe)?.GiaGhe
    })));

    // Thực thi stored procedure lấy toàn bộ danh sách ghế kèm thông tin liên quan
    const result = await pool!.request().execute("sp_GetAllSeats");
    const normalized = result.recordset.map((row: Record<string, any>) => {
      const obj: Record<string, any> = {};
      for (const key in row) {
        const lowerKey = key.toLowerCase();
        // Ánh xạ các trường dữ liệu từ SQL sang JS Object
        if (lowerKey === 'maghe') obj.MaGhe = row[key];
        else if (lowerKey === 'maphong') obj.MaPhong = row[key];
        else if (lowerKey === 'soghe') obj.SoGhe = row[key];
        else if (lowerKey === 'maloaighe') obj.MaLoaiGhe = row[key];
        else if (lowerKey === 'tenphong') obj.TenPhong = row[key];
        else if (lowerKey === 'tenloaighe') obj.TenLoaiGhe = row[key];
        else if (lowerKey === 'giaghe') obj.GiaGhe = row[key];
        else obj[key] = row[key];
      }
      return obj;
    });
    res.json(normalized);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Thêm ghế mới vào sơ đồ phòng
app.post("/api/seats", async (req, res) => {
  const { MaPhong, SoGhe, MaLoaiGhe } = req.body;
  try {
    const pool = await getPool();
    if (useMockData) {
      const nextId = mockSeats.length > 0 ? Math.max(...mockSeats.map(s => s.MaGhe)) + 1 : 1;
      const newItem = { MaGhe: nextId, MaPhong, SoGhe, MaLoaiGhe };
      mockSeats.push(newItem);
      return res.status(201).json({ message: "Đã thêm ghế mới (Demo)" });
    }
    await pool!.request()
      .input('MaPhong', sql.Int, MaPhong)
      .input('SoGhe', sql.NVarChar, SoGhe)
      .input('MaLoaiGhe', sql.Int, MaLoaiGhe)
      .execute("sp_AddSeat");
    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Cập nhật thông tin của một ghế
app.put("/api/seats/:id", async (req, res) => {
  const { id } = req.params;
  const { MaPhong, SoGhe, MaLoaiGhe } = req.body;
  try {
    const pool = await getPool();
    if (useMockData) {
      const index = mockSeats.findIndex(s => s.MaGhe === parseInt(id));
      if (index !== -1) {
        mockSeats[index] = { ...mockSeats[index], MaPhong, SoGhe, MaLoaiGhe };
        return res.json({ message: "Đã cập nhật thông tin ghế (Demo)" });
      }
      return res.status(404).json({ error: "Không tìm thấy" });
    }
    await pool!.request()
      .input('id', sql.Int, id)
      .input('MaPhong', sql.Int, MaPhong)
      .input('SoGhe', sql.NVarChar, SoGhe)
      .input('MaLoaiGhe', sql.Int, MaLoaiGhe)
      .execute("sp_UpdateSeat");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Xóa một ghế khỏi sơ đồ
app.delete("/api/seats/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const idInt = parseInt(id);
    if (useMockData) {
      // Xếp chồng xóa: xóa chi tiết hóa đơn liên quan trong demo
      mockInvoiceDetails = mockInvoiceDetails.filter(d => d.MaGhe !== idInt);
      mockSeats = mockSeats.filter(s => s.MaGhe !== idInt);
      return res.json({ message: "Đã xóa ghế và các chi tiết hóa đơn liên quan (Demo)" });
    }
    await pool!.request().input('id', sql.Int, id).execute("sp_DeleteSeat");
    res.json({ success: true });
  } catch (err: any) {
    if (err.message.includes('REFERENCE constraint')) {
      return res.status(409).json({ error: "Không thể xóa ghế này vì có hóa đơn liên quan (vé đã bán)." });
    }
    res.status(500).json({ error: err.message });
  }
});


// --- TẠM GIỮ GHẾ (TEMPORARY LOCK) ---
interface LockedSeat {
  MaSuat: number;
  MaGhe: number;
  expiresAt: number;
  sessionKey: string;
}
let lockedSeatsStore: LockedSeat[] = [];

// Cleanup expired seats periodically
setInterval(() => {
  const now = Date.now();
  lockedSeatsStore = lockedSeatsStore.filter(s => s.expiresAt > now);
}, 60000);

app.post("/api/lock-seats", (req, res) => {
  const { MaSuat, MaGheList, sessionKey, expiresAt } = req.body;
  if (!MaSuat || !MaGheList || !sessionKey) {
    return res.status(400).json({ error: "Thiếu dữ liệu" });
  }

  // Remove existing locks for this session first to prevent duplicates
  lockedSeatsStore = lockedSeatsStore.filter(s => s.sessionKey !== sessionKey);

  const expiry = expiresAt || Date.now() + 5 * 60 * 1000;

  MaGheList.forEach((MaGhe: number) => {
    lockedSeatsStore.push({ MaSuat: Number(MaSuat), MaGhe: Number(MaGhe), expiresAt: expiry, sessionKey });
  });

  res.json({ success: true });
});

app.post("/api/unlock-seats", (req, res) => {
  const { sessionKey } = req.body;
  if (!sessionKey) {
    return res.status(400).json({ error: "Thiếu sessionKey" });
  }

  lockedSeatsStore = lockedSeatsStore.filter(s => s.sessionKey !== sessionKey);
  res.json({ success: true });
});

app.get("/api/booked-seats/:showtimeId", async (req, res) => {
  const { showtimeId } = req.params;
  const suatIdNum = Number(showtimeId);
  const now = Date.now();

  // Get temporarily locked seats
  const locked = lockedSeatsStore
    .filter(s => s.MaSuat === suatIdNum && s.expiresAt > now)
    .map(s => s.MaGhe);

  try {
    const pool = await getPool();
    if (useMockData) {
      const booked = mockInvoiceDetails
        .filter(d => d.MaSuat == suatIdNum)
        .map(d => d.MaGhe);
      const combined = Array.from(new Set([...booked, ...locked]));
      return res.json(combined);
    }
    const result = await pool!.request()
      .input('MaSuat', sql.Int, showtimeId)
      .execute("sp_GetBookedSeats");

    const dbBooked = result.recordset.map(r => r.MaGhe);
    const combined = Array.from(new Set([...dbBooked, ...locked]));
    res.json(combined);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Quản lý Suất Chiếu (Showtimes) - Cấu hình lịch chiếu phim tại các phòng
// API: Lấy danh sách toàn bộ suất chiếu
app.get("/api/showtimes", async (req, res) => {
  try {
    const pool = await getPool();
    // Chế độ Demo: Kết nối thông tin phim và phòng từ mảng dữ liệu giả
    if (useMockData) return res.json(mockShowtimes.map(s => ({
      ...s,
      TenPhim: mockMovies.find(p => p.MaPhim == Number(s.MaPhim))?.TenPhim,
      TenPhong: mockRooms.find(r => r.MaPhong == Number(s.MaPhong))?.TenPhong
    })));

    // Lấy danh sách suất chiếu từ database
    const result = await pool!.request().execute("sp_GetAllShowtimes");
    const normalized = result.recordset.map((row: Record<string, any>) => {
      const obj: Record<string, any> = {};
      for (const key in row) {
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'masuat') obj.MaSuat = row[key];
        else if (lowerKey === 'maphim') obj.MaPhim = row[key];
        else if (lowerKey === 'maphong') obj.MaPhong = row[key];
        // Xử lý định dạng ngày tháng để hiển thị đúng trên thẻ input của trình duyệt
        else if (lowerKey === 'ngaychieu') {
          const d = row[key];
          obj.NgayChieu = d instanceof Date ? d.toISOString().split('T')[0] : d;
        }
        // Xử lý định dạng giờ giấc: Sử dụng các thành phần giờ địa phương để khớp chính xác với CSDL
        // Đã thêm bước bù trừ múi giờ (-7 tiếng) để getHours() không bị cộng thêm thời gian
        else if (lowerKey === 'giobatdau') {
          const t = row[key];
          if (t instanceof Date) {
            const adjustedT = new Date(t.getTime() - 7 * 60 * 60 * 1000);
            const h = adjustedT.getHours().toString().padStart(2, '0');
            const m = adjustedT.getMinutes().toString().padStart(2, '0');
            const s = adjustedT.getSeconds().toString().padStart(2, '0');
            obj.GioBatDau = `${h}:${m}:${s}`;
          } else {
            obj.GioBatDau = t;
          }
        }
        else if (lowerKey === 'gioketthuc') {
          const t = row[key];
          if (t instanceof Date) {
            const adjustedT = new Date(t.getTime() - 7 * 60 * 60 * 1000);
            const h = adjustedT.getHours().toString().padStart(2, '0');
            const m = adjustedT.getMinutes().toString().padStart(2, '0');
            const s = adjustedT.getSeconds().toString().padStart(2, '0');
            obj.GioKetThuc = `${h}:${m}:${s}`;
          } else {
            obj.GioKetThuc = t;
          }
        }
        else if (lowerKey === 'tenphim') obj.TenPhim = row[key];
        else if (lowerKey === 'tenphong') obj.TenPhong = row[key];
        else obj[key] = row[key];
      }
      return obj;
    });
    res.json(normalized);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Thêm mới một suất chiếu
app.post("/api/showtimes", async (req, res) => {
  const { MaPhim, MaPhong, NgayChieu, GioBatDau, GioKetThuc } = req.body;
  try {
    const pool = await getPool();
    if (useMockData) {
      const nextId = mockShowtimes.length > 0 ? Math.max(...mockShowtimes.map(s => s.MaSuat)) + 1 : 1;
      const newItem = { MaSuat: nextId, MaPhim, MaPhong, NgayChieu, GioBatDau, GioKetThuc };
      mockShowtimes.push(newItem);
      return res.status(201).json({ message: "Đã thêm suất chiếu mới (Demo)" });
    }
    await pool!.request()
      .input('MaPhim', sql.Int, MaPhim)
      .input('MaPhong', sql.Int, MaPhong)
      .input('NgayChieu', sql.Date, NgayChieu)
      .input('GioBatDau', sql.Time, GioBatDau)
      .input('GioKetThuc', sql.Time, GioKetThuc)
      .execute("sp_AddShowtime");
    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Cập nhật thông tin suất chiếu
app.put("/api/showtimes/:id", async (req, res) => {
  const { id } = req.params;
  const { MaPhim, MaPhong, NgayChieu, GioBatDau, GioKetThuc } = req.body;
  try {
    const pool = await getPool();
    if (useMockData) {
      const index = mockShowtimes.findIndex(s => s.MaSuat === parseInt(id));
      if (index !== -1) {
        mockShowtimes[index] = { ...mockShowtimes[index], MaPhim, MaPhong, NgayChieu, GioBatDau, GioKetThuc };
        return res.json({ message: "Đã cập nhật suất chiếu (Demo)" });
      }
      return res.status(404).json({ error: "Không tìm thấy" });
    }
    await pool!.request()
      .input('id', sql.Int, id)
      .input('MaPhim', sql.Int, MaPhim)
      .input('MaPhong', sql.Int, MaPhong)
      .input('NgayChieu', sql.Date, NgayChieu)
      .input('GioBatDau', sql.Time, GioBatDau)
      .input('GioKetThuc', sql.Time, GioKetThuc)
      .execute("sp_UpdateShowtime");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Xóa một suất chiếu
app.delete("/api/showtimes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const idInt = parseInt(id);
    if (useMockData) {
      // Xếp chồng xóa hóa đơn khi xóa suất chiếu trong demo
      const invoiceIdsToDelete = mockInvoiceDetails.filter(d => d.MaSuat === idInt).map(d => d.MaHoaDon);
      mockInvoices = mockInvoices.filter(i => !invoiceIdsToDelete.includes(i.MaHoaDon));
      mockInvoiceDetails = mockInvoiceDetails.filter(d => d.MaSuat !== idInt);
      mockShowtimes = mockShowtimes.filter(s => s.MaSuat !== idInt);
      return res.json({ message: "Đã xóa suất chiếu và các hóa đơn liên quan (Demo)" });
    }
    await pool!.request().input('id', sql.Int, id).execute("sp_DeleteShowtime");
    res.json({ success: true });
  } catch (err: any) {
    if (err.message.includes('REFERENCE constraint')) {
      return res.status(409).json({ error: "Không thể xóa suất chiếu này vì đã có vé được bán liên quan." });
    }
    res.status(500).json({ error: err.message });
  }
});


// 7. Quản lý Khách Hàng (Customers) - Quản lý tài khoản và thông tin người dùng
// API: Lấy danh sách phân loại người dùng (admin, khách hàng,...)
app.get("/api/customer-types", async (req, res) => {
  try {
    const pool = await getPool();
    if (useMockData) return res.json(mockCustomerTypes);
    const result = await pool!.request().execute("sp_GetAllCustomerTypes");
    const normalized = result.recordset.map((row: Record<string, any>) => {
      const obj: Record<string, any> = {};
      for (const key in row) {
        const lowerKey = key.toLowerCase();
        // Ánh xạ loại người dùng (Admin, Khách hàng,...)
        if (lowerKey === 'maloaiuser') obj.MaLoaiUser = row[key];
        else if (lowerKey === 'tenloai') obj.TenLoai = row[key];
        else obj[key] = row[key];
      }
      return obj;
    });
    res.json(normalized);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Lấy danh sách toàn bộ người dùng/khách hàng
app.get("/api/customers", async (req, res) => {
  try {
    const pool = await getPool();
    if (useMockData) return res.json(mockCustomers.map(c => ({ ...c, TenLoaiUser: mockCustomerTypes.find(t => t.MaLoaiUser === c.MaLoaiUser)?.TenLoai })));

    // Lấy danh sách khách hàng kèm tên loại người dùng từ database thông qua procedure
    const result = await pool!.request().execute("sp_GetAllCustomers");
    const normalized = result.recordset.map((row: Record<string, any>) => {
      const obj: Record<string, any> = {};
      for (const key in row) {
        const lowerKey = key.toLowerCase();
        // Ánh xạ thông tin chi tiết khách hàng
        if (lowerKey === 'makh') obj.MaKH = row[key];
        else if (lowerKey === 'ten') obj.Ten = row[key];
        else if (lowerKey === 'tendangnhap') obj.TenDangNhap = row[key];
        else if (lowerKey === 'matkhau') obj.MatKhau = row[key];
        else if (lowerKey === 'email') obj.Email = row[key];
        else if (lowerKey === 'sdt') obj.SDT = row[key];
        else if (lowerKey === 'maloaiuser') obj.MaLoaiUser = row[key];
        else if (lowerKey === 'tenloaiuser') obj.TenLoaiUser = row[key];
        else if (lowerKey === 'hinhanh') obj.HinhAnh = row[key] || null;
        else obj[key] = row[key];
      }
      return obj;
    });
    res.json(normalized);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Thêm mới thông tin khách hàng
app.post("/api/customers", async (req, res) => {
  const { Ten, TenDangNhap, MatKhau, Email, SDT, MaLoaiUser, HinhAnh } = req.body;
  try {
    const pool = await getPool();
    if (useMockData) {
      const nextId = mockCustomers.length > 0 ? Math.max(...mockCustomers.map(c => c.MaKH)) + 1 : 1;
      const newItem = { MaKH: nextId, Ten, TenDangNhap, MatKhau, Email, SDT, MaLoaiUser, HinhAnh };
      mockCustomers.push(newItem);
      return res.status(201).json({ message: "Đã thêm khách hàng mới (Demo)" });
    }
    await pool!.request()
      .input('Ten', sql.NVarChar, Ten)
      .input('TenDangNhap', sql.VarChar, TenDangNhap)
      .input('MatKhau', sql.VarChar, MatKhau)
      .input('Email', sql.VarChar, Email)
      .input('SDT', sql.VarChar, SDT)
      .input('MaLoaiUser', sql.Int, MaLoaiUser)
      .input('HinhAnh', sql.NVarChar(sql.MAX), HinhAnh || null)
      .execute("sp_AddCustomer");
    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Cập nhật thông tin khách hàng
app.put("/api/customers/:id", async (req, res) => {
  const { id } = req.params;
  const { Ten, TenDangNhap, MatKhau, Email, SDT, MaLoaiUser, HinhAnh } = req.body;
  try {
    const pool = await getPool();
    if (useMockData) {
      const index = mockCustomers.findIndex(c => c.MaKH === parseInt(id));
      if (index !== -1) {
        mockCustomers[index] = { ...mockCustomers[index], Ten, TenDangNhap, MatKhau, Email, SDT, MaLoaiUser, HinhAnh };
        return res.json({ message: "Đã cập nhật thông tin khách hàng (Demo)" });
      }
      return res.status(404).json({ error: "Không tìm thấy" });
    }
    await pool!.request()
      .input('id', sql.Int, id)
      .input('Ten', sql.NVarChar, Ten)
      .input('TenDangNhap', sql.VarChar, TenDangNhap)
      .input('MatKhau', sql.VarChar, MatKhau)
      .input('Email', sql.VarChar, Email)
      .input('SDT', sql.VarChar, SDT)
      .input('MaLoaiUser', sql.Int, MaLoaiUser)
      .input('HinhAnh', sql.NVarChar(sql.MAX), HinhAnh || null)
      .execute("sp_UpdateCustomer");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Cập nhật ảnh đại diện khách hàng (Profile.html)
app.patch("/api/customers/:id/avatar", async (req, res) => {
  const { id } = req.params;
  const { HinhAnh } = req.body;
  try {
    const pool = await getPool();
    if (useMockData) {
      const index = mockCustomers.findIndex(c => c.MaKH === parseInt(id));
      if (index !== -1) {
        mockCustomers[index] = { ...mockCustomers[index], HinhAnh: HinhAnh || "" };
        return res.json({ success: true, HinhAnh: mockCustomers[index].HinhAnh });
      }
      return res.status(404).json({ error: "Không tìm thấy" });
    }
    await pool!.request()
      .input('id', sql.Int, id)
      .input('HinhAnh', sql.NVarChar(sql.MAX), HinhAnh || null)
      .execute("sp_UpdateCustomerAvatar");
    res.json({ success: true, HinhAnh });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Xóa một khách hàng
app.delete("/api/customers/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const idInt = parseInt(id);
    if (useMockData) {
      // Xếp chồng xóa: xóa toàn bộ hóa đơn/chi tiết của khách này
      const invoiceIds = mockInvoices.filter(i => i.MaKH === idInt).map(i => i.MaHoaDon);
      mockInvoiceDetails = mockInvoiceDetails.filter(d => !invoiceIds.includes(d.MaHoaDon));
      mockInvoices = mockInvoices.filter(i => i.MaKH !== idInt);
      mockCustomers = mockCustomers.filter(c => c.MaKH !== idInt);
      return res.json({ message: "Đã xóa khách hàng và các hóa đơn liên quan (Demo)" });
    }
    await pool!.request().input('id', sql.Int, id).execute("sp_DeleteCustomer");
    res.json({ success: true });
  } catch (err: any) {
    if (err.message.includes('REFERENCE constraint')) {
      return res.status(409).json({ error: "Không thể xóa khách hàng này vì đang có hóa đơn liên quan." });
    }
    res.status(500).json({ error: err.message });
  }
});


// 8. Quản lý Hóa Đơn & Chi Tiết (Invoices & Details) - Xử lý đặt vé và thanh toán
// API: Lấy danh sách toàn bộ hóa đơn
app.get("/api/invoices", async (req, res) => {
  try {
    const pool = await getPool();
    // Chế độ Demo: Lấy tên khách hàng từ MaKH
    if (useMockData) {
      return res.json(mockInvoices.map(i => ({
        ...i,
        TenKhachHang: mockCustomers.find(c => c.MaKH == i.MaKH)?.Ten,
        TenPhim: mockMovies.find(m => mockInvoiceDetails.some(d => d.MaHoaDon === i.MaHoaDon && d.MaPhim === m.MaPhim))?.TenPhim,
        PhuongThuc: mockPayments.find(p => p.MaThanhToan === i.PhuongThuc)?.TenPhuongThuc || i.PhuongThuc
      })));
    }

    // Lấy danh sách hóa đơn từ SQL Server
    const result = await pool!.request().execute("sp_GetAllInvoices");
    const normalized = result.recordset.map((row: Record<string, any>) => normalizeInvoiceRow(row));
    res.json(normalized);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Lấy một hóa đơn theo ID (kèm MaQR — dùng khi xem vé QR)
app.get("/api/invoices/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: "Mã hóa đơn không hợp lệ" });
  try {
    const pool = await getPool();
    if (useMockData) {
      const inv = mockInvoices.find(i => i.MaHoaDon === id);
      if (!inv) return res.status(404).json({ error: "Không tìm thấy hóa đơn" });
      return res.json({
        ...inv,
        MaQR: parseSqlGuid(inv.MaQR) || inv.MaQR,
        TenKhachHang: mockCustomers.find(c => c.MaKH == inv.MaKH)?.Ten,
        TenPhim: mockMovies.find(m => mockInvoiceDetails.some(d => d.MaHoaDon === id && d.MaPhim === m.MaPhim))?.TenPhim,
        PhuongThuc: mockPayments.find(p => p.MaThanhToan === inv.PhuongThuc)?.TenPhuongThuc || inv.PhuongThuc
      });
    }
    const result = await pool!.request().execute("sp_GetAllInvoices");
    const row = result.recordset.find((r: Record<string, any>) => {
      const keys = Object.keys(r);
      const key = keys.find(k => k.toLowerCase() === "mahoadon");
      return key && Number(r[key]) === id;
    });
    if (!row) return res.status(404).json({ error: "Không tìm thấy hóa đơn" });
    res.json(normalizeInvoiceRow(row));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/invoice-details/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    if (useMockData) {
      // Lấy chi tiết hóa đơn kèm thông tin phim và ghế (Demo)
      return res.json(mockInvoiceDetails.filter(d => d.MaHoaDon == Number(id)).map(d => {
        const showtime = mockShowtimes.find(s => s.MaSuat == d.MaSuat);
        const movie = mockMovies.find(m => m.MaPhim == showtime?.MaPhim);
        const seat = mockSeats.find(g => g.MaGhe == d.MaGhe);
        return { ...d, TenPhim: movie?.TenPhim, SoGhe: seat?.SoGhe };
      }));
    }
    // Lấy chi tiết hóa đơn kèm JOIN phim và ghế cho đầy đủ thông tin
    const result = await pool!.request().input('id', sql.Int, id).execute("sp_GetInvoiceDetails");
    const normalized = result.recordset.map((row: Record<string, any>) => normalizeInvoiceDetailRow(row));
    res.json(normalized);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Cập nhật hóa đơn và các thông tin chi tiết liên quan
app.put("/api/invoices/:id", async (req, res) => {
  const { id } = req.params;
  const { MaKH, NgayDat, TongTien, MaPhim, MaSuat, MaGheList, GiaVe, PhuongThuc } = req.body;
  try {
    const pool = await getPool();
    const gheIds = Array.isArray(MaGheList) ? MaGheList : [MaGheList];

    if (useMockData) {
      const index = mockInvoices.findIndex(i => i.MaHoaDon === parseInt(id));
      if (index !== -1) {
        mockInvoices[index] = { ...mockInvoices[index], MaKH: parseInt(MaKH), NgayDat, TongTien: parseFloat(TongTien), PhuongThuc };

        // Cập nhật chi tiết: xóa cũ thêm mới (Demo)
        mockInvoiceDetails = mockInvoiceDetails.filter(d => d.MaHoaDon !== parseInt(id));
        gheIds.forEach(gheId => {
          const nextDetId = mockInvoiceDetails.length > 0 ? Math.max(...mockInvoiceDetails.map(d => d.MaCT)) + 1 : 1;
          mockInvoiceDetails.push({
            MaCT: nextDetId, MaHoaDon: parseInt(id), MaPhim: parseInt(MaPhim), MaSuat: parseInt(MaSuat),
            MaGhe: parseInt(gheId), GiaVe: parseFloat(GiaVe)
          });
        });

        return res.json({ message: "Đã cập nhật hóa đơn (Demo)" });
      }
      return res.status(404).json({ error: "Không tìm thấy" });
    }

    await pool!.request()
      .input('id', sql.Int, id)
      .input('MaKH', sql.Int, MaKH)
      .input('NgayDat', sql.DateTime, NgayDat)
      .input('TongTien', sql.Decimal(18, 0), TongTien)
      .input('PhuongThuc', sql.Int, PhuongThuc)
      .execute("sp_UpdateInvoiceHeader");

    await pool!.request().input('id', sql.Int, id).execute("sp_DeleteInvoiceDetails");

    for (const gheId of gheIds) {
      await pool!.request()
        .input('MaHoaDon', sql.Int, id)
        .input('MaPhim', sql.Int, MaPhim)
        .input('MaSuat', sql.Int, MaSuat)
        .input('MaGhe', sql.Int, gheId)
        .input('GiaVe', sql.Decimal(18, 0), GiaVe)
        .execute("sp_AddInvoiceDetail");
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Xóa một hóa đơn (và các chi tiết vé thuộc hóa đơn đó)
app.delete("/api/invoices/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    if (useMockData) {
      mockInvoices = mockInvoices.filter(i => i.MaHoaDon !== parseInt(id));
      mockInvoiceDetails = mockInvoiceDetails.filter(d => d.MaHoaDon !== parseInt(id));
      // mockInvoiceCombos = mockInvoiceCombos.filter(c => c.MaHoaDon !== parseInt(id));
      return res.json({ message: "Đã xóa hóa đơn và các dữ liệu liên quan (Demo)" });
    }
    // Xóa theo đúng thứ tự để không bị lỗi ràng buộc khóa ngoại (FK)
    await pool!.request().input('id', sql.Int, id).execute("sp_DeleteInvoice");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/invoices", async (req, res) => {
  const { MaKH, NgayDat, TongTien, MaPhim, MaSuat, MaGheList, GiaVe, PhuongThuc, Combos } = req.body;
  const comboItems = Combos || [];
  try {
    const pool = await getPool();
    const gheIds = Array.isArray(MaGheList) ? MaGheList : [MaGheList];

    if (useMockData) {
      const nextInvId = mockInvoices.length > 0 ? Math.max(...mockInvoices.map(i => i.MaHoaDon)) + 1 : 1;
      const newMaQR = crypto.randomUUID();
      mockInvoices.push({ MaHoaDon: nextInvId, MaKH: parseInt(MaKH), NgayDat, TongTien: parseFloat(TongTien), PhuongThuc, MaQR: newMaQR });

      // Logic gộp dòng cho Demo
      const iterations = Math.max(gheIds.length, comboItems.length);
      for (let i = 0; i < iterations; i++) {
        const nextDetId = mockInvoiceDetails.length > 0 ? Math.max(...mockInvoiceDetails.map(d => d.MaCT)) + 1 : 1;
        const gheId = gheIds[i] || null;
        const combo = comboItems[i] || null;
        mockInvoiceDetails.push({
          MaCT: nextDetId,
          MaHoaDon: nextInvId,
          MaPhim: gheId ? parseInt(MaPhim) : null,
          MaSuat: gheId ? parseInt(MaSuat) : null,
          MaGhe: gheId ? parseInt(gheId) : null,
          MaSP: combo ? combo.MaSP : null,
          SoLuongSP: combo ? combo.SoLuong : null,
          GiaVe: gheId ? parseFloat(GiaVe) : 0,
          GiaSP: combo ? parseFloat(combo.DonGia) : 0
        } as any);
      }

      return res.status(201).json({ success: true, MaHoaDon: nextInvId, MaQR: newMaQR, message: "Đã tạo hóa đơn (Demo)" });
    }

    // MySQL: mỗi stored procedure đã START TRANSACTION/COMMIT riêng — không bọc thêm Transaction Node (tránh treo request)
    const invRes = await pool!.request()
      .input('MaKH', sql.Int, MaKH)
      .input('NgayDat', sql.DateTime, NgayDat)
      .input('TongTien', sql.Decimal(18, 0), TongTien)
      .input('PhuongThuc', sql.Int, PhuongThuc)
      .execute("sp_CreateInvoiceHeader");
    const invRow = invRes.recordset[0] || {};
    const newInvId = Number(invRow.MaHoaDon ?? (invRow as Record<string, unknown>).mahoadon);
    const newMaQR =
      parseSqlGuid(invRow.MaQR ?? (invRow as Record<string, unknown>).maqr) ||
      invRow.MaQR ||
      (invRow as Record<string, unknown>).maqr;

    if (!Number.isFinite(newInvId)) {
      throw new Error("Không tạo được hóa đơn");
    }

    // Logic gộp dòng cho MySQL (Zipping)
    // Nếu mua 1 vé + 1 bắp nước -> Sẽ chỉ gọi Procedure 1 lần để tạo 1 dòng duy nhất
    const iterations = Math.max(gheIds.length, comboItems.length);
    for (let i = 0; i < iterations; i++) {
      const gheId = gheIds[i] || null;
      const combo = comboItems[i] || null;

      await pool!.request()
        .input('MaHoaDon', sql.Int, newInvId)
        .input('MaPhim', sql.Int, gheId ? MaPhim : null)
        .input('MaSuat', sql.Int, gheId ? MaSuat : null)
        .input('MaGhe', sql.Int, gheId)
        .input('MaSP', sql.Int, combo ? combo.MaSP : null)
        .input('SoLuongSP', sql.Int, combo ? combo.SoLuong : null)
        .input('GiaVe', sql.Decimal(18, 0), gheId ? GiaVe : 0)
        .input('GiaSP', sql.Int, combo ? combo.DonGia : 0)
        .execute("sp_AddInvoiceDetail");
    }

    res.status(201).json({ success: true, MaHoaDon: newInvId, MaQR: newMaQR });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Quản lý Thanh Toán (Payments) - Quản lý các hình thức thanh toán được hỗ trợ (Momo, Chuyển khoản,...)
// API: Lấy danh sách các phương thức thanh toán
app.get("/api/payments", async (req, res) => {
  try {
    const pool = await getPool();
    if (useMockData) return res.json(mockPayments);
    const result = await pool!.request().execute("sp_GetAllPayments");
    const normalized = result.recordset.map((row: Record<string, any>) => {
      const obj: Record<string, any> = {};
      for (const key in row) {
        const lowerKey = key.toLowerCase();
        // Ánh xạ phương thức thanh toán
        if (lowerKey === 'mathanhtoan') obj.MaThanhToan = row[key];
        else if (lowerKey === 'tenphuongthuc') obj.TenPhuongThuc = row[key];
        else if (lowerKey === 'hinhanh') obj.HinhAnh = row[key];
        else obj[key] = row[key];
      }
      return obj;
    });
    res.json(normalized);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Thêm phương thức thanh toán mới
app.post("/api/payments", async (req, res) => {
  const { TenPhuongThuc, HinhAnh } = req.body;
  try {
    const pool = await getPool();
    if (useMockData) {
      const nextId = mockPayments.length > 0 ? Math.max(...mockPayments.map(p => p.MaThanhToan)) + 1 : 1;
      const newItem = { MaThanhToan: nextId, TenPhuongThuc, HinhAnh };
      mockPayments.push(newItem);
      return res.status(201).json({ message: "Đã thêm phương thức mới (Demo)" });
    }
    await pool!.request()
      .input('TenPhuongThuc', sql.NVarChar, TenPhuongThuc)
      .input('HinhAnh', sql.NVarChar, HinhAnh)
      .execute("sp_AddPayment");
    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Cập nhật phương thức thanh toán
app.put("/api/payments/:id", async (req, res) => {
  const { id } = req.params;
  const { TenPhuongThuc, HinhAnh } = req.body;
  try {
    const pool = await getPool();
    if (useMockData) {
      const index = mockPayments.findIndex(p => p.MaThanhToan === parseInt(id));
      if (index !== -1) {
        mockPayments[index] = { ...mockPayments[index], TenPhuongThuc, HinhAnh };
        return res.json({ message: "Đã cập nhật phương thức (Demo)" });
      }
      return res.status(404).json({ error: "Không tìm thấy" });
    }
    await pool!.request()
      .input('id', sql.Int, id)
      .input('TenPhuongThuc', sql.NVarChar, TenPhuongThuc)
      .input('HinhAnh', sql.NVarChar, HinhAnh)
      .execute("sp_UpdatePayment");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Xóa phương thức thanh toán
app.delete("/api/payments/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    if (useMockData) {
      mockPayments = mockPayments.filter(p => p.MaThanhToan !== parseInt(id));
      return res.json({ message: "Payment deleted (Demo)" });
    }
    await pool!.request().input('id', sql.Int, id).execute("sp_DeletePayment");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- QUẢN LÝ BANNER (BANNER SECTION) ---
// API: Lấy danh sách banner
app.get("/api/banners", async (req, res) => {
  try {
    const pool = await getPool();
    if (useMockData) {
      return res.json(mockBanners.map(b => ({
        ...b,
        TenPhim: mockMovies.find(m => m.MaPhim === b.MaPhim)?.TenPhim || ''
      })));
    }
    // Gọi stored procedure sp_GetAllBanners để lấy danh sách banners từ CSDL
    const result = await pool!.request().execute("sp_GetAllBanners");
    const normalized = result.recordset.map((row: Record<string, any>) => {
      const obj: Record<string, any> = {};
      for (const key in row) {
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'mabanner') obj.MaBanner = row[key];
        else if (lowerKey === 'tenbanner') obj.TenBanner = row[key];
        else if (lowerKey === 'linkbanner') obj.LinkBanner = row[key];
        else if (lowerKey === 'maphim') obj.MaPhim = row[key];
        else if (lowerKey === 'tenphim') obj.TenPhim = row[key];
        else obj[key] = row[key];
      }
      return obj;
    });
    res.json(normalized);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Thêm mới banner
app.post("/api/banners", async (req, res) => {
  const { TenBanner, LinkBanner, MaPhim } = req.body;
  try {
    const pool = await getPool();
    if (useMockData) {
      const nextId = mockBanners.length > 0 ? Math.max(...mockBanners.map(b => b.MaBanner)) + 1 : 1;
      const newItem = { MaBanner: nextId, TenBanner, LinkBanner, MaPhim: MaPhim ? parseInt(MaPhim) : null };
      mockBanners.push(newItem);
      return res.status(201).json({ message: "Đã thêm banner mới (Demo)" });
    }
    // Gọi stored procedure sp_AddBanner để thêm mới banner vào CSDL
    await pool!.request()
      .input('TenBanner', sql.NVarChar(50), TenBanner)
      .input('LinkBanner', sql.NVarChar(sql.MAX), LinkBanner)
      .input('MaPhim', sql.Int, MaPhim ? parseInt(MaPhim) : null)
      .execute("sp_AddBanner");
    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Cập nhật banner
app.put("/api/banners/:id", async (req, res) => {
  const { id } = req.params;
  const { TenBanner, LinkBanner, MaPhim } = req.body;
  try {
    const pool = await getPool();
    if (useMockData) {
      const index = mockBanners.findIndex(b => b.MaBanner === parseInt(id));
      if (index !== -1) {
        mockBanners[index] = { ...mockBanners[index], TenBanner, LinkBanner, MaPhim: MaPhim ? parseInt(MaPhim) : null };
        return res.json({ message: "Đã cập nhật banner (Demo)" });
      }
      return res.status(404).json({ error: "Không tìm thấy" });
    }
    // Gọi stored procedure sp_UpdateBanner để cập nhật thông tin banner trong CSDL
    await pool!.request()
      .input('id', sql.Int, id)
      .input('TenBanner', sql.NVarChar(50), TenBanner)
      .input('LinkBanner', sql.NVarChar(sql.MAX), LinkBanner)
      .input('MaPhim', sql.Int, MaPhim ? parseInt(MaPhim) : null)
      .execute("sp_UpdateBanner");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Xóa banner
app.delete("/api/banners/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    if (useMockData) {
      mockBanners = mockBanners.filter(b => b.MaBanner !== parseInt(id));
      return res.json({ message: "Đã xóa banner (Demo)" });
    }
    // Gọi stored procedure sp_DeleteBanner để xóa banner ra khỏi CSDL
    await pool!.request()
      .input('id', sql.Int, id)
      .execute("sp_DeleteBanner");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================
// QUẢN LÝ LOẠI SẢN PHẨM & SẢN PHẨM (bảng LoaiSP, SanPham)
// =============================================

// API: Lấy danh sách loại sản phẩm
app.get("/api/loaisp", async (req, res) => {
  try {
    const pool = await getPool();
    if (useMockData) return res.json(mockProductCategories);

    const [rows] = await mysqlPool.query(
      "SELECT MaLoaiSP, TenLoaiSP FROM LoaiSP ORDER BY MaLoaiSP"
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Thêm mới loại sản phẩm
app.post("/api/loaisp", async (req, res) => {
  const { TenLoaiSP } = req.body;
  try {
    const pool = await getPool();
    if (useMockData) {
      const nextId = mockProductCategories.length > 0 ? Math.max(...mockProductCategories.map(c => c.MaLoaiSP)) + 1 : 1;
      mockProductCategories.push({ MaLoaiSP: nextId, TenLoaiSP });
      return res.status(201).json({ message: "Đã thêm loại sản phẩm mới (Demo)" });
    }
    await mysqlPool.query("INSERT INTO LoaiSP (TenLoaiSP) VALUES (?)", [TenLoaiSP]);
    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Cập nhật loại sản phẩm
app.put("/api/loaisp/:id", async (req, res) => {
  const { id } = req.params;
  const { TenLoaiSP } = req.body;
  try {
    const pool = await getPool();
    if (useMockData) {
      const index = mockProductCategories.findIndex(c => c.MaLoaiSP === parseInt(id));
      if (index !== -1) {
        mockProductCategories[index] = { ...mockProductCategories[index], TenLoaiSP };
        return res.json({ message: "Đã cập nhật loại sản phẩm (Demo)" });
      }
      return res.status(404).json({ error: "Không tìm thấy" });
    }
    await mysqlPool.query("UPDATE LoaiSP SET TenLoaiSP = ? WHERE MaLoaiSP = ?", [TenLoaiSP, id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Xóa loại sản phẩm
app.delete("/api/loaisp/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    if (useMockData) {
      mockProductCategories = mockProductCategories.filter(c => c.MaLoaiSP !== parseInt(id));
      return res.json({ message: "Đã xóa loại sản phẩm (Demo)" });
    }
    await mysqlPool.query("DELETE FROM LoaiSP WHERE MaLoaiSP = ?", [id]);
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({ error: "Không thể xóa loại SP vì đang có sản phẩm liên quan." });
    }
    res.status(500).json({ error: err.message });
  }
});

// API: Lấy danh sách sản phẩm
app.get("/api/sanpham", async (req, res) => {
  try {
    const pool = await getPool();
    if (useMockData) {
      const products = mockProducts.map(p => {
        const cat = mockProductCategories.find(c => c.MaLoaiSP === p.MaLoaiSP);
        return { ...p, LoaiTen: cat ? cat.TenLoaiSP : '' };
      });
      return res.json(products);
    }
    const [rows] = await mysqlPool.query(`
      SELECT sp.MaSP, sp.MaLoaiSP, sp.TenSP, sp.Gia, sp.HinhAnh, sp.MoTa,
             lsp.TenLoaiSP AS LoaiTen
      FROM SanPham sp
      LEFT JOIN LoaiSP lsp ON sp.MaLoaiSP = lsp.MaLoaiSP
      ORDER BY sp.MaSP
    `);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Thêm sản phẩm mới
app.post("/api/sanpham", async (req, res) => {
  const { TenSP, Gia, HinhAnh, MoTa, MaLoaiSP } = req.body;
  try {
    const pool = await getPool();
    if (useMockData) {
      const nextId = mockProducts.length > 0 ? Math.max(...mockProducts.map(p => p.MaSP)) + 1 : 1;
      mockProducts.push({ MaSP: nextId, TenSP, Gia, HinhAnh, MoTa, MaLoaiSP: parseInt(MaLoaiSP) });
      return res.status(201).json({ message: "Đã thêm sản phẩm mới (Demo)" });
    }
    await mysqlPool.query(
      "INSERT INTO SanPham (TenSP, Gia, HinhAnh, MoTa, MaLoaiSP) VALUES (?, ?, ?, ?, ?)",
      [TenSP, Gia, HinhAnh || null, MoTa || null, MaLoaiSP]
    );
    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Cập nhật sản phẩm
app.put("/api/sanpham/:id", async (req, res) => {
  const { id } = req.params;
  const { TenSP, Gia, HinhAnh, MoTa, MaLoaiSP } = req.body;
  try {
    const pool = await getPool();
    if (useMockData) {
      const index = mockProducts.findIndex(p => p.MaSP === parseInt(id));
      if (index !== -1) {
        mockProducts[index] = { ...mockProducts[index], TenSP, Gia, HinhAnh, MoTa, MaLoaiSP: parseInt(MaLoaiSP) };
        return res.json({ message: "Đã cập nhật sản phẩm (Demo)" });
      }
      return res.status(404).json({ error: "Không tìm thấy" });
    }
    await mysqlPool.query(
      "UPDATE SanPham SET TenSP = ?, Gia = ?, HinhAnh = ?, MoTa = ?, MaLoaiSP = ? WHERE MaSP = ?",
      [TenSP, Gia, HinhAnh || null, MoTa || null, MaLoaiSP, id]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Xóa sản phẩm
app.delete("/api/sanpham/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    if (useMockData) {
      mockProducts = mockProducts.filter(p => p.MaSP !== parseInt(id));
      return res.json({ message: "Đã xóa sản phẩm (Demo)" });
    }
    await mysqlPool.query("DELETE FROM SanPham WHERE MaSP = ?", [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// =============================================
// QUẢN LÝ BÌNH LUẬN PHIM (BinhLuan)
// =============================================

// API: Lấy bình luận theo mã phim
app.get("/api/binhluan/:maPhim", async (req, res) => {
  const maPhim = parseInt(req.params.maPhim, 10);
  if (!maPhim) return res.status(400).json({ error: "Mã phim không hợp lệ" });
  try {
    const pool = await getPool();
    if (useMockData) {
      const list = mockComments
        .filter(c => c.MaPhim === maPhim && c.TrangThai === "Hiện"
          && (c.NoiDung || '').toString().trim().length > 0
          && Number(c.SoSao) >= 1)
        .map(c => {
          const kh = mockCustomers.find(k => k.MaKH === c.MaKH);
          return { ...c, TenKH: kh?.Ten || "Thành viên", HinhAnh: kh?.HinhAnh || "" };
        })
        .sort((a: Record<string, any>, b: Record<string, any>) => new Date(b.NgayBL).getTime() - new Date(a.NgayBL).getTime());
      return res.json(list);
    }
    const result = await pool!.request()
      .input('MaPhim', sql.Int, maPhim)
      .execute("sp_GetCommentsByMovie");
    const normalized = result.recordset.map((row: Record<string, any>) => {
      const obj: Record<string, any> = {};
      for (const key in row) {
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'mabl') obj.MaBL = row[key];
        else if (lowerKey === 'maphim') obj.MaPhim = row[key];
        else if (lowerKey === 'makh') obj.MaKH = row[key];
        else if (lowerKey === 'noidung') obj.NoiDung = row[key];
        else if (lowerKey === 'sosao') obj.SoSao = row[key];
        else if (lowerKey === 'ngaybl') obj.NgayBL = row[key];
        else if (lowerKey === 'trangthai') obj.TrangThai = row[key];
        else if (lowerKey === 'tenkh') obj.TenKH = row[key];
        else if (lowerKey === 'hinhanh') obj.HinhAnh = row[key];
        else obj[key] = row[key];
      }
      return obj;
    }).filter((c: Record<string, any>) => {
      const content = (c.NoiDung || '').toString().trim();
      return content.length > 0 && Number(c.SoSao) >= 1;
    });
    res.json(normalized);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Thêm bình luận (bắt buộc đăng nhập — gửi MaKH từ client)
app.post("/api/binhluan", async (req, res) => {
  const { MaPhim, MaKH, NoiDung, SoSao } = req.body;
  if (!MaPhim || !MaKH || !NoiDung || !SoSao) {
    return res.status(400).json({ error: "Thiếu thông tin bình luận" });
  }
  if (SoSao < 1 || SoSao > 5) {
    return res.status(400).json({ error: "Số sao phải từ 1 đến 5" });
  }
  try {
    const pool = await getPool();
    if (useMockData) {
      const nextId = mockComments.length > 0 ? Math.max(...mockComments.map(c => c.MaBL)) + 1 : 1;
      const item = {
        MaBL: nextId,
        MaPhim: parseInt(MaPhim),
        MaKH: parseInt(MaKH),
        NoiDung,
        SoSao: parseInt(SoSao),
        NgayBL: new Date().toISOString(),
        TrangThai: "Hiện"
      };
      mockComments.push(item);
      const kh = mockCustomers.find(k => k.MaKH === item.MaKH);
      return res.status(201).json({ ...item, TenKH: kh?.Ten, HinhAnh: kh?.HinhAnh });
    }
    const result = await pool!.request()
      .input('MaPhim', sql.Int, MaPhim)
      .input('MaKH', sql.Int, MaKH)
      .input('NoiDung', sql.NVarChar(1000), NoiDung)
      .input('SoSao', sql.Int, SoSao)
      .execute("sp_AddComment");
    res.status(201).json({ success: true, MaBL: result.recordset[0]?.MaBL });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** Thống kê dashboard từ dữ liệu giả (Demo) */
function computeAdminStatsFromMock() {
  const totalRevenue = mockInvoices.reduce((s, i) => s + Number(i.TongTien), 0);
  const monthMap = new Map<string, number>();
  mockInvoices.forEach((i) => {
    const d = new Date(i.NgayDat);
    const label = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    monthMap.set(label, (monthMap.get(label) || 0) + Number(i.TongTien));
  });
  const revenueByMonth = [...monthMap.entries()].slice(-6).map(([label, total]) => ({ label, total }));

  const payMap = new Map<string, number>();
  mockInvoices.forEach((i) => {
    const p = mockPayments.find((x) => x.MaThanhToan === i.PhuongThuc);
    const label = p?.TenPhuongThuc || `Phương thức #${i.PhuongThuc}`;
    payMap.set(label, (payMap.get(label) || 0) + Number(i.TongTien));
  });
  const revenueByPayment = [...payMap.entries()].map(([label, total]) => ({ label, total }));

  const statusMap = new Map<string, number>();
  mockMovies.forEach((m) => {
    const label = m.TrangThai || "Khác";
    statusMap.set(label, (statusMap.get(label) || 0) + 1);
  });
  const moviesByStatus = [...statusMap.entries()].map(([label, count]) => ({ label, count }));

  const recentInvoices = [...mockInvoices]
    .sort((a, b) => new Date(b.NgayDat).getTime() - new Date(a.NgayDat).getTime())
    .slice(0, 5)
    .map((i) => ({
      MaHoaDon: i.MaHoaDon,
      TongTien: i.TongTien,
      NgayDat: i.NgayDat,
      TenKhachHang: mockCustomers.find((c) => c.MaKH === i.MaKH)?.Ten,
    }));

  return {
    summary: {
      totalRevenue,
      totalInvoices: mockInvoices.length,
      totalCustomers: mockCustomers.length,
      totalMovies: mockMovies.length,
    },
    revenueByMonth,
    revenueByPayment,
    moviesByStatus,
    recentInvoices,
  };
}

// --- TÀI LIỆU API (Swagger / OpenAPI — tiêu chí 1) ---
app.get("/api/openapi.json", (_req, res) => {
  const specPath = path.join(process.cwd(), "docs", "openapi.json");
  if (!fs.existsSync(specPath)) {
    return res.status(404).json({ success: false, error: "Không tìm thấy openapi.json" });
  }
  res.type("application/json").send(fs.readFileSync(specPath, "utf-8"));
});

app.get("/api-docs", (_req, res) => {
  res.type("html").send(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <title>Cinema API — Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"/>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({ url: '/api/openapi.json', dom_id: '#swagger-ui', deepLinking: true });
  </script>
</body>
</html>`);
});

// --- THỐNG KÊ ADMIN (tiêu chí 7) ---
app.get("/api/admin/stats", async (_req, res) => {
  try {
    if (useMockData) {
      return res.json(computeAdminStatsFromMock());
    }

    const [revMonthRows] = await mysqlPool.query(
      `SELECT DATE_FORMAT(NgayDat, '%m/%Y') AS label, SUM(TongTien) AS total
       FROM HoaDon
       WHERE NgayDat >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
       GROUP BY YEAR(NgayDat), MONTH(NgayDat)
       ORDER BY MIN(NgayDat) ASC`
    );
    const [payRows] = await mysqlPool.query(
      `SELECT COALESCE(t.TenPhuongThuc, CONCAT('PT #', h.PhuongThuc)) AS label,
              SUM(h.TongTien) AS total
       FROM HoaDon h
       LEFT JOIN ThanhToan t ON h.PhuongThuc = t.MaThanhToan
       GROUP BY h.PhuongThuc, t.TenPhuongThuc`
    );
    const [movieRows] = await mysqlPool.query(
      `SELECT TrangThai AS label, COUNT(*) AS count FROM Phim GROUP BY TrangThai`
    );
    const [sumRows] = await mysqlPool.query(
      `SELECT
         (SELECT COALESCE(SUM(TongTien),0) FROM HoaDon) AS totalRevenue,
         (SELECT COUNT(*) FROM HoaDon) AS totalInvoices,
         (SELECT COUNT(*) FROM KhachHang) AS totalCustomers,
         (SELECT COUNT(*) FROM Phim) AS totalMovies`
    );
    const [recentRows] = await mysqlPool.query(
      `SELECT h.MaHoaDon, h.TongTien, h.NgayDat, k.Ten AS TenKhachHang
       FROM HoaDon h
       JOIN KhachHang k ON h.MaKH = k.MaKH
       ORDER BY h.NgayDat DESC
       LIMIT 5`
    );

    const summaryRow = (sumRows as Record<string, unknown>[])[0] || {};
    res.json({
      summary: {
        totalRevenue: Number(summaryRow.totalRevenue) || 0,
        totalInvoices: Number(summaryRow.totalInvoices) || 0,
        totalCustomers: Number(summaryRow.totalCustomers) || 0,
        totalMovies: Number(summaryRow.totalMovies) || 0,
      },
      revenueByMonth: (revMonthRows as Record<string, unknown>[]).map((r) => ({
        label: r.label,
        total: Number(r.total) || 0,
      })),
      revenueByPayment: (payRows as Record<string, unknown>[]).map((r) => ({
        label: r.label,
        total: Number(r.total) || 0,
      })),
      moviesByStatus: (movieRows as Record<string, unknown>[]).map((r) => ({
        label: r.label,
        count: Number(r.count) || 0,
      })),
      recentInvoices: (recentRows as Record<string, unknown>[]).map((r) => ({
        MaHoaDon: r.MaHoaDon,
        TongTien: Number(r.TongTien) || 0,
        NgayDat: r.NgayDat,
        TenKhachHang: r.TenKhachHang,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Lỗi thống kê" });
  }
});

// 404 cho route API không tồn tại
app.use("/api", (req, res) => {
  if (!res.headersSent) {
    res.status(404).json({ success: false, error: `API không tồn tại: ${req.method} ${req.path}` });
  }
});

/**
 * Khởi động Server

 * Trong môi trường phát triển: Sử dụng Vite Middleware để hỗ trợ Hot Module Replacement (HMR)
 * Trong môi trường sản xuất: Phục vụ các file tĩnh đã build trong thư mục dist
 */
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Cấu hình Vite làm middleware để xử lý yêu cầu Frontend trong lúc dev
    const vite = await createViteServer({
      configFile: path.join(process.cwd(), "vite.config.mjs"),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Ở bản production, serve index.html từ thư mục dist đã được build
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Lắng nghe các yêu cầu kết nối (dùng httpServer để Socket.io hoạt động)
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`🔌 Socket.io đã kích hoạt - Real-time seat booking ready!`);
  });
}

startServer();
