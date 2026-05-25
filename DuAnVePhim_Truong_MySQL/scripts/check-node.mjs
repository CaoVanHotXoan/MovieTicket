/**
 * Kiểm tra phiên bản Node.js trước khi chạy dev/start.
 * Yêu cầu tối thiểu: Node >= 20.14.0 (môi trường phòng lab trường).
 */
const MIN = [20, 14, 0];

const parts = process.versions.node.split('.').map((n) => parseInt(n, 10));

function compare(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }
  return 0;
}

if (compare(parts, MIN) < 0) {
  console.error(
    `\n❌ Cần Node.js >= ${MIN.join('.')}. Phiên bản hiện tại: ${process.versions.node}\n` +
      '   Tải Node 20 LTS: https://nodejs.org/\n' +
      '   Hoặc dùng nvm: nvm install 20.14.0 && nvm use 20.14.0\n'
  );
  process.exit(1);
}
