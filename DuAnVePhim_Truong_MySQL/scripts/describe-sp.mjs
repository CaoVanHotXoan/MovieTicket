import { pool } from "../db/mysql.ts";

const [loai] = await pool.query("DESCRIBE LoaiSP");
const [sp] = await pool.query("DESCRIBE SanPham");
console.log("LoaiSP:", loai);
console.log("SanPham:", sp);
await pool.end();
