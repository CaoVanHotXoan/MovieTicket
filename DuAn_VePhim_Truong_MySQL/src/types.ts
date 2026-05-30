export interface MovieType {
  MaLoai: number;
  TenLoai: string;
}

export interface Movie {
  MaPhim: number;
  TenPhim: string;
  MoTa: string;
  ThoiLuong: number;
  NgayKhoiChieu: string;
  MaLoai: number;
  TenLoai?: string;
  HinhAnh: string;
  Trailer: string;
}

export interface Room {
  MaPhong: number;
  TenPhong: string;
}

export interface SeatType {
  MaLoaiGhe: number;
  TenLoai: string;
  HeSoGia: number;
}

export interface Seat {
  MaGhe: number;
  MaPhong: number;
  TenPhong?: string;
  SoGhe: string;
  MaLoaiGhe: number;
  TenLoaiGhe?: string;
}

export interface Showtime {
  MaSuat: number;
  MaPhim: number;
  TenPhim?: string;
  MaPhong: number;
  TenPhong?: string;
  NgayChieu: string;
  GioBatDau: string;
  GioKetThuc: string;
}

export interface CustomerType {
  MaLoaiUser: number;
  TenLoai: string;
}

export interface Customer {
  MaKH: number;
  Ten: string;
  TenDangNhap: string;
  MatKhau: string;
  Email: string;
  SDT: string;
  MaLoaiUser: number;
  TenLoaiUser?: string;
}

export interface Invoice {
  MaHoaDon: number;
  MaKH: number;
  TenKhachHang?: string;
  NgayDat: string;
  TongTien: number;
}

export interface InvoiceDetail {
  MaCT: number;
  MaHoaDon: number;
  MaSuat: number;
  TenPhim?: string;
  MaGhe: number;
  SoGhe?: string;
  GiaVe: number;
}

export interface Payment {
  MaThanhToan: number;
  MaHoaDon: number;
  PhuongThuc: string;
  SoTien: number;
  TrangThai: string;
  MaGiaoDich: string;
  ThoiGian: string;
}
