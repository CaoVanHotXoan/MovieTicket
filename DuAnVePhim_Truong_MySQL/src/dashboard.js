/**
 * Dashboard Admin — biểu đồ thống kê (tiêu chí 6 & 7)
 */
import { Chart, registerables } from 'chart.js';
import axios from 'axios';
import { apiRequest, showToast } from './admin-utils.js';

Chart.register(...registerables);

let chartInstances = [];

function destroyCharts() {
    chartInstances.forEach(c => c.destroy());
    chartInstances = [];
}

const chartColors = {
    amber: 'rgba(245, 158, 11, 0.85)',
    amberLight: 'rgba(245, 158, 11, 0.25)',
    slate: 'rgba(51, 65, 85, 0.8)',
    emerald: 'rgba(16, 185, 129, 0.85)',
    rose: 'rgba(244, 63, 94, 0.85)',
    blue: 'rgba(59, 130, 246, 0.85)',
    purple: 'rgba(168, 85, 247, 0.85)'
};

const palette = [
    chartColors.amber,
    chartColors.emerald,
    chartColors.blue,
    chartColors.rose,
    chartColors.purple,
    chartColors.slate
];

/**
 * Render trang dashboard với biểu đồ Chart.js
 */
export async function renderDashboard(appElement, { formatVND, createIcons, iconConfig }) {
    destroyCharts();

    let stats;
    try {
        const res = await apiRequest(() => axios.get('/api/admin/stats'), { silent: true });
        stats = res.data;
    } catch (err) {
        throw err;
    }

    const { summary, revenueByMonth, revenueByPayment, moviesByStatus, recentInvoices } = stats;

    appElement.innerHTML = `
        <div class="space-y-6 admin-page-enter">
            <div class="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 class="text-2xl font-black text-gray-800 tracking-tight">Bảng Điều Khiển</h2>
                    <p class="text-gray-500 text-sm mt-1">Thống kê rạp phim — REST API <code class="text-amber-600 bg-amber-50 px-1 rounded">/api/admin/stats</code></p>
                </div>
                <a href="/api-docs" target="_blank" rel="noopener"
                    class="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-lg transition-colors">
                    <span>Tài liệu API (Swagger)</span>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                </a>
            </div>

            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                ${summaryCards(summary, formatVND)}
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <h3 class="font-bold text-gray-800 mb-1">Doanh thu theo tháng</h3>
                    <p class="text-xs text-gray-400 mb-4">6 tháng gần nhất (VND)</p>
                    <div class="h-64 relative"><canvas id="chartRevenueMonth"></canvas></div>
                </div>
                <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <h3 class="font-bold text-gray-800 mb-1">Doanh thu theo phương thức thanh toán</h3>
                    <p class="text-xs text-gray-400 mb-4">Tỷ lệ theo hóa đơn</p>
                    <div class="h-64 relative flex items-center justify-center"><canvas id="chartPayment"></canvas></div>
                </div>
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <h3 class="font-bold text-gray-800 mb-1">Phim theo trạng thái</h3>
                    <p class="text-xs text-gray-400 mb-4">Đang chiếu / Sắp chiếu / Ngừng</p>
                    <div class="h-56 relative"><canvas id="chartMovieStatus"></canvas></div>
                </div>
                <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                    <h3 class="font-bold text-gray-800 mb-4">Hóa đơn gần đây</h3>
                    <div class="overflow-y-auto max-h-56 scrollbar-thin">
                        <table class="w-full text-left text-sm">
                            <thead class="text-xs uppercase text-gray-400 border-b">
                                <tr><th class="pb-2">Mã</th><th class="pb-2">Khách</th><th class="pb-2">Tổng</th></tr>
                            </thead>
                            <tbody class="divide-y divide-gray-50">
                                ${(recentInvoices || []).map(inv => `
                                    <tr class="hover:bg-amber-50/50 transition-colors">
                                        <td class="py-2 font-bold text-amber-700">#${inv.MaHoaDon}</td>
                                        <td class="py-2 text-gray-600">${inv.TenKhachHang || '-'}</td>
                                        <td class="py-2 font-bold text-red-600">${formatVND(inv.TongTien)}</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="3" class="py-4 text-gray-400 text-center">Chưa có hóa đơn</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <h3 class="font-bold text-gray-800 mb-3">Truy cập nhanh quản lý (CRUD)</h3>
                <div class="flex flex-wrap gap-2">
                    ${quickLinks.map(q => `
                        <button type="button" data-goto-page="${q.page}"
                            class="px-4 py-2 bg-gray-100 hover:bg-amber-100 hover:text-amber-800 text-gray-700 text-sm font-bold rounded-lg transition-all duration-200">
                            ${q.label}
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    appElement.querySelectorAll('[data-goto-page]').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.getAttribute('data-goto-page');
            const nav = document.querySelector(`.nav-link[data-page="${page}"]`);
            if (nav) nav.click();
            else showToast('Không tìm thấy menu', 'warning');
        });
    });

    renderCharts(revenueByMonth, revenueByPayment, moviesByStatus);
    createIcons(iconConfig);
}

function summaryCards(summary, formatVND) {
    const items = [
        { label: 'Tổng doanh thu', value: formatVND(summary?.totalRevenue), color: 'from-amber-500 to-orange-600' },
        { label: 'Hóa đơn', value: summary?.totalInvoices ?? 0, color: 'from-emerald-500 to-teal-600' },
        { label: 'Khách hàng', value: summary?.totalCustomers ?? 0, color: 'from-blue-500 to-indigo-600' },
        { label: 'Phim', value: summary?.totalMovies ?? 0, color: 'from-rose-500 to-pink-600' }
    ];
    return items.map(i => `
        <div class="bg-gradient-to-br ${i.color} text-white p-5 rounded-xl shadow-md transform hover:scale-[1.02] transition-transform duration-200">
            <p class="text-xs font-bold uppercase opacity-90 tracking-wider">${i.label}</p>
            <p class="text-2xl font-black mt-2">${i.value}</p>
        </div>
    `).join('');
}

const quickLinks = [
    { page: 'movies', label: 'Phim' },
    { page: 'showtimes', label: 'Suất chiếu' },
    { page: 'customers', label: 'Khách hàng' },
    { page: 'invoices', label: 'Hóa đơn' },
    { page: 'payments', label: 'Thanh toán' },
    { page: 'products', label: 'Sản phẩm' }
];

function renderCharts(revenueByMonth, revenueByPayment, moviesByStatus) {
    const monthCtx = document.getElementById('chartRevenueMonth');
    if (monthCtx && revenueByMonth?.length) {
        chartInstances.push(new Chart(monthCtx, {
            type: 'bar',
            data: {
                labels: revenueByMonth.map(r => r.label),
                datasets: [{
                    label: 'Doanh thu (đ)',
                    data: revenueByMonth.map(r => r.total),
                    backgroundColor: chartColors.amber,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: v => (v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : (v / 1e3).toFixed(0) + 'k')
                        }
                    }
                }
            }
        }));
    }

    const payCtx = document.getElementById('chartPayment');
    if (payCtx && revenueByPayment?.length) {
        chartInstances.push(new Chart(payCtx, {
            type: 'doughnut',
            data: {
                labels: revenueByPayment.map(r => r.label),
                datasets: [{
                    data: revenueByPayment.map(r => r.total),
                    backgroundColor: palette.slice(0, revenueByPayment.length)
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        }));
    }

    const movieCtx = document.getElementById('chartMovieStatus');
    if (movieCtx && moviesByStatus?.length) {
        chartInstances.push(new Chart(movieCtx, {
            type: 'bar',
            data: {
                labels: moviesByStatus.map(m => m.label),
                datasets: [{
                    label: 'Số phim',
                    data: moviesByStatus.map(m => m.count),
                    backgroundColor: [chartColors.emerald, chartColors.amber, chartColors.slate]
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        }));
    }
}
