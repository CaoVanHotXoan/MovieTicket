-- ==========================================================================================
-- FILE: ThuTuc.sql
-- MÔ TẢ: Danh sách các Stored Procedure quản lý hệ thống rạp chiếu phim
-- TÍNH NĂNG: Có sử dụng TRANSACTION (giao dịch) và TRY...CATCH (xử lý lỗi) để đảm bảo an toàn dữ liệu
-- ==========================================================================================

-- 1. QUẢN LÝ LOẠI PHIM (Movie Types)
-- ==========================================================================================

-- Lấy toàn bộ danh sách loại phim
CREATE PROCEDURE sp_GetAllMovieTypes
AS
BEGIN
    SELECT * FROM LoaiPhim
END
GO

-- Thêm mới một loại phim (Có giao dịch)
CREATE PROCEDURE sp_AddMovieType
    @TenLoai NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON; -- Loại bỏ thông báo số dòng bị ảnh hưởng để tăng hiệu năng
    BEGIN TRY
        BEGIN TRANSACTION -- Bắt đầu giao dịch
        INSERT INTO LoaiPhim (TenLoai) VALUES (@TenLoai)
        COMMIT TRANSACTION -- Xác nhận thay đổi nếu thành công
    END TRY
    BEGIN CATCH
        -- Nếu có lỗi, kiểm tra nếu có giao dịch đang mở thì hoàn tác (Rollback)
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        -- Lấy thông báo lỗi và gửi lại cho ứng dụng
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- Cập nhật thông tin loại phim
CREATE PROCEDURE sp_UpdateMovieType
    @id INT,
    @TenLoai NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        UPDATE LoaiPhim SET TenLoai = @TenLoai WHERE MaLoai = @id
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- Xóa loại phim
CREATE PROCEDURE sp_DeleteMovieType
    @id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        DELETE FROM LoaiPhim WHERE MaLoai = @id
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- 2. QUẢN LÝ PHIM (Movies)
-- ==========================================================================================

-- Lấy danh sách phim kèm tên thể loại (Sử dụng LEFT JOIN)
CREATE PROCEDURE sp_GetAllMovies
AS
BEGIN
    SELECT p.*, l.TenLoai FROM Phim p LEFT JOIN LoaiPhim l ON p.MaLoai = l.MaLoai
END
GO

-- Thêm mới một bộ phim
CREATE PROCEDURE sp_AddMovie
    @TenPhim NVARCHAR(200),
    @MoTa NVARCHAR(MAX),
    @ThoiLuong INT,
    @NgayKhoiChieu DATE,
    @TrangThai NVARCHAR(50),
    @MaLoai INT,
    @HinhAnh VARCHAR(MAX),
    @Trailer VARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        INSERT INTO Phim (TenPhim, MoTa, ThoiLuong, NgayKhoiChieu, TrangThai, MaLoai, HinhAnh, Trailer) 
        VALUES (@TenPhim, @MoTa, @ThoiLuong, @NgayKhoiChieu, @TrangThai, @MaLoai, @HinhAnh, @Trailer)
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- Cập nhật thông tin phim
CREATE PROCEDURE sp_UpdateMovie
    @id INT,
    @TenPhim NVARCHAR(200),
    @MoTa NVARCHAR(MAX),
    @ThoiLuong INT,
    @NgayKhoiChieu DATE,
    @TrangThai NVARCHAR(50),
    @MaLoai INT,
    @HinhAnh VARCHAR(MAX),
    @Trailer VARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        UPDATE Phim SET 
            TenPhim = @TenPhim, 
            MoTa = @MoTa, 
            ThoiLuong = @ThoiLuong, 
            NgayKhoiChieu = @NgayKhoiChieu, 
            TrangThai = @TrangThai, 
            MaLoai = @MaLoai, 
            HinhAnh = @HinhAnh, 
            Trailer = @Trailer 
        WHERE MaPhim = @id
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- Xóa phim
CREATE PROCEDURE sp_DeleteMovie
    @id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        DELETE FROM Phim WHERE MaPhim = @id
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- 3. QUẢN LÝ PHÒNG CHIẾU (Rooms)
-- ==========================================================================================

-- Lấy danh sách phòng chiếu
CREATE PROCEDURE sp_GetAllRooms
AS
BEGIN
    SELECT * FROM Phong
END
GO

-- Thêm phòng mới
CREATE PROCEDURE sp_AddRoom
    @TenPhong NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        INSERT INTO Phong (TenPhong) VALUES (@TenPhong)
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- Cập nhật tên phòng
CREATE PROCEDURE sp_UpdateRoom
    @id INT,
    @TenPhong NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        UPDATE Phong SET TenPhong = @TenPhong WHERE MaPhong = @id
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- Xóa phòng
CREATE PROCEDURE sp_DeleteRoom
    @id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        DELETE FROM Phong WHERE MaPhong = @id
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- 4. QUẢN LÝ LOẠI GHẾ (Seat Types)
-- ==========================================================================================

-- Lấy danh sách loại ghế (Thường, VIP...)
CREATE PROCEDURE sp_GetAllSeatTypes
AS
BEGIN
    SELECT * FROM LoaiGhe
END
GO

-- Thêm loại ghế mới
CREATE PROCEDURE sp_AddSeatType
    @TenLoai NVARCHAR(100),
    @GiaGhe DECIMAL(18, 2)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        INSERT INTO LoaiGhe (TenLoai, GiaGhe) VALUES (@TenLoai, @GiaGhe)
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- Cập nhật loại ghế
CREATE PROCEDURE sp_UpdateSeatType
    @id INT,
    @TenLoai NVARCHAR(100),
    @GiaGhe DECIMAL(18, 2)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        UPDATE LoaiGhe SET TenLoai = @TenLoai, GiaGhe = @GiaGhe WHERE MaLoaiGhe = @id
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- Xóa loại ghế
CREATE PROCEDURE sp_DeleteSeatType
    @id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        DELETE FROM LoaiGhe WHERE MaLoaiGhe = @id
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- 5. QUẢN LÝ GHẾ CHI TIẾT (Seats)
-- ==========================================================================================

-- Lấy danh sách ghế kèm thông tin phòng và loại ghế
CREATE PROCEDURE sp_GetAllSeats
AS
BEGIN
    SELECT g.*, p.TenPhong, l.TenLoai as TenLoaiGhe, l.GiaGhe 
    FROM Ghe g 
    JOIN Phong p ON g.MaPhong = p.MaPhong 
    JOIN LoaiGhe l ON g.MaLoaiGhe = l.MaLoaiGhe
END
GO

-- Thêm ghế vào sơ đồ phòng
CREATE PROCEDURE sp_AddSeat
    @MaPhong INT,
    @SoGhe NVARCHAR(10),
    @MaLoaiGhe INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        INSERT INTO Ghe (MaPhong, SoGhe, MaLoaiGhe) VALUES (@MaPhong, @SoGhe, @MaLoaiGhe)
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- Cập nhật thông tin ghế
CREATE PROCEDURE sp_UpdateSeat
    @id INT,
    @MaPhong INT,
    @SoGhe NVARCHAR(10),
    @MaLoaiGhe INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        UPDATE Ghe SET MaPhong = @MaPhong, SoGhe = @SoGhe, MaLoaiGhe = @MaLoaiGhe WHERE MaGhe = @id
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- Xóa ghế
CREATE PROCEDURE sp_DeleteSeat
    @id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        DELETE FROM Ghe WHERE MaGhe = @id
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- Lấy danh sách các ghế đã được đặt trong một suất chiếu
CREATE PROCEDURE sp_GetBookedSeats
    @MaSuat INT
AS
BEGIN
    SELECT MaGhe FROM ChiTietHoaDon WHERE MaSuat = @MaSuat
END
GO

-- 6. QUẢN LÝ SUẤT CHIẾU (Showtimes)
-- ==========================================================================================

-- Lấy danh sách suất chiếu kèm tên phim và tên phòng
CREATE PROCEDURE sp_GetAllShowtimes
AS
BEGIN
    SELECT s.*, p.TenPhim, ph.TenPhong 
    FROM SuatChieu s 
    JOIN Phim p ON s.MaPhim = p.MaPhim 
    JOIN Phong ph ON s.MaPhong = ph.MaPhong
END
GO

-- Thêm suất chiếu mới
CREATE PROCEDURE sp_AddShowtime
    @MaPhim INT,
    @MaPhong INT,
    @NgayChieu DATE,
    @GioBatDau TIME,
    @GioKetThuc TIME
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        INSERT INTO SuatChieu (MaPhim, MaPhong, NgayChieu, GioBatDau, GioKetThuc) 
        VALUES (@MaPhim, @MaPhong, @NgayChieu, @GioBatDau, @GioKetThuc)
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- Cập nhật thời gian suất chiếu
CREATE PROCEDURE sp_UpdateShowtime
    @id INT,
    @MaPhim INT,
    @MaPhong INT,
    @NgayChieu DATE,
    @GioBatDau TIME,
    @GioKetThuc TIME
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        UPDATE SuatChieu SET 
            MaPhim = @MaPhim, 
            MaPhong = @MaPhong, 
            NgayChieu = @NgayChieu, 
            GioBatDau = @GioBatDau, 
            GioKetThuc = @GioKetThuc 
        WHERE MaSuat = @id
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- Xóa suất chiếu
CREATE PROCEDURE sp_DeleteShowtime
    @id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        DELETE FROM SuatChieu WHERE MaSuat = @id
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- 7. QUẢN LÝ KHÁCH HÀNG & TÀI KHOẢN (Customers)
-- ==========================================================================================

-- Lấy danh sách các loại người dùng (Admin, Member...)
CREATE PROCEDURE sp_GetAllCustomerTypes
AS
BEGIN
    SELECT * FROM LoaiUser
END
GO

-- Lấy danh sách khách hàng kèm tên loại tài khoản
CREATE PROCEDURE sp_GetAllCustomers
AS
BEGIN
    SELECT k.*, l.TenLoai as TenLoaiUser 
    FROM KhachHang k 
    JOIN LoaiUser l ON k.MaLoaiUser = l.MaLoaiUser
END
GO

-- Đăng ký/Thêm khách hàng mới
CREATE PROCEDURE sp_AddCustomer
    @Ten NVARCHAR(200),
    @TenDangNhap VARCHAR(100),
    @MatKhau VARCHAR(100),
    @Email VARCHAR(100),
    @SDT VARCHAR(20),
    @MaLoaiUser INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        INSERT INTO KhachHang (Ten, TenDangNhap, MatKhau, Email, SDT, MaLoaiUser) 
        VALUES (@Ten, @TenDangNhap, @MatKhau, @Email, @SDT, @MaLoaiUser)
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- Cập nhật thông tin cá nhân khách hàng
CREATE PROCEDURE sp_UpdateCustomer
    @id INT,
    @Ten NVARCHAR(200),
    @TenDangNhap VARCHAR(100),
    @MatKhau VARCHAR(100),
    @Email VARCHAR(100),
    @SDT VARCHAR(20),
    @MaLoaiUser INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        UPDATE KhachHang SET 
            Ten = @Ten, 
            TenDangNhap = @TenDangNhap, 
            MatKhau = @MatKhau, 
            Email = @Email, 
            SDT = @SDT, 
            MaLoaiUser = @MaLoaiUser 
        WHERE MaKH = @id
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- Xóa khách hàng
CREATE PROCEDURE sp_DeleteCustomer
    @id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        DELETE FROM KhachHang WHERE MaKH = @id
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- Kiểm tra đăng nhập và lấy thông tin người dùng kèm quyền hạn
CREATE PROCEDURE sp_Login
    @username VARCHAR(100),
    @password VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT k.MaKH, k.Ten, k.TenDangNhap, k.Email, k.SDT, k.MaLoaiUser, l.TenLoai as roleName
    FROM KhachHang k
    JOIN LoaiUser l ON k.MaLoaiUser = l.MaLoaiUser
    WHERE (k.TenDangNhap = @username OR k.Email = @username OR k.SDT = @username) 
      AND k.MatKhau = @password
END
GO

-- 8. QUẢN LÝ HÓA ĐƠN & ĐẶT VÉ (Invoices)
-- ==========================================================================================

-- Lấy danh sách toàn bộ hóa đơn kèm tên khách hàng và phim tiêu biểu
-- Lấy danh sách toàn bộ hóa đơn kèm tên khách hàng và tên phương thức thanh toán
CREATE PROCEDURE sp_GetAllInvoices
AS
BEGIN
    SELECT h.*, k.Ten as TenKhachHang, t.TenPhuongThuc as PhuongThuc, -- Lấy tên phương thức từ bảng ThanhToan
           (SELECT TOP 1 p.TenPhim FROM ChiTietHoaDon d JOIN Phim p ON d.MaPhim = p.MaPhim WHERE d.MaHoaDon = h.MaHoaDon) as TenPhim
    FROM HoaDon h 
    JOIN KhachHang k ON h.MaKH = k.MaKH
    LEFT JOIN ThanhToan t ON h.PhuongThuc = t.MaThanhToan -- Join để lấy tên thay vì chỉ ID
END
GO

-- Lấy chi tiết vé trong một hóa đơn (Sử dụng JOIN để lấy thông tin phim, ghế, phòng)
CREATE PROCEDURE sp_GetInvoiceDetails
    @id INT
AS
BEGIN
    SELECT d.*, p.TenPhim, g.SoGhe, ph.TenPhong, s.NgayChieu, s.GioBatDau, s.GioKetThuc
    FROM ChiTietHoaDon d
    JOIN Phim p ON d.MaPhim = p.MaPhim
    JOIN Ghe g ON d.MaGhe = g.MaGhe
    JOIN SuatChieu s ON d.MaSuat = s.MaSuat
    JOIN Phong ph ON s.MaPhong = ph.MaPhong
    WHERE d.MaHoaDon = @id
END
GO

-- Xóa hóa đơn (Xóa chi tiết trước sau đó xóa hóa đơn chính - Cascade Delete bằng code)
CREATE PROCEDURE sp_DeleteInvoice
    @id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        DELETE FROM ChiTietHoaDon WHERE MaHoaDon = @id
        DELETE FROM HoaDon WHERE MaHoaDon = @id
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- Cập nhật phần đầu của hóa đơn (Thông tin chung)
-- Cập nhật phần đầu của hóa đơn (Thông tin chung) - Đã đổi @PhuongThuc sang INT
CREATE PROCEDURE sp_UpdateInvoiceHeader
    @id INT,
    @MaKH INT,
    @NgayDat DATETIME,
    @TongTien DECIMAL(18, 0),
    @PhuongThuc INT -- Đổi từ NVARCHAR sang INT để liên kết với bảng ThanhToan
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        UPDATE HoaDon SET MaKH = @MaKH, NgayDat = @NgayDat, TongTien = @TongTien, PhuongThuc = @PhuongThuc WHERE MaHoaDon = @id
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- Xóa chi tiết vé cũ của một hóa đơn (Dùng trước khi cập nhật lại danh sách ghế mới)
CREATE PROCEDURE sp_DeleteInvoiceDetails
    @id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        DELETE FROM ChiTietHoaDon WHERE MaHoaDon = @id
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- Thêm một chi tiết vé mới vào hóa đơn
CREATE PROCEDURE sp_AddInvoiceDetail
    @MaHoaDon INT,
    @MaPhim INT,
    @MaSuat INT,
    @MaGhe INT,
    @GiaVe DECIMAL(18, 0),
    @MaGiaoDich NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        INSERT INTO ChiTietHoaDon (MaHoaDon, MaPhim, MaSuat, MaGhe, GiaVe, MaGiaoDich) 
        VALUES (@MaHoaDon, @MaPhim, @MaSuat, @MaGhe, @GiaVe, @MaGiaoDich)
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- Tạo mới một hóa đơn và trả về ID vừa sinh (OUTPUT) cho ứng dụng
-- Tạo mới một hóa đơn và trả về ID vừa sinh (OUTPUT) - Đã đổi @PhuongThuc sang INT
CREATE PROCEDURE sp_CreateInvoiceHeader
    @MaKH INT,
    @NgayDat DATETIME,
    @TongTien DECIMAL(18, 0),
    @PhuongThuc INT -- Đổi từ NVARCHAR sang INT để lưu MaThanhToan
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        INSERT INTO HoaDon (MaKH, NgayDat, TongTien, PhuongThuc) 
        OUTPUT INSERTED.MaHoaDon -- Trả về MaHoaDon vừa được sinh tự động
        VALUES (@MaKH, @NgayDat, @TongTien, @PhuongThuc)
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- 9. QUẢN LÝ PHƯƠNG THỨC THANH TOÁN (Payments)
-- ==========================================================================================

-- Lấy danh sách các phương thức thanh toán hỗ trợ
CREATE PROCEDURE sp_GetAllPayments
AS
BEGIN
    SELECT * FROM ThanhToan
END
GO

-- Thêm phương thức thanh toán mới
CREATE PROCEDURE sp_AddPayment
    @TenPhuongThuc NVARCHAR(100),
    @HinhAnh NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        INSERT INTO ThanhToan (TenPhuongThuc, HinhAnh) VALUES (@TenPhuongThuc, @HinhAnh)
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- Cập nhật phương thức thanh toán
CREATE PROCEDURE sp_UpdatePayment
    @id INT,
    @TenPhuongThuc NVARCHAR(100),
    @HinhAnh NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        UPDATE ThanhToan SET TenPhuongThuc = @TenPhuongThuc, HinhAnh = @HinhAnh WHERE MaThanhToan = @id
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- Xóa phương thức thanh toán
CREATE PROCEDURE sp_DeletePayment
    @id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION
        DELETE FROM ThanhToan WHERE MaThanhToan = @id
        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- ==========================================================================
-- 10. QUẢN LÝ BANNER (Banner Management procedures)
-- ==========================================================================

-- Lấy danh sách toàn bộ banner kèm tên phim (nếu có liên kết)
CREATE PROCEDURE sp_GetAllBanners
AS
BEGIN
    SET NOCOUNT ON;
    -- Thực hiện kết hợp bảng Banner với bảng Phim để lấy đầy đủ chi tiết tên phim liên kết
    SELECT b.MaBanner, b.TenBanner, b.LinkBanner, b.MaPhim, p.TenPhim
    FROM Banner b
    LEFT JOIN Phim p ON b.MaPhim = p.MaPhim;
END
GO

-- Thêm mới một banner quảng cáo
CREATE PROCEDURE sp_AddBanner
    @TenBanner NVARCHAR(50),
    @LinkBanner NVARCHAR(MAX),
    @MaPhim INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        -- Thêm dòng dữ liệu mới vào bảng Banner
        INSERT INTO Banner (TenBanner, LinkBanner, MaPhim)
        VALUES (@TenBanner, @LinkBanner, @MaPhim);
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        -- Trả lại trạng thái nếu có lỗi xảy ra trong quá trình thêm mới
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- Cập nhật thông tin chi tiết một banner
CREATE PROCEDURE sp_UpdateBanner
    @id INT,
    @TenBanner NVARCHAR(50),
    @LinkBanner NVARCHAR(MAX),
    @MaPhim INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        -- Thực hiện cập nhật dữ liệu của dòng Banner tương ứng với Mã Banner
        UPDATE Banner
        SET TenBanner = @TenBanner, LinkBanner = @LinkBanner, MaPhim = @MaPhim
        WHERE MaBanner = @id;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        -- Hủy bỏ giao dịch nếu xuất hiện lỗi
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

-- Xóa một banner quảng cáo
CREATE PROCEDURE sp_DeleteBanner
    @id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        -- Thực hiện câu lệnh xóa banner dựa trên khóa chính
        DELETE FROM Banner
        WHERE MaBanner = @id;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        -- Phục hồi lại dữ liệu nếu có sự cố xảy ra
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @err NVARCHAR(MAX) = ERROR_MESSAGE();
        RAISERROR(@err, 16, 1);
    END CATCH
END
GO

