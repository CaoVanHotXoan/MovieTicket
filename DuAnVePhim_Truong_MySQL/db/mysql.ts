import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.DB_PORT || "3306");

/** Pool kết nối MySQL — đọc cấu hình từ file .env */
export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number.isFinite(port) ? port : 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
  dateStrings: true,
  connectTimeout: 10_000,
});

/** Kiểm tra kết nối tới MariaDB/MySQL (dùng khi khởi động server) */
export async function testConnection(): Promise<boolean> {
  let connection: mysql.PoolConnection | undefined;
  try {
    connection = await pool.getConnection();
    await connection.ping();
    console.log(
      `Đã kết nối MySQL: ${process.env.DB_USER}@${process.env.DB_HOST}:${port}/${process.env.DB_NAME}`
    );
    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("Không thể kết nối MySQL:", message);
    return false;
  } finally {
    connection?.release();
  }
}
