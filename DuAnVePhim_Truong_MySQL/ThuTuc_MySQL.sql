USE WebDatVePhim;
DELIMITER //

-- ==========================================================================================
-- FILE: ThuTuc.sql
-- MÔ TẢ: Danh sách các Stored Procedure quản lý hệ thống rạp chiếu phim
-- TÍNH NĂNG: Có sử dụng TRANSACTION (giao dịch) và TRY...CATCH (xử lý lỗi) để đảm bảo an toàn dữ liệu
-- ==========================================================================================

-- 1. QUẢN LÝ LOẠI PHIM (Movie Types)
-- ==========================================================================================

-- Lấy toàn bộ danh sách loại phim
DROP PROCEDURE IF EXISTS sp_GetAllMovieTypes //
CREATE PROCEDURE sp_GetAllMovieTypes()
BEGIN
    SELECT * FROM LoaiPhim;
END //
-- Thêm mới một loại phim (Có giao dịch)
DROP PROCEDURE IF EXISTS sp_AddMovieType //
CREATE PROCEDURE sp_AddMovieType(IN p_TenLoai VARCHAR(100))
BEGIN
     -- Loại bỏ thông báo số dòng bị ảnh hưởng để tăng hiệu năng
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION; -- Bắt đầu giao dịch
        INSERT INTO LoaiPhim (TenLoai) VALUES (p_TenLoai);
        COMMIT; -- Xác nhận thay đổi nếu thành công;
    
    
END //
-- Cập nhật thông tin loại phim
DROP PROCEDURE IF EXISTS sp_UpdateMovieType //
CREATE PROCEDURE sp_UpdateMovieType(IN p_id INT,
    IN p_TenLoai VARCHAR(100))
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        UPDATE LoaiPhim SET TenLoai = p_TenLoai WHERE MaLoai = p_id;
        COMMIT;
    
    
END //
-- Xóa loại phim
DROP PROCEDURE IF EXISTS sp_DeleteMovieType //
CREATE PROCEDURE sp_DeleteMovieType(IN p_id INT)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        DELETE FROM LoaiPhim WHERE MaLoai = p_id;
        COMMIT;
    
    
END //
-- 2. QUẢN LÝ PHIM (Movies)
-- ==========================================================================================

-- Lấy danh sách phim kèm tên thể loại (Sử dụng LEFT JOIN)
DROP PROCEDURE IF EXISTS sp_GetAllMovies //
CREATE PROCEDURE sp_GetAllMovies()
BEGIN
    SELECT p.*, l.TenLoai FROM Phim p LEFT JOIN LoaiPhim l ON p.MaLoai = l.MaLoai;
END //
-- Thêm mới một bộ phim
DROP PROCEDURE IF EXISTS sp_AddMovie //
CREATE PROCEDURE sp_AddMovie(IN p_TenPhim VARCHAR(200),
    IN p_MoTa TEXT,
    IN p_ThoiLuong INT,
    IN p_NgayKhoiChieu DATE,
    IN p_TrangThai VARCHAR(50),
    IN p_MaLoai INT,
    IN p_HinhAnh TEXT,
    IN p_Trailer TEXT)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        INSERT INTO Phim (TenPhim, MoTa, ThoiLuong, NgayKhoiChieu, TrangThai, MaLoai, HinhAnh, Trailer) 
        VALUES (p_TenPhim, p_MoTa, p_ThoiLuong, p_NgayKhoiChieu, p_TrangThai, p_MaLoai, p_HinhAnh, p_Trailer);
        COMMIT;
    
    
END //
-- Cập nhật thông tin phim
DROP PROCEDURE IF EXISTS sp_UpdateMovie //
CREATE PROCEDURE sp_UpdateMovie(IN p_id INT,
    IN p_TenPhim VARCHAR(200),
    IN p_MoTa TEXT,
    IN p_ThoiLuong INT,
    IN p_NgayKhoiChieu DATE,
    IN p_TrangThai VARCHAR(50),
    IN p_MaLoai INT,
    IN p_HinhAnh TEXT,
    IN p_Trailer TEXT)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        UPDATE Phim SET 
            TenPhim = p_TenPhim, 
            MoTa = p_MoTa, 
            ThoiLuong = p_ThoiLuong, 
            NgayKhoiChieu = p_NgayKhoiChieu, 
            TrangThai = p_TrangThai, 
            MaLoai = p_MaLoai, 
            HinhAnh = p_HinhAnh, 
            Trailer = p_Trailer 
        WHERE MaPhim = p_id;
        COMMIT;
    
    
END //
-- Xóa phim
DROP PROCEDURE IF EXISTS sp_DeleteMovie //
CREATE PROCEDURE sp_DeleteMovie(IN p_id INT)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        DELETE FROM Phim WHERE MaPhim = p_id;
        COMMIT;
    
    
END //
-- 3. QUẢN LÝ PHÒNG CHIẾU (Rooms)
-- ==========================================================================================

-- Lấy danh sách phòng chiếu
DROP PROCEDURE IF EXISTS sp_GetAllRooms //
CREATE PROCEDURE sp_GetAllRooms()
BEGIN
    SELECT * FROM Phong;
END //
-- Thêm phòng mới
DROP PROCEDURE IF EXISTS sp_AddRoom //
CREATE PROCEDURE sp_AddRoom(IN p_TenPhong VARCHAR(100))
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        INSERT INTO Phong (TenPhong) VALUES (p_TenPhong);
        COMMIT;
    
    
END //
-- Cập nhật tên phòng
DROP PROCEDURE IF EXISTS sp_UpdateRoom //
CREATE PROCEDURE sp_UpdateRoom(IN p_id INT,
    IN p_TenPhong VARCHAR(100))
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        UPDATE Phong SET TenPhong = p_TenPhong WHERE MaPhong = p_id;
        COMMIT;
    
    
END //
-- Xóa phòng
DROP PROCEDURE IF EXISTS sp_DeleteRoom //
CREATE PROCEDURE sp_DeleteRoom(IN p_id INT)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        DELETE FROM Phong WHERE MaPhong = p_id;
        COMMIT;
    
    
END //
-- 4. QUẢN LÝ LOẠI GHẾ (Seat Types)
-- ==========================================================================================

-- Lấy danh sách loại ghế (Thường, VIP...)
DROP PROCEDURE IF EXISTS sp_GetAllSeatTypes //
CREATE PROCEDURE sp_GetAllSeatTypes()
BEGIN
    SELECT * FROM LoaiGhe;
END //
-- Thêm loại ghế mới
DROP PROCEDURE IF EXISTS sp_AddSeatType //
CREATE PROCEDURE sp_AddSeatType(IN p_TenLoai VARCHAR(100),
    IN p_GiaGhe DECIMAL(18, 2))
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        INSERT INTO LoaiGhe (TenLoai, GiaGhe) VALUES (p_TenLoai, p_GiaGhe);
        COMMIT;
    
    
END //
-- Cập nhật loại ghế
DROP PROCEDURE IF EXISTS sp_UpdateSeatType //
CREATE PROCEDURE sp_UpdateSeatType(IN p_id INT,
    IN p_TenLoai VARCHAR(100),
    IN p_GiaGhe DECIMAL(18, 2))
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        UPDATE LoaiGhe SET TenLoai = p_TenLoai, GiaGhe = p_GiaGhe WHERE MaLoaiGhe = p_id;
        COMMIT;
    
    
END //
-- Xóa loại ghế
DROP PROCEDURE IF EXISTS sp_DeleteSeatType //
CREATE PROCEDURE sp_DeleteSeatType(IN p_id INT)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        DELETE FROM LoaiGhe WHERE MaLoaiGhe = p_id;
        COMMIT;
    
    
END //
-- 5. QUẢN LÝ GHẾ CHI TIẾT (Seats)
-- ==========================================================================================

-- Lấy danh sách ghế kèm thông tin phòng và loại ghế
DROP PROCEDURE IF EXISTS sp_GetAllSeats //
CREATE PROCEDURE sp_GetAllSeats()
BEGIN
    SELECT g.*, p.TenPhong, l.TenLoai as TenLoaiGhe, l.GiaGhe 
    FROM Ghe g 
    JOIN Phong p ON g.MaPhong = p.MaPhong 
    JOIN LoaiGhe l ON g.MaLoaiGhe = l.MaLoaiGhe;
END //
-- Thêm ghế vào sơ đồ phòng
DROP PROCEDURE IF EXISTS sp_AddSeat //
CREATE PROCEDURE sp_AddSeat(IN p_MaPhong INT,
    IN p_SoGhe VARCHAR(10),
    IN p_MaLoaiGhe INT)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        INSERT INTO Ghe (MaPhong, SoGhe, MaLoaiGhe) VALUES (p_MaPhong, p_SoGhe, p_MaLoaiGhe);
        COMMIT;
    
    
END //
-- Cập nhật thông tin ghế
DROP PROCEDURE IF EXISTS sp_UpdateSeat //
CREATE PROCEDURE sp_UpdateSeat(IN p_id INT,
    IN p_MaPhong INT,
    IN p_SoGhe VARCHAR(10),
    IN p_MaLoaiGhe INT)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        UPDATE Ghe SET MaPhong = p_MaPhong, SoGhe = p_SoGhe, MaLoaiGhe = p_MaLoaiGhe WHERE MaGhe = p_id;
        COMMIT;
    
    
END //
-- Xóa ghế
DROP PROCEDURE IF EXISTS sp_DeleteSeat //
CREATE PROCEDURE sp_DeleteSeat(IN p_id INT)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        DELETE FROM Ghe WHERE MaGhe = p_id;
        COMMIT;
    
    
END //
-- Lấy danh sách các ghế đã được đặt trong một suất chiếu
DROP PROCEDURE IF EXISTS sp_GetBookedSeats //
CREATE PROCEDURE sp_GetBookedSeats(IN p_MaSuat INT)
BEGIN
    SELECT MaGhe FROM ChiTietHoaDon WHERE MaSuat = p_MaSuat;
END //
-- 6. QUẢN LÝ SUẤT CHIẾU (Showtimes)
-- ==========================================================================================

-- Lấy danh sách suất chiếu kèm tên phim và tên phòng
DROP PROCEDURE IF EXISTS sp_GetAllShowtimes //
CREATE PROCEDURE sp_GetAllShowtimes()
BEGIN
    SELECT s.*, p.TenPhim, ph.TenPhong 
    FROM SuatChieu s 
    JOIN Phim p ON s.MaPhim = p.MaPhim 
    JOIN Phong ph ON s.MaPhong = ph.MaPhong;
END //
-- Thêm suất chiếu mới
DROP PROCEDURE IF EXISTS sp_AddShowtime //
CREATE PROCEDURE sp_AddShowtime(IN p_MaPhim INT,
    IN p_MaPhong INT,
    IN p_NgayChieu DATE,
    IN p_GioBatDau TIME,
    IN p_GioKetThuc TIME)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        INSERT INTO SuatChieu (MaPhim, MaPhong, NgayChieu, GioBatDau, GioKetThuc) 
        VALUES (p_MaPhim, p_MaPhong, p_NgayChieu, p_GioBatDau, p_GioKetThuc);
        COMMIT;
    
    
END //
-- Cập nhật thời gian suất chiếu
DROP PROCEDURE IF EXISTS sp_UpdateShowtime //
CREATE PROCEDURE sp_UpdateShowtime(IN p_id INT,
    IN p_MaPhim INT,
    IN p_MaPhong INT,
    IN p_NgayChieu DATE,
    IN p_GioBatDau TIME,
    IN p_GioKetThuc TIME)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        UPDATE SuatChieu SET 
            MaPhim = p_MaPhim, 
            MaPhong = p_MaPhong, 
            NgayChieu = p_NgayChieu, 
            GioBatDau = p_GioBatDau, 
            GioKetThuc = p_GioKetThuc 
        WHERE MaSuat = p_id;
        COMMIT;
    
    
END //
-- Xóa suất chiếu
DROP PROCEDURE IF EXISTS sp_DeleteShowtime //
CREATE PROCEDURE sp_DeleteShowtime(IN p_id INT)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        DELETE FROM SuatChieu WHERE MaSuat = p_id;
        COMMIT;
    
    
END //
-- 7. QUẢN LÝ KHÁCH HÀNG & TÀI KHOẢN (Customers)
-- ==========================================================================================

-- Lấy danh sách các loại người dùng (Admin, Member...)
DROP PROCEDURE IF EXISTS sp_GetAllCustomerTypes //
CREATE PROCEDURE sp_GetAllCustomerTypes()
BEGIN
    SELECT * FROM LoaiUser;
END //
-- Lấy danh sách khách hàng kèm tên loại tài khoản
DROP PROCEDURE IF EXISTS sp_GetAllCustomers //
CREATE PROCEDURE sp_GetAllCustomers()
BEGIN
    SELECT k.*, k.HinhAnh, l.TenLoai as TenLoaiUser 
    FROM KhachHang k 
    JOIN LoaiUser l ON k.MaLoaiUser = l.MaLoaiUser;
END //
-- Đăng ký/Thêm khách hàng mới
DROP PROCEDURE IF EXISTS sp_AddCustomer //
CREATE PROCEDURE sp_AddCustomer(IN p_Ten VARCHAR(200),
    IN p_TenDangNhap VARCHAR(100),
    IN p_MatKhau VARCHAR(100),
    IN p_Email VARCHAR(100),
    IN p_SDT VARCHAR(20),
    IN p_MaLoaiUser INT,
    IN p_HinhAnh TEXT)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        INSERT INTO KhachHang (Ten, TenDangNhap, MatKhau, Email, SDT, MaLoaiUser, HinhAnh) 
        VALUES (p_Ten, p_TenDangNhap, p_MatKhau, p_Email, p_SDT, p_MaLoaiUser, p_HinhAnh);
        COMMIT;
    
    
END //
-- Cập nhật thông tin cá nhân khách hàng
DROP PROCEDURE IF EXISTS sp_UpdateCustomer //
CREATE PROCEDURE sp_UpdateCustomer(IN p_id INT,
    IN p_Ten VARCHAR(200),
    IN p_TenDangNhap VARCHAR(100),
    IN p_MatKhau VARCHAR(100),
    IN p_Email VARCHAR(100),
    IN p_SDT VARCHAR(20),
    IN p_MaLoaiUser INT,
    IN p_HinhAnh TEXT)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        UPDATE KhachHang SET 
            Ten = p_Ten, 
            TenDangNhap = p_TenDangNhap, 
            MatKhau = p_MatKhau, 
            Email = p_Email, 
            SDT = p_SDT, 
            MaLoaiUser = p_MaLoaiUser, 
            HinhAnh = p_HinhAnh 
        WHERE MaKH = p_id;
        COMMIT;
    
    
END //
-- Xóa khách hàng
DROP PROCEDURE IF EXISTS sp_DeleteCustomer //
CREATE PROCEDURE sp_DeleteCustomer(IN p_id INT)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        DELETE FROM KhachHang WHERE MaKH = p_id;
        COMMIT;
    
    
END //
-- =============================================
-- 9. QUẢN LÝ LOẠI SẢN PHẨM (Product Categories)
-- =============================================

-- Lấy danh sách tất cả các Loại SP
DROP PROCEDURE IF EXISTS sp_GetAllLoaiSP //
CREATE PROCEDURE sp_GetAllLoaiSP()
BEGIN
    
    SELECT * FROM LoaiSP;
END //
-- Thêm mới một Loại SP
DROP PROCEDURE IF EXISTS sp_AddLoaiSP //
CREATE PROCEDURE sp_AddLoaiSP(IN p_TenLoaiSP VARCHAR(100))
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        INSERT INTO LoaiSP (TenLoaiSP) VALUES (p_TenLoaiSP);
        COMMIT;
    
    
END //
-- Cập nhật một Loại SP
DROP PROCEDURE IF EXISTS sp_UpdateLoaiSP //
CREATE PROCEDURE sp_UpdateLoaiSP(IN p_id INT,
    IN p_TenLoaiSP VARCHAR(100))
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        UPDATE LoaiSP SET TenLoaiSP = p_TenLoaiSP WHERE MaLoaiSP = p_id;
        COMMIT;
    
    
END //
-- Xóa một Loại SP
DROP PROCEDURE IF EXISTS sp_DeleteLoaiSP //
CREATE PROCEDURE sp_DeleteLoaiSP(IN p_id INT)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        DELETE FROM LoaiSP WHERE MaLoaiSP = p_id;
        COMMIT;
    
    
END //
-- =============================================
-- 10. QUẢN LÝ SẢN PHẨM (Products)
-- =============================================

-- Lấy danh sách tất cả các Sản Phẩm kèm thông tin Loại SP
DROP PROCEDURE IF EXISTS sp_GetAllSanPham //
CREATE PROCEDURE sp_GetAllSanPham()
BEGIN
    
    SELECT sp.*, lsp.TenLoaiSP AS LoaiTen
    FROM SanPham sp
    LEFT JOIN LoaiSP lsp ON sp.MaLoaiSP = lsp.MaLoaiSP;
END //
-- Thêm mới một Sản Phẩm
DROP PROCEDURE IF EXISTS sp_AddSanPham //
CREATE PROCEDURE sp_AddSanPham(IN p_TenSP VARCHAR(200),
    IN p_Gia DECIMAL(18,2),
    IN p_HinhAnh TEXT,
    IN p_MoTa TEXT,
    IN p_MaLoaiSP INT)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        INSERT INTO SanPham (TenSP, Gia, HinhAnh, MoTa, MaLoaiSP)
        VALUES (p_TenSP, p_Gia, p_HinhAnh, p_MoTa, p_MaLoaiSP);
        COMMIT;
    
    
END //
-- Cập nhật một Sản Phẩm
DROP PROCEDURE IF EXISTS sp_UpdateSanPham //
CREATE PROCEDURE sp_UpdateSanPham(IN p_id INT,
    IN p_TenSP VARCHAR(200),
    IN p_Gia DECIMAL(18,2),
    IN p_HinhAnh TEXT,
    IN p_MoTa TEXT,
    IN p_MaLoaiSP INT)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        UPDATE SanPham SET TenSP = p_TenSP, Gia = p_Gia, HinhAnh = p_HinhAnh, MoTa = p_MoTa, MaLoaiSP = p_MaLoaiSP
        WHERE MaSP = p_id;
        COMMIT;
    
    
END //
-- Xóa một Sản Phẩm
DROP PROCEDURE IF EXISTS sp_DeleteSanPham //
CREATE PROCEDURE sp_DeleteSanPham(IN p_id INT)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        DELETE FROM SanPham WHERE MaSP = p_id;
        COMMIT;
    
    
END //
-- Kiểm tra đăng nhập và lấy thông tin người dùng kèm quyền hạn
DROP PROCEDURE IF EXISTS sp_Login //
CREATE PROCEDURE sp_Login(IN p_username VARCHAR(100),
    IN p_password VARCHAR(100))
BEGIN
    
    -- Trả về thông tin khách hàng kèm ảnh đại diện (HinhAnh) và vai trò
    SELECT k.MaKH, k.Ten, k.TenDangNhap, k.Email, k.SDT, k.MaLoaiUser, k.HinhAnh, l.TenLoai as roleName
    FROM KhachHang k
    JOIN LoaiUser l ON k.MaLoaiUser = l.MaLoaiUser
    WHERE (k.TenDangNhap = p_username OR k.Email = p_username OR k.SDT = p_username) 
      AND k.MatKhau = p_password;
END //
-- 8. QUẢN LÝ HÓA ĐƠN & ĐẶT VÉ (Invoices)
-- ==========================================================================================

-- Lấy danh sách toàn bộ hóa đơn kèm tên khách hàng và phim tiêu biểu
-- Lấy danh sách toàn bộ hóa đơn kèm tên khách hàng và tên phương thức thanh toán
DROP PROCEDURE IF EXISTS sp_GetAllInvoices //
CREATE PROCEDURE sp_GetAllInvoices()
BEGIN
    -- Liệt kê rõ cột MaQR để API/QR vé luôn nhận được GUID
    SELECT h.MaHoaDon, h.MaKH, h.NgayDat, h.TongTien, h.PhuongThuc, h.MaQR,
           k.Ten AS TenKhachHang,
           t.TenPhuongThuc AS TenPhuongThuc,
           (SELECT p.TenPhim FROM ChiTietHoaDon d JOIN Phim p ON d.MaPhim = p.MaPhim WHERE d.MaHoaDon = h.MaHoaDon LIMIT 1) AS TenPhim
    FROM HoaDon h 
    JOIN KhachHang k ON h.MaKH = k.MaKH
    LEFT JOIN ThanhToan t ON h.PhuongThuc = t.MaThanhToan;
END //
-- Lấy chi tiết vé trong một hóa đơn (Sử dụng JOIN để lấy thông tin phim, ghế, phòng)
DROP PROCEDURE IF EXISTS sp_GetInvoiceDetails //
CREATE PROCEDURE sp_GetInvoiceDetails(IN p_id INT)
BEGIN
    -- Lấy thông tin vé phim và thông tin sản phẩm (nếu có)
    SELECT d.*, p.TenPhim, g.SoGhe, ph.TenPhong, s.NgayChieu, s.GioBatDau, s.GioKetThuc,
           sp.TenSP, sp.Gia AS GiaNiemYet
    FROM ChiTietHoaDon d
    LEFT JOIN Phim p ON d.MaPhim = p.MaPhim
    LEFT JOIN Ghe g ON d.MaGhe = g.MaGhe
    LEFT JOIN SuatChieu s ON d.MaSuat = s.MaSuat
    LEFT JOIN Phong ph ON s.MaPhong = ph.MaPhong
    LEFT JOIN SanPham sp ON d.MaSP = sp.MaSP
    WHERE d.MaHoaDon = p_id;
END //
-- Xóa hóa đơn (Xóa chi tiết trước sau đó xóa hóa đơn chính - Cascade Delete bằng code)
DROP PROCEDURE IF EXISTS sp_DeleteInvoice //
CREATE PROCEDURE sp_DeleteInvoice(IN p_id INT)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        DELETE FROM ChiTietHoaDon WHERE MaHoaDon = p_id;
        DELETE FROM HoaDon WHERE MaHoaDon = p_id;
        COMMIT;
    
    
END //
-- Cập nhật phần đầu của hóa đơn (Thông tin chung)
-- Cập nhật phần đầu của hóa đơn (Thông tin chung) - Đã đổi p_PhuongThuc sang INT
DROP PROCEDURE IF EXISTS sp_UpdateInvoiceHeader //
CREATE PROCEDURE sp_UpdateInvoiceHeader(IN p_id INT,
    IN p_MaKH INT,
    IN p_NgayDat DATETIME,
    IN p_TongTien DECIMAL(18, 0),
    IN p_PhuongThuc INT -- Đổi từ VARCHAR sang INT để liên kết với bảng ThanhToan)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        UPDATE HoaDon SET MaKH = p_MaKH, NgayDat = p_NgayDat, TongTien = p_TongTien, PhuongThuc = p_PhuongThuc WHERE MaHoaDon = p_id;
        COMMIT;
    
    
END //
-- Xóa chi tiết vé cũ của một hóa đơn (Dùng trước khi cập nhật lại danh sách ghế mới)
DROP PROCEDURE IF EXISTS sp_DeleteInvoiceDetails //
CREATE PROCEDURE sp_DeleteInvoiceDetails(IN p_id INT)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        DELETE FROM ChiTietHoaDon WHERE MaHoaDon = p_id;
        COMMIT;
    
    
END //
-- Thêm một chi tiết vé mới vào hóa đơn (đã bỏ cột MaGiaoDich)
-- -----------------------------------------------------------------------------------------
-- THỦ TỤC: THÊM CHI TIẾT HÓA ĐƠN (Gộp Vé và Sản Phẩm)
-- MÔ TẢ: Chèn một dòng vào bảng ChiTietHoaDon. Có thể chứa cả thông tin ghế và sản phẩm đi kèm.
-- -----------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_AddInvoiceDetail //
CREATE PROCEDURE sp_AddInvoiceDetail(
    IN p_MaHoaDon INT,   -- ID hóa đơn vừa tạo
    IN p_MaPhim INT,     -- ID phim (có thể NULL nếu chỉ mua SP)
    IN p_MaSuat INT,     -- ID suất chiếu
    IN p_MaGhe INT,      -- ID ghế ngồi
    IN p_MaSP INT,       -- ID sản phẩm bắp nước (có thể NULL nếu chỉ mua vé)
    IN p_SoLuongSP INT,  -- Số lượng bắp nước
    IN p_GiaVe DECIMAL(18, 0) -- Giá của vé xem phim (hoặc giá của dòng này)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        -- Chèn dữ liệu vào bảng ChiTietHoaDon duy nhất
        INSERT INTO ChiTietHoaDon (MaHoaDon, MaPhim, MaSuat, MaGhe, MaSP, SoLuongSP, GiaVe) 
        VALUES (p_MaHoaDon, p_MaPhim, p_MaSuat, p_MaGhe, p_MaSP, p_SoLuongSP, p_GiaVe);
    COMMIT;
END //

-- -----------------------------------------------------------------------------------------
-- THỦ TỤC: TẠO ĐẦU HÓA ĐƠN
-- MÔ TẢ: Tạo thông tin chung cho hóa đơn, trả về ID tự tăng và mã QR định danh duy nhất (UUID)
-- -----------------------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_CreateInvoiceHeader //
CREATE PROCEDURE sp_CreateInvoiceHeader(
    IN p_MaKH INT, 
    IN p_NgayDat DATETIME, 
    IN p_TongTien DECIMAL(18,0), 
    IN p_PhuongThuc INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
    -- Chèn vào bảng HoaDon chính
    INSERT INTO HoaDon (MaKH, NgayDat, TongTien, PhuongThuc) 
    VALUES (p_MaKH, p_NgayDat, p_TongTien, p_PhuongThuc);
    
    -- Trả về MaHoaDon vừa tạo (cho Node.js) và tự sinh mã QR bằng hàm UUID() của MySQL
    SELECT LAST_INSERT_ID() AS MaHoaDon, UUID() AS MaQR;
    COMMIT;
END //
-- 9. QUẢN LÝ PHƯƠNG THỨC THANH TOÁN (Payments)
-- ==========================================================================================

-- Lấy danh sách các phương thức thanh toán hỗ trợ
DROP PROCEDURE IF EXISTS sp_GetAllPayments //
CREATE PROCEDURE sp_GetAllPayments()
BEGIN
    SELECT * FROM ThanhToan;
END //
-- Thêm phương thức thanh toán mới
DROP PROCEDURE IF EXISTS sp_AddPayment //
CREATE PROCEDURE sp_AddPayment(IN p_TenPhuongThuc VARCHAR(100),
    IN p_HinhAnh TEXT)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        INSERT INTO ThanhToan (TenPhuongThuc, HinhAnh) VALUES (p_TenPhuongThuc, p_HinhAnh);
        COMMIT;
    
    
END //
-- Cập nhật phương thức thanh toán
DROP PROCEDURE IF EXISTS sp_UpdatePayment //
CREATE PROCEDURE sp_UpdatePayment(IN p_id INT,
    IN p_TenPhuongThuc VARCHAR(100),
    IN p_HinhAnh TEXT)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        UPDATE ThanhToan SET TenPhuongThuc = p_TenPhuongThuc, HinhAnh = p_HinhAnh WHERE MaThanhToan = p_id;
        COMMIT;
    
    
END //
-- Xóa phương thức thanh toán
DROP PROCEDURE IF EXISTS sp_DeletePayment //
CREATE PROCEDURE sp_DeletePayment(IN p_id INT)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        DELETE FROM ThanhToan WHERE MaThanhToan = p_id;
        COMMIT;
    
    
END //
-- ==========================================================================
-- 10. QUẢN LÝ BANNER (Banner Management procedures)
-- ==========================================================================

-- Lấy danh sách toàn bộ banner kèm tên phim (nếu có liên kết)
DROP PROCEDURE IF EXISTS sp_GetAllBanners //
CREATE PROCEDURE sp_GetAllBanners()
BEGIN
    
    -- Thực hiện kết hợp bảng Banner với bảng Phim để lấy đầy đủ chi tiết tên phim liên kết
    SELECT b.MaBanner, b.TenBanner, b.LinkBanner, b.MaPhim, p.TenPhim
    FROM Banner b
    LEFT JOIN Phim p ON b.MaPhim = p.MaPhim;
END //
-- Thêm mới một banner quảng cáo
DROP PROCEDURE IF EXISTS sp_AddBanner //
CREATE PROCEDURE sp_AddBanner(IN p_TenBanner VARCHAR(50),
    IN p_LinkBanner TEXT,
    IN p_MaPhim INT)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        -- Thêm dòng dữ liệu mới vào bảng Banner
        INSERT INTO Banner (TenBanner, LinkBanner, MaPhim)
        VALUES (p_TenBanner, p_LinkBanner, p_MaPhim);
        COMMIT;
    
    
END //
-- Cập nhật thông tin chi tiết một banner
DROP PROCEDURE IF EXISTS sp_UpdateBanner //
CREATE PROCEDURE sp_UpdateBanner(IN p_id INT,
    IN p_TenBanner VARCHAR(50),
    IN p_LinkBanner TEXT,
    IN p_MaPhim INT)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        -- Thực hiện cập nhật dữ liệu của dòng Banner tương ứng với Mã Banner
        UPDATE Banner
        SET TenBanner = p_TenBanner, LinkBanner = p_LinkBanner, MaPhim = p_MaPhim
        WHERE MaBanner = p_id;
        COMMIT;
    
    
END //
-- Xóa một banner quảng cáo
DROP PROCEDURE IF EXISTS sp_DeleteBanner //
CREATE PROCEDURE sp_DeleteBanner(IN p_id INT)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        -- Thực hiện câu lệnh xóa banner dựa trên khóa chính
        DELETE FROM Banner
        WHERE MaBanner = p_id;
        COMMIT;
    
    
END //
-- ==========================================================================================
-- 11. QUẢN LÝ BÌNH LUẬN PHIM (BinhLuan)
-- ==========================================================================================

-- Lấy danh sách bình luận theo mã phim (chỉ hiển thị trạng thái "Hiện")
DROP PROCEDURE IF EXISTS sp_GetCommentsByMovie //
CREATE PROCEDURE sp_GetCommentsByMovie(IN p_MaPhim INT)
BEGIN
    
    SELECT bl.MaBL, bl.MaPhim, bl.MaKH, bl.NoiDung, bl.SoSao, bl.NgayBL, bl.TrangThai,
           kh.Ten AS TenKH, kh.HinhAnh
    FROM BinhLuan bl
    INNER JOIN KhachHang kh ON bl.MaKH = kh.MaKH
    WHERE bl.MaPhim = p_MaPhim AND bl.TrangThai = N'Hiện'
      AND TRIM(IFNULL(bl.NoiDung, '')) <> ''
      AND bl.SoSao >= 1
    ORDER BY bl.NgayBL DESC;
END //
-- Thêm bình luận mới (yêu cầu khách hàng đã đăng nhập - MaKH hợp lệ)
DROP PROCEDURE IF EXISTS sp_AddComment //
CREATE PROCEDURE sp_AddComment(IN p_MaPhim INT,
    IN p_MaKH INT,
    IN p_NoiDung VARCHAR(1000),
    IN p_SoSao INT)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        INSERT INTO BinhLuan (MaPhim, MaKH, NoiDung, SoSao)
        VALUES (p_MaPhim, p_MaKH, p_NoiDung, p_SoSao);
        SELECT LAST_INSERT_ID() AS MaBL;
        COMMIT;
    
    
END //
-- Cập nhật ảnh đại diện khách hàng (dùng cho trang Profile)
DROP PROCEDURE IF EXISTS sp_UpdateCustomerAvatar //
CREATE PROCEDURE sp_UpdateCustomerAvatar(IN p_id INT,
    IN p_HinhAnh TEXT)
BEGIN
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
        UPDATE KhachHang SET HinhAnh = p_HinhAnh WHERE MaKH = p_id;
        COMMIT;
    
    
END //

DELIMITER ;
