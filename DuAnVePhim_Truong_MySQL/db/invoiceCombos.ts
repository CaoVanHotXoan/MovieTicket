import type { Pool } from "mysql2/promise";

let schemaReady = false;

/** Tạo bảng ChiTietHoaDonSP nếu chưa có (lưu bắp nước / combo theo hóa đơn) */
export async function ensureInvoiceComboSchema(pool: Pool): Promise<void> {
  if (schemaReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ChiTietHoaDonSP (
      MaCTSP INT NOT NULL AUTO_INCREMENT,
      MaHoaDon INT NOT NULL,
      MaSP INT NOT NULL,
      SoLuong INT NOT NULL DEFAULT 1,
      DonGia DECIMAL(18,0) NOT NULL,
      PRIMARY KEY (MaCTSP),
      KEY IX_ChiTietHoaDonSP_MaHoaDon (MaHoaDon),
      CONSTRAINT FK_CTHDSP_HoaDon FOREIGN KEY (MaHoaDon) REFERENCES HoaDon (MaHoaDon) ON DELETE CASCADE,
      CONSTRAINT FK_CTHDSP_SanPham FOREIGN KEY (MaSP) REFERENCES SanPham (MaSP)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  schemaReady = true;
}

export type InvoiceComboInput = {
  MaSP?: number;
  id?: number;
  SoLuong?: number;
  qty?: number;
  DonGia?: number;
  price?: number;
};

export function normalizeComboInputs(
  raw: unknown
): { MaSP: number; SoLuong: number; DonGia: number }[] {
  if (!Array.isArray(raw)) return [];
  const out: { MaSP: number; SoLuong: number; DonGia: number }[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as InvoiceComboInput;
    const MaSP = Number(row.MaSP ?? row.id);
    const SoLuong = Number(row.SoLuong ?? row.qty) || 0;
    const DonGia = Number(row.DonGia ?? row.price) || 0;
    if (!Number.isFinite(MaSP) || SoLuong <= 0) continue;
    out.push({ MaSP, SoLuong, DonGia });
  }
  return out;
}

export async function insertInvoiceCombos(
  pool: Pool,
  maHoaDon: number,
  combos: { MaSP: number; SoLuong: number; DonGia: number }[]
): Promise<void> {
  if (combos.length === 0) return;
  await ensureInvoiceComboSchema(pool);
  for (const c of combos) {
    await pool.query(
      "INSERT INTO ChiTietHoaDonSP (MaHoaDon, MaSP, SoLuong, DonGia) VALUES (?, ?, ?, ?)",
      [maHoaDon, c.MaSP, c.SoLuong, c.DonGia]
    );
  }
}

export async function fetchInvoiceCombos(
  pool: Pool,
  maHoaDon: number
): Promise<Record<string, unknown>[]> {
  await ensureInvoiceComboSchema(pool);
  const [rows] = await pool.query(
    `SELECT c.MaCTSP, c.MaHoaDon, c.MaSP, c.SoLuong, c.DonGia,
            sp.TenSP, sp.HinhAnh
     FROM ChiTietHoaDonSP c
     INNER JOIN SanPham sp ON c.MaSP = sp.MaSP
     WHERE c.MaHoaDon = ?
     ORDER BY c.MaCTSP`,
    [maHoaDon]
  );
  return rows as Record<string, unknown>[];
}
