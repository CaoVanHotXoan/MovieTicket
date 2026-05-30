import type { Pool, PoolConnection } from "mysql2/promise";

/** Giữ API giống mssql cũ — tham số kiểu bị bỏ qua, chỉ dùng giá trị khi CALL procedure */
export const Int = "INT";
export const VarChar = "VARCHAR";
export const NVarChar = Object.assign((_len?: number) => "NVARCHAR", {
  MAX: Number.MAX_SAFE_INTEGER,
});
export const Decimal = (_p: number, _s: number) => "DECIMAL";
export const Date = "DATE";
export const DateTime = "DATETIME";
export const Time = "TIME";
export const Money = "MONEY";

/** MySQL DATETIME không nhận chuỗi ISO (2026-05-25T08:00:00.000Z) — chuẩn hóa trước khi CALL procedure */
export function toMySqlDateTime(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof globalThis.Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  }
  const s = String(value).trim();
  if (!s) return null;
  const normalized = s.includes("T") ? s.replace("T", " ").replace(/Z$/i, "").split(".")[0] : s;
  return normalized.length >= 19 ? normalized.slice(0, 19) : normalized;
}

export function toMySqlDate(value: unknown): string | null {
  const dt = toMySqlDateTime(value);
  return dt ? dt.slice(0, 10) : null;
}

function coerceParamValue(type: unknown, value: unknown): unknown {
  if (type === DateTime) return toMySqlDateTime(value);
  if (type === Date) return toMySqlDate(value);
  return value;
}

/** Lấy recordset đầu tiên sau CALL stored procedure (mysql2 trả về mảng lồng nhau) */
function extractRecordset(rows: unknown): Record<string, unknown>[] {
  if (!Array.isArray(rows)) return [];
  const first = rows[0];
  if (Array.isArray(first) && first.length > 0 && typeof first[0] === "object") {
    return first as Record<string, unknown>[];
  }
  if (rows.length > 0 && typeof rows[0] === "object" && !("fieldCount" in (rows[0] as object))) {
    return rows as Record<string, unknown>[];
  }
  return [];
}

type Queryable = Pool | PoolConnection;

export class SqlRequest {
  private readonly params: unknown[] = [];

  constructor(private readonly db: Queryable) {}

  input(_name: string, type: unknown, value: unknown): this {
    this.params.push(coerceParamValue(type, value));
    return this;
  }

  async execute(procedureName: string): Promise<{ recordset: Record<string, unknown>[] }> {
    const placeholders = this.params.map(() => "?").join(", ");
    const sql =
      this.params.length > 0
        ? `CALL \`${procedureName}\`(${placeholders})`
        : `CALL \`${procedureName}\`()`;

    const [rows] = await this.db.query(sql, this.params);
    return { recordset: extractRecordset(rows) };
  }
}

export class SqlTransaction {
  private connection: PoolConnection | null = null;

  constructor(private readonly pool: Pool) {}

  async begin(): Promise<void> {
    this.connection = await this.pool.getConnection();
    await this.connection.beginTransaction();
  }

  request(): SqlRequest {
    if (!this.connection) {
      throw new Error("Transaction chưa begin()");
    }
    return new SqlRequest(this.connection);
  }

  async commit(): Promise<void> {
    if (!this.connection) return;
    await this.connection.commit();
    this.connection.release();
    this.connection = null;
  }

  async rollback(): Promise<void> {
    if (!this.connection) return;
    await this.connection.rollback();
    this.connection.release();
    this.connection = null;
  }
}

/** Module tương thích API mssql cũ cho server.ts */
const sqlCompat = {
  Int,
  VarChar,
  NVarChar,
  MAX: Number.MAX_SAFE_INTEGER,
  Decimal,
  Date,
  DateTime,
  Time,
  Money,
  Transaction: SqlTransaction,
  async connect(_config?: unknown): Promise<Pool & { request(): SqlRequest }> {
    throw new Error("Dùng pool từ db/mysql.ts thay vì sql.connect()");
  },
};

export default sqlCompat;

export function poolWithRequest(pool: Pool): Pool & { request(): SqlRequest } {
  return Object.assign(pool, {
    request() {
      return new SqlRequest(pool);
    },
  });
}
