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

  input(_name: string, _type: unknown, value: unknown): this {
    this.params.push(value);
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
