/** Xóa thư mục dist — chạy được trên Windows và Linux */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

try {
  fs.rmSync(dist, { recursive: true, force: true });
  console.log('Đã xóa thư mục dist');
} catch {
  /* dist chưa tồn tại */
}
