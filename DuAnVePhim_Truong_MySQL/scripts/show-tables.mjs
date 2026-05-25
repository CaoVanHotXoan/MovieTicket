import { pool } from "../db/mysql.ts";

const [tables] = await pool.query("SHOW TABLES");
console.log(tables);
await pool.end();
