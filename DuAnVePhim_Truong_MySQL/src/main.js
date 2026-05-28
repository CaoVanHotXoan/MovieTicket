import axios from 'axios';
import { createIcons, Clapperboard, Tag, Film, Monitor, Armchair, Calendar, Users, Receipt, CreditCard, LogOut, Plus, Edit, Trash2, Play, X, Sofa, Image, LayoutDashboard } from 'lucide';
import { setupAdminApi, showToast, showPageLoading, showErrorState, validateForm, apiRequest } from './admin-utils.js';
import { renderDashboard } from './dashboard.js';

setupAdminApi(axios);

// Cấu hình các icon Lucide sẽ sử dụng trong ứng dụng
const iconConfig = {
    icons: {
        Clapperboard, Tag, Film, Monitor, Armchair, Calendar, Users, Receipt, CreditCard, LogOut, Plus, Edit, Trash2, Play, X, Sofa, Image, LayoutDashboard
    }
};

// Trạng thái (State) toàn cục của ứng dụng
const state = {
    currentPage: 'dashboard', // Trang hiện tại (dashboard mặc định)
    banners: [],           // Danh sách banners
    movieTypes: [],        // Danh sách thể loại phim
    movies: [],            // Danh sách phim
    rooms: [],             // Danh sách phòng chiếu
    seatTypes: [],         // Danh sách loại ghế (Thường, VIP...)
    seats: [],             // Danh sách tất cả ghế
    showtimes: [],         // Danh sách suất chiếu
    customers: [],         // Danh sách khách hàng
    invoices: [],          // Danh sách hóa đơn
    payments: [],          // Danh sách thanh toán
    seatFilterRoomId: 'all',  // Bộ lọc phòng cho trang quản lý ghế
    movieFilterTypeId: 'all',  // Bộ lọc thể loại cho trang quản lý phim
    movieFilterStatus: 'all',  // Bộ lọc trạng thái cho trang quản lý phim
    showtimeFilterMovieId: 'all', // Bộ lọc phim cho lịch chiếu
    showtimeFilterRoomId: 'all',  // Bộ lọc phòng cho lịch chiếu
    showtimeFilterDate: 'all',    // Bộ lọc ngày cho lịch chiếu
    showtimeFilterTimeStatus: 'all' // Bộ lọc trạng thái thời gian cho lịch chiếu
};

// Các phần tử DOM chính
const appElement = document.getElementById('app');
const modalContainer = document.getElementById('modal-container');
const modalBackdrop = document.getElementById('modal-backdrop');
const modalContent = document.getElementById('modal-content');

// --- CÁC HÀM TIỆN ÍCH (UTILS) ---

/** Định dạng tiền VND không thập phân */
function formatVND(amount) {
    const n = Math.round(Number(amount) || 0);
    return n.toLocaleString('vi-VN') + 'đ';
}

/**
 * Hiển thị cửa sổ Modal với nội dung HTML tùy chỉnh
 */
function showModal(contentHtml, widthClass = 'max-w-2xl') {
    modalContent.innerHTML = contentHtml;

    // Đặt lại các class cơ bản và áp dụng widthClass
    modalContent.className = `bg-white rounded-xl shadow-2xl w-full transform scale-90 opacity-0 transition-all duration-300 pointer-events-auto ${widthClass}`;

    modalContainer.classList.remove('pointer-events-none');
    modalBackdrop.classList.remove('opacity-0', 'pointer-events-none');

    // Trigger animation sau một frame để transition hoạt động
    setTimeout(() => {
        modalContent.classList.remove('scale-90', 'opacity-0');
        modalContent.classList.add('scale-100', 'opacity-100');
    }, 10);

    createIcons(iconConfig);
}

/**
 * Đóng cửa sổ Modal
 */
function hideModal() {
    modalContent.classList.add('scale-90', 'opacity-0');
    modalContent.classList.remove('scale-100', 'opacity-100');
    modalBackdrop.classList.add('opacity-0', 'pointer-events-none');
    setTimeout(() => {
        modalContainer.classList.add('pointer-events-none');
        modalContent.innerHTML = '';
    }, 300);
}

// Đóng modal khi bấm ra ngoài vùng nội dung
modalBackdrop.addEventListener('click', hideModal);

// --- ĐIỀU HƯỚNG (NAVIGATION) ---

// Xử lý sự kiện click cho các link điều hướng ở sidebar
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        const page = e.currentTarget.getAttribute('data-page');
        // Quản lý phong cách (style) cho tab đang hoạt động
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active', 'bg-gray-800', 'border-amber-500'));
        e.currentTarget.classList.add('active', 'bg-gray-800', 'border-amber-500');
        state.currentPage = page;
        renderPage(); // Tải lại nội dung trang
    });
});

// --- HELPER FUNCTIONS ---
/**
 * Chuyển đổi đối tượng ngày tháng sang chuỗi ISO (YYYY-MM-DD) một cách an toàn
 */
const safeIsoDate = (dateVal) => {
    if (!dateVal) return '';
    try {
        const d = new Date(dateVal);
        return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
    } catch (e) {
        return '';
    }
};

/**
 * Lấy tên thứ trong tiếng Việt từ đối tượng Date
 */
const getVietWeekday = (date) => {
    if (!date || isNaN(date.getTime())) return '';
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return days[date.getDay()];
};

/** URL ảnh đại diện khách hàng — chỉ dùng link http(s) hợp lệ, còn lại dùng avatar chữ */
const customerAvatarUrl = (hinhAnh, ten) => {
    if (hinhAnh && typeof hinhAnh === 'string') {
        const u = hinhAnh.trim();
        if (u && u !== 'null' && (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:image'))) {
            return u;
        }
    }
    const name = (ten || 'User').trim() || 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1a1a1a&color=fff&size=80&bold=true`;
};

/** Định dạng giá tiền VNĐ (làm tròn, tách hàng nghìn) */
const formatVnd = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return `${Math.round(n).toLocaleString('vi-VN')}đ`;
};

// --- CÁC HÀM HIỂN THỊ (RENDERERS) ---

/**
 * Hàm chính điều phối việc hiển thị nội dung tùy theo trang hiện tại trong state
 */
async function renderPage() {
    showPageLoading(appElement);

    try {
        // Tùy theo trang mà gọi hàm render tương ứng
        switch (state.currentPage) {
            case 'dashboard':
                await renderDashboard(appElement, { formatVND, createIcons, iconConfig });
                break;
            case 'banners': await renderBanners(); break;
            case 'movies': await renderMovies(); break;
            case 'movie-types': await renderMovieTypes(); break;
            case 'rooms': await renderRooms(); break;
            case 'seat-types': await renderSeatTypes(); break;
            case 'seats': await renderSeats(); break;
            case 'showtimes': await renderShowtimes(); break;
            case 'customers': await renderCustomers(); break;
            case 'products': await renderProductsPage(); break;
            case 'invoices': await renderInvoices(); break;
            case 'payments': await renderPayments(); break;
            default:
                appElement.innerHTML = `<div class="p-8 text-center text-gray-500">Chức năng ${state.currentPage} đang được cập nhật...</div>`;
        }
    } catch (err) {
        showErrorState(appElement, err.message, () => renderPage());
        showToast(err.message, 'error');
    }
}

window.validateForm = validateForm;
// --- QUẢN LÝ PHIM (MOVIES SECTION) ---

/**
 * Hiển thị trang Quản Lý Phim
 */
async function renderMovies() {
    // Tải đồng thời dữ liệu phim và thể loại từ server
    const [moviesRes, typesRes] = await Promise.all([
        axios.get('/api/movies'),
        axios.get('/api/movie-types')
    ]);
    state.movies = moviesRes.data;
    state.movieTypes = typesRes.data;

    // Lọc phim theo thể loại và trạng thái đã chọn
    let filteredMovies = state.movieFilterTypeId === 'all'
        ? state.movies
        : state.movies.filter(m => m.MaLoai == state.movieFilterTypeId);

    if (state.movieFilterStatus !== 'all') {
        filteredMovies = filteredMovies.filter(m => m.TrangThai === state.movieFilterStatus);
    }

    // Giao diện chính của trang quản lý phim
    appElement.innerHTML = `
        <div class="space-y-6">
            <!-- Thanh công cụ: Tiêu đề, Bộ lọc và Nút thêm mới -->
            <div class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div class="flex items-center gap-4">
                    <h2 class="text-2xl font-bold text-gray-800">Quản Lý Phim</h2>
                    <!-- Bộ lọc thể loại phim -->
                    <select id="movie-type-filter" class="px-3 py-1.5 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium">
                        <option value="all">Tất cả thể loại</option>
                        ${state.movieTypes.map(t => `<option value="${t.MaLoai}" ${state.movieFilterTypeId == t.MaLoai ? 'selected' : ''}>${t.TenLoai}</option>`).join('')}
                    </select>
                    <!-- Bộ lọc trạng thái phim -->
                    <select id="movie-status-filter" class="px-3 py-1.5 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium">
                        <option value="all" ${state.movieFilterStatus === 'all' ? 'selected' : ''}>Tất cả trạng thái</option>
                        <option value="Đang chiếu" ${state.movieFilterStatus === 'Đang chiếu' ? 'selected' : ''}>Đang chiếu</option>
                        <option value="Sắp chiếu" ${state.movieFilterStatus === 'Sắp chiếu' ? 'selected' : ''}>Sắp chiếu</option>
                    </select>
                </div>
                <button id="btn-add-movie" class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-md">
                    <i data-lucide="plus" class="w-5 h-5"></i> Thêm Phim Mới
                </button>
            </div>

            <!-- Thông tin số lượng hiển thị -->
            <div class="flex gap-2 items-center text-sm text-gray-500 px-2">
                <i data-lucide="info" class="w-4 h-4"></i>
                <span>Hiển thị ${filteredMovies.length} / ${state.movies.length} bộ phim</span>
            </div>

            <!-- Bảng hiển thị danh sách phim với thanh cuộn dọc -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-h-[600px] overflow-y-auto scrollbar-thin">
                <table class="w-full text-left">
                    <thead class="bg-gray-50 text-gray-600 text-xs uppercase sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th class="px-6 py-4">Phim</th>
                            <th class="px-6 py-3">Thể Loại</th>
                            <th class="px-6 py-3 text-center">Trạng Thái</th>
                            <th class="px-6 py-3 text-center">Khởi Chiếu</th>
                            <th class="px-6 py-3 text-center">Thời Lượng</th>
                            <th class="px-6 py-3">Mô Tả</th>
                            <th class="px-6 py-3 text-right">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 italic">
                        ${filteredMovies.map(movie => `
                            <tr class="hover:bg-gray-50 transition-colors">
                                <td class="px-6 py-4 flex items-center gap-4 min-w-[200px]">
                                    <img src="${movie.HinhAnh || 'https://picsum.photos/seed/movie/40/60'}" class="w-10 h-14 object-cover rounded shadow-sm" referrerPolicy="no-referrer">
                                    <div>
                                        <div class="font-bold text-gray-900 uppercase">${movie.TenPhim}</div>
                                    </div>
                                </td>
                                <td class="px-6 py-4">
                                    <span class="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-black uppercase">${movie.TenLoai || 'UNKNOWN'}</span>
                                </td>
                                <td class="px-6 py-4 text-center">
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${movie.TrangThai === 'Đang chiếu' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}">
                                        ${movie.TrangThai || 'Sắp chiếu'}
                                    </span>
                                </td>
                                <td class="px-6 py-4 text-center text-xs font-bold text-blue-600">
                                    ${movie.NgayKhoiChieu ? new Date(movie.NgayKhoiChieu).toLocaleDateString('vi-VN') : '---'}
                                </td>
                                <td class="px-6 py-4 text-center text-gray-600 font-bold text-xs">
                                    ${movie.ThoiLuong} phút
                                </td>
                                <td class="px-6 py-4 max-w-[250px]">
                                    <div class="text-[10px] text-gray-500 line-clamp-2 leading-relaxed" title="${movie.MoTa || ''}">
                                        ${movie.MoTa || '<span class="text-gray-300 italic italic">Chưa có mô tả</span>'}
                                    </div>
                                </td>
                                <td class="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                                    <!-- Nút xem Trailer -->
                                    <button onclick="window.watchTrailer('${movie.Trailer}')" class="text-amber-600 hover:bg-amber-50 p-2 rounded-full transition-colors" title="Xem Trailer">
                                        <i data-lucide="play" class="w-4 h-4"></i>
                                    </button>
                                    <!-- Nút Sửa -->
                                    <button onclick="window.editMovie(${movie.MaPhim})" class="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors">
                                        <i data-lucide="edit" class="w-4 h-4"></i>
                                    </button>
                                    <!-- Nút Xóa -->
                                    <button onclick="window.deleteMovie(${movie.MaPhim})" class="text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors">
                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Lắng nghe sự kiện thay đổi bộ lọc thể loại
    document.getElementById('movie-type-filter').addEventListener('change', (e) => {
        state.movieFilterTypeId = e.target.value;
        renderMovies(); // Cập nhật lại danh sách hiển thị
    });

    // Lắng nghe sự kiện thay đổi bộ lọc trạng thái
    document.getElementById('movie-status-filter').addEventListener('change', (e) => {
        state.movieFilterStatus = e.target.value;
        renderMovies(); // Cập nhật lại danh sách hiển thị
    });

    // Mở form thêm phim mới
    document.getElementById('btn-add-movie').addEventListener('click', () => showMovieForm());
    createIcons(iconConfig);
}

/**
 * Hiển thị trailer phim từ link YouTube (Hỗ trợ nhiều định dạng link)
 */
window.watchTrailer = (url) => {
    if (!url) return alert('Không có trailer cho phim này');

    // Hàm trích xuất Video ID từ nhiều định dạng link YouTube (watch, short link, embed)
    const getYoutubeId = (url) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const videoId = getYoutubeId(url);
    if (!videoId) return alert('Link YouTube không hợp lệ. Bạn hãy dán link xem trực tiếp trên YouTube (vd: https://www.youtube.com/watch?v=...)');

    const embedUrl = `https://www.youtube.com/embed/${videoId}`;

    showModal(`
        <div class="relative pt-[56.25%] bg-black rounded-lg overflow-hidden">
            <button onclick="window.hideModal()" class="absolute top-2 right-2 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black transition-colors">
                <i data-lucide="x" class="w-6 h-6"></i>
            </button>
            <iframe class="absolute inset-0 w-full h-full" src="${embedUrl}?autoplay=1" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        </div>
    `);
    createIcons(iconConfig);
};

window.hideModal = hideModal;

/**
 * Hiển thị form Thêm/Sửa Phim
 */
function showMovieForm(movie = null) {
    const isEdit = !!movie;
    showModal(`
        <div class="p-5">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold text-gray-800 uppercase tracking-tight">${isEdit ? 'Chỉnh Sửa Phim' : 'Thêm Phim Mới'}</h3>
                <button onclick="window.hideModal()" class="text-gray-400 hover:text-gray-600 transition-colors">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <form id="movie-form" class="grid grid-cols-2 gap-x-6 gap-y-3">
                <div class="col-span-2">
                    <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">Tên Phim</label>
                    <input type="text" name="TenPhim" value="${isEdit ? movie.TenPhim : ''}" required class="w-full px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm">
                </div>
                <div class="col-span-1">
                    <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">Thể Loại</label>
                    <select name="MaLoai" required class="w-full px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm">
                        ${state.movieTypes.map(t => `<option value="${t.MaLoai}" ${isEdit && movie.MaLoai === t.MaLoai ? 'selected' : ''}>${t.TenLoai}</option>`).join('')}
                    </select>
                </div>
                <div class="col-span-1">
                    <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">Thời Lượng (phút)</label>
                    <input type="number" name="ThoiLuong" value="${isEdit ? movie.ThoiLuong : ''}" required class="w-full px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm">
                </div>
                <div class="col-span-1">
                    <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">Trạng Thái</label>
                    <select name="TrangThai" class="w-full px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm">
                        <option value="Đang chiếu" ${isEdit && movie.TrangThai === 'Đang chiếu' ? 'selected' : ''}>Đang chiếu</option>
                        <option value="Sắp chiếu" ${isEdit && movie.TrangThai === 'Sắp chiếu' ? 'selected' : ''}>Sắp chiếu</option>
                    </select>
                </div>
                <div class="col-span-1">
                    <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">Ngày Khởi Chiếu</label>
                    <input type="date" name="NgayKhoiChieu" value="${safeIsoDate(isEdit ? movie.NgayKhoiChieu : null)}" required class="w-full px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm">
                </div>
                <div class="col-span-1">
                    <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">Link Hình Ảnh</label>
                    <input type="url" name="HinhAnh" value="${isEdit ? movie.HinhAnh : ''}" class="w-full px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm" placeholder="https://...">
                </div>
                <div class="col-span-1">
                    <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">Link Trailer YouTube</label>
                    <input type="url" name="Trailer" value="${isEdit ? movie.Trailer : ''}" class="w-full px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm" placeholder="https://youtube.com/...">
                </div>
                <div class="col-span-2">
                    <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">Mô Tả</label>
                    <textarea name="MoTa" rows="2" class="w-full px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm">${isEdit ? movie.MoTa : ''}</textarea>
                </div>
                <div class="col-span-2 flex justify-end gap-3 mt-4">
                    <button type="button" onclick="window.hideModal()" class="px-5 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                    <button type="submit" class="px-8 py-2 text-sm font-bold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors shadow-lg">${isEdit ? 'Cập Nhật' : 'Thêm Mới'}</button>
                </div>
            </form>
        </div>
    `, 'max-w-3xl');

    // Xử lý gửi form
    document.getElementById('movie-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.MaLoai = parseInt(data.MaLoai);
        data.ThoiLuong = parseInt(data.ThoiLuong);

        try {
            if (isEdit) {
                await axios.put(`/api/movies/${movie.MaPhim}`, data);
            } else {
                await axios.post('/api/movies', data);
            }
            hideModal();
            renderPage();
        } catch (err) {
            const msg = err.response?.data?.error || err.message;
            alert('Lỗi: ' + msg);
        }
    });
}

/**
 * Hiển thị form cập nhật thông tin phim
 */
window.editMovie = (id) => {
    const movie = state.movies.find(m => m.MaPhim == id);
    if (movie) showMovieForm(movie);
};

/**
 * Xóa một bộ phim
 */
window.deleteMovie = async (id) => {
    if (confirm('Bạn có chắc chắn muốn xóa phim này?')) {
        try {
            await axios.delete(`/api/movies/${id}`);
            renderPage();
        } catch (err) {
            const msg = err.response?.data?.error || err.message;
            alert('Lỗi khi xóa phim: ' + msg);
        }
    }
};

// --- BANNERS SECTION ---
async function renderBanners() {
    const [bannersRes, moviesRes] = await Promise.all([
        axios.get('/api/banners'),
        axios.get('/api/movies')
    ]);
    state.banners = bannersRes.data;
    state.movies = moviesRes.data;

    appElement.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h2 class="text-2xl font-bold text-gray-800">Quản Lý Banners</h2>
                <button id="btn-add-banner" class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md font-bold transition-transform active:scale-95 cursor-pointer">
                    <i data-lucide="plus" class="w-5 h-5"></i> Thêm Banner Mới
                </button>
            </div>
            <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <table class="w-full text-left">
                    <thead class="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b border-gray-100">
                        <tr>
                            <th class="px-6 py-4">Mã Banner</th>
                            <th class="px-6 py-4">Tên Banner</th>
                            <th class="px-6 py-4">Hình Ảnh</th>
                            <th class="px-6 py-4">Liên Kết Phim</th>
                            <th class="px-6 py-4 text-right">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${state.banners.map(banner => `
                            <tr class="hover:bg-gray-50/50 transition-colors">
                                <td class="px-6 py-4 text-gray-400 font-mono text-sm">#${banner.MaBanner}</td>
                                <td class="px-6 py-4 text-gray-800 font-bold text-sm">${banner.TenBanner || 'Chưa đặt tên'}</td>
                                <td class="px-6 py-4">
                                    <div class="w-32 h-16 rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-gray-50">
                                        <img src="${banner.LinkBanner}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/128x64?text=Lỗi+ảnh'">
                                    </div>
                                </td>
                                <td class="px-6 py-4">
                                    ${banner.MaPhim
            ? `<span class="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-full font-semibold text-xs border border-amber-200/50">
                                            ${banner.TenPhim || `Mã phim: ${banner.MaPhim}`}
                                           </span>`
            : `<span class="text-xs text-gray-400 font-semibold italic">Không liên kết</span>`
        }
                                </td>
                                <td class="px-6 py-4 text-right space-x-2">
                                    <button onclick="window.editBanner(${banner.MaBanner})" class="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors cursor-pointer" title="Sửa">
                                        <i data-lucide="edit" class="w-4 h-4"></i>
                                    </button>
                                    <button onclick="window.deleteBanner(${banner.MaBanner})" class="text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors cursor-pointer" title="Xóa">
                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                        ${state.banners.length === 0 ? `
                            <tr>
                                <td colspan="5" class="px-6 py-12 text-center text-gray-400 italic">
                                    Chưa có banner nào được thiết lập. Hãy thêm banner đầu tiên!
                                </td>
                            </tr>
                        ` : ''}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('btn-add-banner').addEventListener('click', () => showBannerForm());
    createIcons(iconConfig);
}

function showBannerForm(banner = null) {
    const isEdit = !!banner;
    showModal(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-4 uppercase tracking-tight">${isEdit ? 'Sửa Banner' : 'Thêm Banner Mới'}</h3>
            <form id="banner-form" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">Tên Banner</label>
                    <input type="text" name="TenBanner" value="${isEdit ? banner.TenBanner || '' : ''}" required class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm font-semibold text-gray-900">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">Link Hình Ảnh Banner</label>
                    <input type="url" name="LinkBanner" value="${isEdit ? banner.LinkBanner || '' : ''}" required placeholder="https://..." class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm font-semibold text-gray-900">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">Phim Liên Kết</label>
                    <select name="MaPhim" class="w-full border rounded p-2 text-gray-900 bg-white focus:ring-2 focus:ring-amber-500 outline-none text-sm font-semibold">
                        <option value="">-- Không liên kết với phim nào (Chỉ hiển thị quảng cáo) --</option>
                        ${state.movies.map(m => `<option value="${m.MaPhim}" ${isEdit && banner.MaPhim == m.MaPhim ? 'selected' : ''}>${m.TenPhim}</option>`).join('')}
                    </select>
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button type="button" onclick="window.hideModal()" class="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                    <button type="submit" class="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow transition-colors">${isEdit ? 'Lưu Thay Đổi' : 'Thêm Mới'}</button>
                </div>
            </form>
        </div>
    `);

    document.getElementById('banner-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        data.MaPhim = data.MaPhim ? parseInt(data.MaPhim) : null;
        try {
            if (isEdit) {
                await axios.put(`/api/banners/${banner.MaBanner}`, data);
            } else {
                await axios.post('/api/banners', data);
            }
            hideModal();
            renderPage();
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
    });
}

window.editBanner = (id) => {
    const banner = state.banners.find(b => b.MaBanner == id);
    if (banner) showBannerForm(banner);
};

window.deleteBanner = async (id) => {
    if (confirm('Bạn có chắc chắn muốn xóa banner này?')) {
        try {
            await axios.delete(`/api/banners/${id}`);
            renderPage();
        } catch (err) {
            alert('Lỗi khi xóa banner: ' + err.message);
        }
    }
};

// --- MOVIE TYPES ---
async function renderMovieTypes() {
    const res = await axios.get('/api/movie-types');
    state.movieTypes = res.data;

    appElement.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold text-gray-800">Quản Lý Loại Phim</h2>
                <button id="btn-add-type" class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md italic">
                    <i data-lucide="plus" class="w-5 h-5"></i> Thêm Loại Mới
                </button>
            </div>
            <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <table class="w-full text-left">
                    <thead class="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                        <tr>
                            <th class="px-6 py-4">Mã Loại</th>
                            <th class="px-6 py-4">Tên Loại</th>
                            <th class="px-6 py-4 text-right">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 italic">
                        ${state.movieTypes.map(type => `
                            <tr class="hover:bg-gray-50 transition-colors">
                                <td class="px-6 py-4 text-gray-400 font-mono">#${type.MaLoai}</td>
                                <td class="px-6 py-4 text-gray-800 font-bold uppercase">${type.TenLoai}</td>
                                <td class="px-6 py-4 text-right space-x-2">
                                    <button onclick="window.editMovieType(${type.MaLoai})" class="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors">
                                        <i data-lucide="edit" class="w-4 h-4"></i>
                                    </button>
                                    <button onclick="window.deleteMovieType(${type.MaLoai})" class="text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors">
                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('btn-add-type').addEventListener('click', () => showMovieTypeForm());
    createIcons(iconConfig);
}

function showMovieTypeForm(type = null) {
    const isEdit = !!type;
    showModal(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-4 uppercase">${isEdit ? 'Sửa Loại Phim' : 'Thêm Loại Phim Mới'}</h3>
            <form id="movie-type-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">Tên Loại Phim</label>
                    <input type="text" name="TenLoai" value="${isEdit ? type.TenLoai : ''}" required class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none">
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button type="button" onclick="window.hideModal()" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
                    <button type="submit" class="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors shadow-md">${isEdit ? 'Lưu' : 'Thêm'}</button>
                </div>
            </form>
        </div>
    `);

    document.getElementById('movie-type-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        try {
            if (isEdit) await axios.put(`/api/movie-types/${type.MaLoai}`, data);
            else await axios.post('/api/movie-types', data);
            hideModal();
            renderPage();
        } catch (err) { alert('Lỗi: ' + err.message); }
    });
}

window.editMovieType = (id) => {
    const type = state.movieTypes.find(t => t.MaLoai == id);
    if (type) showMovieTypeForm(type);
};

window.deleteMovieType = async (id) => {
    if (confirm('Xóa loại phim này?')) {
        try {
            await axios.delete(`/api/movie-types/${id}`);
            renderPage();
        } catch (err) {
            const msg = err.response?.data?.error || err.message;
            alert('Lỗi: ' + msg);
        }
    }
};

// --- ROOMS SECTION ---
async function renderRooms() {
    const res = await axios.get('/api/rooms');
    state.rooms = res.data;

    appElement.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold text-gray-800">Quản Lý Phòng Chiếu</h2>
                <button id="btn-add-room" class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-md">
                    <i data-lucide="plus" class="w-5 h-5"></i> Thêm Phòng Mới
                </button>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table class="w-full text-left">
                    <thead class="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                        <tr>
                            <th class="px-6 py-4">Mã Phòng</th>
                            <th class="px-6 py-4">Tên Phòng</th>
                            <th class="px-6 py-4 text-right">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 italic">
                        ${state.rooms.map(room => `
                            <tr class="hover:bg-gray-50 transition-colors">
                                <td class="px-6 py-4 text-gray-400 font-mono">#${room.MaPhong}</td>
                                <td class="px-6 py-4 text-gray-800 font-bold underline decoration-amber-300 decoration-2">${room.TenPhong}</td>
                                <td class="px-6 py-4 text-right space-x-2">
                                    <button onclick="window.editRoom(${room.MaPhong})" class="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors">
                                        <i data-lucide="edit" class="w-4 h-4"></i>
                                    </button>
                                    <button onclick="window.deleteRoom(${room.MaPhong})" class="text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors">
                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('btn-add-room').addEventListener('click', () => showRoomForm());
    createIcons(iconConfig);
}

function showRoomForm(room = null) {
    const isEdit = !!room;
    showModal(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-4 uppercase">${isEdit ? 'Cập Nhật Phòng' : 'Thêm Phòng Chiếu Mới'}</h3>
            <form id="room-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">Tên Phòng</label>
                    <input type="text" name="TenPhong" value="${isEdit ? room.TenPhong : ''}" required class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" placeholder="vd: Phòng 1, Phòng VIP...">
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button type="button" onclick="window.hideModal()" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
                    <button type="submit" class="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors shadow-md">${isEdit ? 'Cập Nhật' : 'Tạo Phòng'}</button>
                </div>
            </form>
        </div>
    `);

    document.getElementById('room-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        try {
            if (isEdit) await axios.put(`/api/rooms/${room.MaPhong}`, data);
            else await axios.post('/api/rooms', data);
            hideModal();
            renderPage();
        } catch (err) { alert('Lỗi: ' + err.message); }
    });
}

window.editRoom = (id) => {
    const room = state.rooms.find(r => r.MaPhong == id);
    if (room) showRoomForm(room);
}

window.deleteRoom = async (id) => {
    if (confirm('Xóa phòng này?')) {
        try {
            await axios.delete(`/api/rooms/${id}`);
            renderPage();
        } catch (err) {
            const msg = err.response?.data?.error || err.message;
            alert('Lỗi: ' + msg);
        }
    }
};

// --- SEAT TYPES SECTION ---
async function renderSeatTypes() {
    const res = await axios.get('/api/seat-types');
    state.seatTypes = res.data;

    appElement.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold text-gray-800">Cấu Hình Loại Ghế</h2>
                <button id="btn-add-seat-type" class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md">
                    <i data-lucide="plus" class="w-5 h-5"></i> Thêm Loại Ghế
                </button>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table class="w-full text-left">
                    <thead class="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                        <tr>
                            <th class="px-6 py-4">Tên Loại Ghế</th>
                            <th class="px-6 py-4">Giá Ghế</th>
                            <th class="px-6 py-4 text-right">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 italic">
                        ${state.seatTypes.map(type => `
                            <tr class="hover:bg-gray-50 transition-colors">
                                <td class="px-6 py-4 text-gray-900 font-black uppercase tracking-tight italic">${type.TenLoai}</td>
                                <td class="px-6 py-4 font-mono text-amber-600 font-bold text-lg">${(type.GiaGhe || 0).toLocaleString()}đ</td>
                                <td class="px-6 py-4 text-right space-x-2">
                                    <button onclick="window.editSeatType(${type.MaLoaiGhe})" class="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors">
                                        <i data-lucide="edit" class="w-4 h-4"></i>
                                    </button>
                                    <button onclick="window.deleteSeatType(${type.MaLoaiGhe})" class="text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors">
                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('btn-add-seat-type').addEventListener('click', () => showSeatTypeForm());
    createIcons(iconConfig);
}

function showSeatTypeForm(type = null) {
    const isEdit = !!type;
    showModal(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-4 uppercase tracking-widest">${isEdit ? 'Sửa Loại Ghế' : 'Tạo Loại Ghế Mới'}</h3>
            <form id="seat-type-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">Tên Loại Ghế</label>
                    <input type="text" name="TenLoai" value="${isEdit ? type.TenLoai : ''}" required class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" placeholder="vd: VIP, Ghế Đôi...">
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">Giá Ghế (đ)</label>
                    <input type="number" name="GiaGhe" value="${isEdit ? type.GiaGhe : '80000'}" required class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none">
                    <p class="text-[10px] text-gray-400 mt-1 italic font-bold">* Giá áp dụng trực tiếp khi khách hàng chọn loại ghế này</p>
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button type="button" onclick="window.hideModal()" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
                    <button type="submit" class="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors shadow-md">${isEdit ? 'Lưu Thay Đổi' : 'Tạo Mới'}</button>
                </div>
            </form>
        </div>
    `);

    document.getElementById('seat-type-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        data.GiaGhe = parseFloat(data.GiaGhe);
        try {
            if (isEdit) await axios.put(`/api/seat-types/${type.MaLoaiGhe}`, data);
            else await axios.post('/api/seat-types', data);
            hideModal();
            renderPage();
        } catch (err) { alert('Lỗi: ' + err.message); }
    });
}

window.editSeatType = (id) => {
    const type = state.seatTypes.find(t => t.MaLoaiGhe == id);
    if (type) showSeatTypeForm(type);
};

window.deleteSeatType = async (id) => {
    if (confirm('Xóa loại ghế này?')) {
        try {
            await axios.delete(`/api/seat-types/${id}`);
            renderPage();
        } catch (err) {
            const msg = err.response?.data?.error || err.message;
            alert('Lỗi: ' + msg);
        }
    }
};

// --- QUẢN LÝ GHẾ (SEATS SECTION) ---
async function renderSeats() {
    const [seatsRes, roomsRes, typesRes] = await Promise.all([
        axios.get('/api/seats'),
        axios.get('/api/rooms'),
        axios.get('/api/seat-types')
    ]);
    state.seats = seatsRes.data;
    state.rooms = roomsRes.data;
    state.seatTypes = typesRes.data;

    // Lọc theo phòng được chọn
    const roomsToRender = state.seatFilterRoomId === 'all'
        ? state.rooms
        : state.rooms.filter(r => r.MaPhong == state.seatFilterRoomId);

    let roomsHtml = '';

    roomsToRender.forEach(room => {
        // Lấy danh sách ghế của phòng này
        const roomSeats = state.seats.filter(s => s.MaPhong == room.MaPhong);

        // Nhóm ghế theo Dòng (chữ cái đầu tiên của SoGhe)
        const rows = {};
        roomSeats.forEach(seat => {
            const rowLabel = seat.SoGhe.charAt(0).toUpperCase();
            if (!rows[rowLabel]) rows[rowLabel] = [];
            rows[rowLabel].push(seat);
        });

        // Sắp xếp các dòng theo bảng chữ cái
        const sortedRowLabels = Object.keys(rows).sort();

        let gridHtml = '';
        if (roomSeats.length === 0) {
            gridHtml = `
                <div class="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <div class="p-3 bg-slate-100 rounded-full text-slate-400 mb-3">
                        <i data-lucide="armchair" class="w-6 h-6"></i>
                    </div>
                    <p class="text-sm text-slate-500 font-medium">Chưa có sơ đồ ghế cho phòng này</p>
                    <button onclick="window.addSeatForRoom(${room.MaPhong})" class="mt-3 text-xs bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-xl transition-all cursor-pointer">
                        Thiết lập ghế đầu tiên
                    </button>
                </div>
            `;
        } else {
            gridHtml = `
                <div class="border border-slate-100 rounded-2xl bg-slate-50/50 p-6 flex flex-col items-center overflow-x-auto">
                    <!-- Mô phỏng màn hình chiếu phim -->
                    <div class="w-2/3 max-w-lg h-2.5 bg-gradient-to-b from-slate-400 to-transparent rounded-full mb-10 text-center text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] pt-4 select-none">
                        Màn Hình Chiếu Phim
                    </div>
                    
                    <!-- Danh sách các hàng ghế -->
                    <div class="flex flex-col gap-3 min-w-[700px] w-full max-w-3xl">
                        ${sortedRowLabels.map(label => {
                // Sắp xếp các ghế trong hàng theo số tăng dần
                const rowSeats = rows[label].sort((a, b) => {
                    const numA = parseInt(a.SoGhe.substring(1)) || 0;
                    const numB = parseInt(b.SoGhe.substring(1)) || 0;
                    return numA - numB;
                });

                return `
                                <div class="flex items-center gap-4">
                                    <!-- Nhãn hàng ghế (A, B, C...) -->
                                    <div class="w-8 h-12 flex items-center justify-center font-extrabold text-slate-400 text-sm bg-slate-200/50 rounded-lg select-none">
                                        ${label}
                                    </div>
                                    
                                    <!-- Các ghế trong hàng -->
                                    <div class="flex-grow flex flex-wrap items-center gap-2">
                                        ${rowSeats.map(seat => {
                    const seatType = seat.TenLoaiGhe ? seat.TenLoaiGhe.toLowerCase() : '';
                    let typeLabel = 'Thường';
                    let bgClass = 'bg-white border-slate-200 text-slate-800 hover:border-slate-400 hover:shadow';
                    let isSweetbox = false;

                    if (seatType.includes('vip')) {
                        typeLabel = 'VIP';
                        bgClass = 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100/50 hover:border-amber-400 hover:shadow';
                    } else if (seatType.includes('đôi') || seatType.includes('sweetbox') || seatType.includes('double')) {
                        typeLabel = 'Đôi';
                        bgClass = 'bg-purple-50 border-purple-300 text-purple-900 hover:bg-purple-100/50 hover:border-purple-400 hover:shadow';
                        isSweetbox = true;
                    }

                    return `
                                                <div class="relative group ${isSweetbox ? 'w-24' : 'w-12'} h-12 border rounded-xl flex flex-col items-center justify-center transition-all duration-300 ${bgClass} cursor-default select-none shadow-sm">
                                                    <span class="text-xs font-black tracking-tight">${seat.SoGhe}</span>
                                                    <span class="text-[8px] opacity-75 font-black uppercase tracking-wider">${typeLabel}</span>
                                                    
                                                    <!-- Lớp phủ (Overlay) hiện 2 nút Sửa và Xóa khi hover -->
                                                    <div class="absolute inset-0 bg-slate-950/90 rounded-xl flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                                                        <button onclick="window.editSeat(${seat.MaGhe})" class="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer" title="Sửa">
                                                            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                                                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                        <button onclick="window.deleteSeat(${seat.MaGhe})" class="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer" title="Xóa">
                                                            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                                                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            `;
                }).join('')}
                                    </div>
                                </div>
                            `;
            }).join('')}
                    </div>
                </div>
            `;
        }

        roomsHtml += `
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                <div class="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div class="flex items-center gap-2.5">
                        <div class="w-1.5 h-6 bg-amber-500 rounded-full"></div>
                        <h3 class="text-base font-extrabold text-slate-800 uppercase tracking-tight">${room.TenPhong}</h3>
                    </div>
                    <span class="text-[10px] bg-slate-100 text-slate-600 font-black px-3 py-1 rounded-full uppercase tracking-wider">
                        Sức chứa: ${roomSeats.length} Ghế
                    </span>
                </div>
                
                ${gridHtml}
            </div>
        `;
    });

    appElement.innerHTML = `
        <div class="space-y-6">
            <!-- Thanh tiêu đề & bộ lọc -->
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white p-5 rounded-2xl shadow-sm border border-slate-100 gap-4">
                <div class="flex flex-wrap items-center gap-4">
                    <h2 class="text-2xl font-black text-slate-800 tracking-tight">SƠ ĐỒ PHÒNG CHIẾU</h2>
                    <select id="room-filter" class="px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm font-semibold bg-white shadow-sm cursor-pointer text-slate-700">
                        <option value="all">Tất cả phòng</option>
                        ${state.rooms.map(r => `<option value="${r.MaPhong}" ${state.seatFilterRoomId == r.MaPhong ? 'selected' : ''}>${r.TenPhong}</option>`).join('')}
                    </select>
                </div>
                <button id="btn-add-seat" class="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-transform active:scale-95 shadow-lg shadow-amber-900/10 cursor-pointer w-full sm:w-auto justify-center">
                    <i data-lucide="plus" class="w-5 h-5"></i> Thêm Ghế Mới
                </button>
            </div>
            
            <!-- Grid hiển thị theo từng phòng -->
            <div class="space-y-8">
                ${roomsHtml}
            </div>
        </div>
    `;

    document.getElementById('room-filter').addEventListener('change', (e) => {
        state.seatFilterRoomId = e.target.value;
        renderSeats();
    });

    document.getElementById('btn-add-seat').addEventListener('click', () => showSeatForm());
    createIcons(iconConfig);
}

function showSeatForm(seat = null) {
    const isEdit = !!seat && !!seat.MaGhe;
    showModal(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-4 uppercase tracking-tight">${isEdit ? 'Chỉnh Sửa Ghế' : 'Thêm Ghế Mới'}</h3>
            <form id="seat-form" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">Phòng</label>
                    <select name="MaPhong" class="w-full border rounded p-2 text-gray-900 bg-white focus:ring-2 focus:ring-amber-500 outline-none text-sm font-semibold">
                        ${state.rooms.map(r => `<option value="${r.MaPhong}" ${seat && seat.MaPhong === r.MaPhong ? 'selected' : ''}>${r.TenPhong}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">Số Ghế (vd: A1, B5...)</label>
                    <input name="SoGhe" type="text" value="${isEdit ? seat.SoGhe : ''}" required class="w-full border rounded p-2 text-gray-900 bg-white focus:ring-2 focus:ring-amber-500 outline-none text-sm font-semibold">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-1 uppercase">Loại Ghế</label>
                    <select name="MaLoaiGhe" class="w-full border rounded p-2 text-gray-900 bg-white focus:ring-2 focus:ring-amber-500 outline-none text-sm font-semibold">
                        ${state.seatTypes.map(t => `<option value="${t.MaLoaiGhe}" ${isEdit && seat.MaLoaiGhe === t.MaLoaiGhe ? 'selected' : ''}>${t.TenLoai}</option>`).join('')}
                    </select>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" onclick="window.hideModal()" class="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                    <button type="submit" class="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg font-bold shadow transition-colors">${isEdit ? 'Lưu Thay Đổi' : 'Thêm Mới'}</button>
                </div>
            </form>
        </div>
    `);

    document.getElementById('seat-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        data.MaPhong = parseInt(data.MaPhong);
        data.MaLoaiGhe = parseInt(data.MaLoaiGhe);
        try {
            if (isEdit) {
                await axios.put(`/api/seats/${seat.MaGhe}`, data);
            } else {
                await axios.post('/api/seats', data);
            }
            hideModal();
            renderPage();
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
    });
}

window.editSeat = (id) => {
    const seat = state.seats.find(s => s.MaGhe == id);
    if (seat) showSeatForm(seat);
}

window.deleteSeat = async (id) => {
    if (confirm('Xóa ghế này?')) {
        try {
            await axios.delete(`/api/seats/${id}`);
            renderPage();
        } catch (err) {
            const msg = err.response?.data?.error || err.message;
            alert('Lỗi: ' + msg);
        }
    }
};

window.addSeatForRoom = (roomId) => {
    showSeatForm({ MaPhong: roomId });
};

// --- QUẢN LÝ LỊCH CHIẾU (SHOWTIMES SECTION) ---
async function renderShowtimes() {
    const [showtimesRes, moviesRes, roomsRes] = await Promise.all([
        axios.get('/api/showtimes'),
        axios.get('/api/movies'),
        axios.get('/api/rooms')
    ]);
    state.showtimes = showtimesRes.data;
    state.movies = moviesRes.data;
    state.rooms = roomsRes.data;

    // Lọc dữ liệu showtimes dựa trên state filters
    const filteredShowtimes = state.showtimes.filter(s => {
        const movieMatch = state.showtimeFilterMovieId === 'all' || s.MaPhim == state.showtimeFilterMovieId;
        const roomMatch = state.showtimeFilterRoomId === 'all' || s.MaPhong == state.showtimeFilterRoomId;

        let dateMatch = true;
        if (state.showtimeFilterDate !== 'all') {
            const showtimeDate = safeIsoDate(s.NgayChieu);
            dateMatch = showtimeDate === state.showtimeFilterDate;
        }

        let timeStatusMatch = true;
        if (state.showtimeFilterTimeStatus !== 'all') {
            let isPast = false;
            if (s.NgayChieu && s.GioBatDau) {
                const dateStr = safeIsoDate(s.NgayChieu);
                const timeStr = s.GioBatDau.split(':').slice(0, 2).join(':');
                const showDateTime = new Date(`${dateStr}T${timeStr}:00`);
                if (showDateTime < new Date()) {
                    isPast = true;
                }
            }
            if (state.showtimeFilterTimeStatus === 'past') {
                timeStatusMatch = isPast;
            } else if (state.showtimeFilterTimeStatus === 'future') {
                timeStatusMatch = !isPast;
            }
        }

        return movieMatch && roomMatch && dateMatch && timeStatusMatch;
    });

    appElement.innerHTML = `
        <div class="space-y-6">
            <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div class="flex flex-col md:flex-row items-start md:items-center gap-4 w-full flex-1 overflow-hidden">
                    <h2 class="text-2xl font-bold text-gray-800 whitespace-nowrap">Lịch Chiếu Phim</h2>
                    <div class="flex flex-wrap gap-2 items-center">
                        <!-- Bộ lọc phim -->
                        <select id="st-movie-filter" class="px-3 py-1.5 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium bg-white max-w-[200px] truncate">
                            <option value="all">Tất cả phim</option>
                            ${state.movies.map(m => `<option value="${m.MaPhim}" ${state.showtimeFilterMovieId == m.MaPhim ? 'selected' : ''}>${m.TenPhim}</option>`).join('')}
                        </select>
                        <!-- Bộ lọc phòng -->
                        <select id="st-room-filter" class="px-3 py-1.5 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium bg-white">
                            <option value="all">Tất cả phòng</option>
                            ${state.rooms.map(r => `<option value="${r.MaPhong}" ${state.showtimeFilterRoomId == r.MaPhong ? 'selected' : ''}>${r.TenPhong}</option>`).join('')}
                        </select>
                        <!-- Bộ lọc trạng thái thời gian -->
                        <select id="st-time-status-filter" class="px-3 py-1.5 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium bg-white">
                            <option value="all" ${state.showtimeFilterTimeStatus === 'all' || !state.showtimeFilterTimeStatus ? 'selected' : ''}>Tất cả thời gian</option>
                            <option value="future" ${state.showtimeFilterTimeStatus === 'future' ? 'selected' : ''}>Còn thời gian</option>
                            <option value="past" ${state.showtimeFilterTimeStatus === 'past' ? 'selected' : ''}>Đã hết thời gian</option>
                        </select>
                        <!-- Bộ lọc ngày -->
                        <div class="flex items-center gap-1 border rounded-lg px-2 bg-white">
                            <i data-lucide="calendar" class="w-4 h-4 text-gray-400 flex-shrink-0"></i>
                            <input type="date" id="st-date-filter" value="${state.showtimeFilterDate === 'all' ? '' : state.showtimeFilterDate}" class="px-2 py-1.5 outline-none text-sm font-medium bg-transparent">
                            ${state.showtimeFilterDate !== 'all' ? `
                                <span class="text-[10px] text-amber-600 font-bold uppercase whitespace-nowrap px-1 border-l ml-1">
                                    ${getVietWeekday(new Date(state.showtimeFilterDate))}
                                </span>
                                <button id="btn-clear-date" class="p-1 hover:bg-gray-100 rounded-full text-red-500 flex-shrink-0" title="Xóa lọc ngày">
                                    <i data-lucide="x" class="w-4 h-4"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
                <button id="btn-add-showtime" class="flex-shrink-0 whitespace-nowrap bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-md text-sm font-bold w-full lg:w-auto">
                    <i data-lucide="plus" class="w-5 h-5"></i> Tạo Suất Chiếu
                </button>
            </div>

            <!-- Báo cáo số lượng -->
            <div class="flex gap-2 items-center text-sm text-gray-500 px-2">
                <i data-lucide="info" class="w-4 h-4"></i>
                <span>Hiển thị ${filteredShowtimes.length} / ${state.showtimes.length} suất chiếu</span>
            </div>

            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-h-[600px] overflow-y-auto scrollbar-thin">
                <table class="w-full text-left">
                    <thead class="bg-gray-50 text-gray-600 text-xs uppercase sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th class="px-6 py-4">Phim</th>
                            <th class="px-6 py-3">Phòng</th>
                            <th class="px-6 py-3">Thời Gian</th>
                            <th class="px-6 py-3 text-right">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${filteredShowtimes.map(s => {
        let isPast = false;
        if (s.NgayChieu && s.GioBatDau) {
            const dateStr = safeIsoDate(s.NgayChieu);
            const timeStr = s.GioBatDau.split(':').slice(0, 2).join(':');
            const showDateTime = new Date(`${dateStr}T${timeStr}:00`);
            if (showDateTime < new Date()) {
                isPast = true;
            }
        }
        const timeColorClass = isPast ? 'text-red-600' : 'text-green-600';

        return `
                            <tr class="hover:bg-gray-50 transition-colors italic">
                                <td class="px-6 py-4">
                                    <div class="font-bold text-gray-900 uppercase">${s.TenPhim}</div>
                                </td>
                                <td class="px-6 py-4 text-amber-600 font-bold">${s.TenPhong}</td>
                                <td class="px-6 py-4">
                                    <div class="text-sm font-medium uppercase ${timeColorClass}">
                                        ${getVietWeekday(new Date(s.NgayChieu))}, ${new Date(s.NgayChieu).toLocaleDateString('vi-VN')}
                                    </div>
                                    <!-- Trích xuất chính xác Giờ và Phút từ CSDL -->
                                    <div class="text-xs font-bold ${timeColorClass}">
                                        ${s.GioBatDau ? s.GioBatDau.split(':').slice(0, 2).join(':') : '??:??'} 
                                        &rarr; 
                                        ${s.GioKetThuc ? s.GioKetThuc.split(':').slice(0, 2).join(':') : '??:??'}
                                    </div>
                                </td>
                                <td class="px-6 py-4 text-right space-x-2">
                                    <button onclick="window.editShowtime(${s.MaSuat})" class="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors">
                                        <i data-lucide="edit" class="w-4 h-4"></i>
                                    </button>
                                    <button onclick="window.deleteShowtime(${s.MaSuat})" class="text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors">
                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                    </button>
                                </td>
                            </tr>
                            `;
    }).join('')}
                        ${filteredShowtimes.length === 0 ? `<tr><td colspan="4" class="p-12 text-center text-gray-400 italic">Không có suất chiếu nào phù hợp bộ lọc</td></tr>` : ''}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('st-movie-filter').addEventListener('change', (e) => {
        state.showtimeFilterMovieId = e.target.value;
        renderShowtimes();
    });

    document.getElementById('st-room-filter').addEventListener('change', (e) => {
        state.showtimeFilterRoomId = e.target.value;
        renderShowtimes();
    });

    document.getElementById('st-date-filter').addEventListener('change', (e) => {
        state.showtimeFilterDate = e.target.value || 'all';
        renderShowtimes();
    });

    const clearDateBtn = document.getElementById('btn-clear-date');
    if (clearDateBtn) {
        clearDateBtn.addEventListener('click', () => {
            state.showtimeFilterDate = 'all';
            renderShowtimes();
        });
    }

    document.getElementById('st-time-status-filter').addEventListener('change', (e) => {
        state.showtimeFilterTimeStatus = e.target.value;
        renderShowtimes();
    });

    document.getElementById('btn-add-showtime').addEventListener('click', () => showShowtimeForm());
    createIcons(iconConfig);
}

function showShowtimeForm(showtime = null) {
    const isEdit = !!showtime;
    showModal(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-4 uppercase tracking-wider">${isEdit ? 'Sửa Suất Chiếu' : 'Tạo Suất Chiếu Mới'}</h3>
            <form id="showtime-form" class="space-y-4">
                <div>
                    <label class="block text-sm mb-1 text-gray-700 font-bold">Phim</label>
                    <select name="MaPhim" class="w-full border rounded-lg p-2 text-gray-900 bg-white focus:ring-2 focus:ring-amber-500 outline-none">
                        ${state.movies
            .filter(m => m.TrangThai === 'Đang chiếu' || (isEdit && m.MaPhim === showtime.MaPhim))
            .map(m => `<option value="${m.MaPhim}" ${isEdit && showtime.MaPhim === m.MaPhim ? 'selected' : ''}>${m.TenPhim}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm mb-1 text-gray-700 font-bold">Phòng</label>
                    <select name="MaPhong" class="w-full border rounded-lg p-2 text-gray-900 bg-white focus:ring-2 focus:ring-amber-500 outline-none">
                        ${state.rooms.map(r => `<option value="${r.MaPhong}" ${isEdit && showtime.MaPhong === r.MaPhong ? 'selected' : ''}>${r.TenPhong}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm mb-1 text-gray-700 font-bold">Ngày Chiếu</label>
                    <input name="NgayChieu" type="date" value="${safeIsoDate(isEdit ? showtime.NgayChieu : null)}" required class="w-full border rounded-lg p-2 text-gray-900 bg-white focus:ring-2 focus:ring-amber-500 outline-none">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm mb-1 text-gray-700 font-bold">Giờ Bắt Đầu</label>
                        <input name="GioBatDau" type="time" value="${isEdit ? showtime.GioBatDau : ''}" required class="w-full border rounded-lg p-2 text-gray-900 bg-white focus:ring-2 focus:ring-amber-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-sm mb-1 text-gray-700 font-bold">Giờ Kết Thúc</label>
                        <input name="GioKetThuc" type="time" value="${isEdit ? showtime.GioKetThuc : ''}" required class="w-full border rounded-lg p-2 text-gray-900 bg-white focus:ring-2 focus:ring-amber-500 outline-none">
                    </div>
                </div>
                <div class="flex justify-end gap-2 mt-6">
                    <button type="button" onclick="window.hideModal()" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                    <button type="submit" class="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors shadow-md">${isEdit ? 'Lưu Thay Đổi' : 'Tạo Suất'}</button>
                </div>
            </form>
        </div>
    `);

    // --- LOGIC TỰ ĐỘNG TÍNH GIỜ KẾT THÚC ---
    const maPhimSelect = document.querySelector('#showtime-form select[name="MaPhim"]');
    const gioBatDauInput = document.querySelector('#showtime-form input[name="GioBatDau"]');
    const gioKetThucInput = document.querySelector('#showtime-form input[name="GioKetThuc"]');

    const updateEndTime = () => {
        if (gioBatDauInput && gioKetThucInput && maPhimSelect && gioBatDauInput.value) {
            const movieId = parseInt(maPhimSelect.value);
            const movie = state.movies.find(m => m.MaPhim === movieId);
            // Gọi hàm calculateEndTime đã được viết bên api.js
            if (movie && typeof window.calculateEndTime === 'function') {
                gioKetThucInput.value = window.calculateEndTime(gioBatDauInput.value, movie.ThoiLuong);
            }
        }
    };

    if (gioBatDauInput) gioBatDauInput.addEventListener('input', updateEndTime);
    if (maPhimSelect) maPhimSelect.addEventListener('change', updateEndTime);
    // ---------------------------------------

    document.getElementById('showtime-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        data.MaPhim = parseInt(data.MaPhim);
        data.MaPhong = parseInt(data.MaPhong);
        try {
            if (isEdit) {
                await axios.put(`/api/showtimes/${showtime.MaSuat}`, data);
            } else {
                await axios.post('/api/showtimes', data);
            }
            hideModal();
            renderPage();
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
    });
}

window.editShowtime = (id) => {
    const s = state.showtimes.find(x => x.MaSuat == id);
    if (s) showShowtimeForm(s);
};

window.deleteShowtime = async (id) => {
    if (confirm('Xóa suất chiếu này?')) {
        try {
            await axios.delete(`/api/showtimes/${id}`);
            renderPage();
        } catch (err) {
            const msg = err.response?.data?.error || err.message;
            alert('Lỗi: ' + msg);
        }
    }
};

// --- QUẢN LÝ NGƯỜI DÙNG / KHÁCH HÀNG (CUSTOMERS SECTION) ---
async function renderCustomers() {
    const [custRes, typesRes] = await Promise.all([
        axios.get('/api/customers'),
        axios.get('/api/customer-types')
    ]);
    state.customers = custRes.data;
    state.customerTypes = typesRes.data || [];

    appElement.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h2 class="text-2xl font-bold text-gray-800">Quản Lý Người Dùng</h2>
                <button id="btn-add-customer" class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-md">
                    <i data-lucide="plus" class="w-5 h-5"></i> Thêm Người Dùng
                </button>
            </div>
            
            <!-- Bảng hiển thị danh sách người dùng với thanh cuộn -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-h-[600px] overflow-y-auto scrollbar-thin">
                <table class="w-full text-left">
                    <thead class="bg-gray-50 text-gray-600 text-xs uppercase sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th class="px-6 py-4 font-bold">Hình Ảnh</th>
                            <th class="px-6 py-4 font-bold">Họ Tên / Email</th>
                            <th class="px-6 py-3 font-bold">Số Điện Thoại</th>
                            <th class="px-6 py-3 font-bold">Tài Khoản</th>
                            <th class="px-6 py-3 text-right font-bold">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 italic">
                        ${state.customers.map(c => {
                            const avatarSrc = customerAvatarUrl(c.HinhAnh, c.Ten);
                            const avatarFallback = customerAvatarUrl('', c.Ten);
                            return `
                            <tr class="hover:bg-amber-50/30 transition-colors">
                                <td class="px-6 py-4">
                                    <img src="${avatarSrc}" alt="${c.Ten}" class="w-10 h-10 object-cover rounded-full border border-gray-200" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${avatarFallback}'">
                                </td>
                                <td class="px-6 py-4">
                                    <div class="font-bold text-gray-900 uppercase">${c.Ten}</div>
                                    <div class="text-xs text-blue-600 font-bold">${c.Email}</div>
                                </td>
                                <td class="px-6 py-4 text-gray-600 font-bold">${c.SDT}</td>
                                <td class="px-6 py-4">
                                    <div class="text-xs font-mono text-gray-500 uppercase font-bold">${c.TenDangNhap}</div>
                                    <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${c.TenLoaiUser === 'Admin' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}">
                                        ${c.TenLoaiUser}
                                    </span>
                                </td>
                                <td class="px-6 py-4 text-right space-x-2">
                                    <button onclick="window.editCustomer(${c.MaKH})" class="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors" title="Sửa">
                                        <i data-lucide="edit" class="w-4 h-4"></i>
                                    </button>
                                    <button onclick="window.deleteCustomer(${c.MaKH})" class="text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors" title="Xóa">
                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    document.getElementById('btn-add-customer').addEventListener('click', () => showCustomerForm());
    createIcons(iconConfig);
}

function showCustomerForm(customer = null) {
    const isEdit = !!customer;
    showModal(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-4 uppercase">${isEdit ? 'Sửa Người Dùng' : 'Thêm Người Dùng Mới'}</h3>
            <form id="customer-form" class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                    <label class="block text-sm font-bold text-gray-700 mb-1">Họ Tên</label>
                    <input type="text" name="Ten" value="${isEdit ? customer.Ten : ''}" required class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none">
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">Tên Đăng Nhập</label>
                    <input type="text" name="TenDangNhap" value="${isEdit ? customer.TenDangNhap : ''}" required class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none">
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">Mật Khẩu</label>
                    <input type="password" name="MatKhau" value="${isEdit ? customer.MatKhau : ''}" required class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none">
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">Email</label>
                    <input type="email" name="Email" value="${isEdit ? customer.Email : ''}" required class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none">
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">Số Điện Thoại</label>
                    <input type="text" name="SDT" value="${isEdit ? customer.SDT : ''}" required class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none">
                </div>
                <div class="col-span-2">
                    <label class="block text-sm font-bold text-gray-700 mb-1">Hình Ảnh (URL)</label>
                    <input type="text" name="HinhAnh" value="${isEdit && customer.HinhAnh ? customer.HinhAnh : ''}" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Nhập link hình ảnh...">
                </div>
                <div class="col-span-2">
                    <label class="block text-sm font-bold text-gray-700 mb-1">Loại Người Dùng</label>
                    <select name="MaLoaiUser" required class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none">
                        ${(state.customerTypes || []).map(t => `<option value="${t.MaLoaiUser}" ${isEdit && customer.MaLoaiUser === t.MaLoaiUser ? 'selected' : ''}>${t.TenLoai}</option>`).join('')}
                    </select>
                </div>
                <div class="col-span-2 flex justify-end gap-3 mt-6">
                    <button type="button" onclick="window.hideModal()" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
                    <button type="submit" class="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors shadow-md">${isEdit ? 'Lưu' : 'Thêm'}</button>
                </div>
            </form>
        </div>
    `);

    document.getElementById('customer-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        data.MaLoaiUser = parseInt(data.MaLoaiUser);
        try {
            if (isEdit) await axios.put(`/api/customers/${customer.MaKH}`, data);
            else await axios.post('/api/customers', data);
            hideModal(); renderPage();
        } catch (err) { alert('Lỗi: ' + err.message); }
    });
}

window.editCustomer = (id) => {
    const c = state.customers.find(x => x.MaKH == id);
    if (c) showCustomerForm(c);
};

window.deleteCustomer = async (id) => {
    if (confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) {
        try {
            await axios.delete(`/api/customers/${id}`);
            renderPage();
        } catch (err) {
            const msg = err.response?.data?.error || err.message;
            alert('Lỗi: ' + msg);
        }
    }
};

// --- QUẢN LÝ HÓA ĐƠN (INVOICES SECTION) ---
async function renderInvoices() {
    try {
        const [invRes, custRes, showRes, seatRes, seatTypeRes, payRes] = await Promise.all([
            axios.get('/api/invoices'),
            axios.get('/api/customers'),
            axios.get('/api/showtimes'),
            axios.get('/api/seats'),
            axios.get('/api/seat-types'),
            axios.get('/api/payments')
        ]);
        state.invoices = Array.isArray(invRes.data) ? invRes.data : [];
        state.customers = Array.isArray(custRes.data) ? custRes.data : [];
        state.showtimes = Array.isArray(showRes.data) ? showRes.data : [];
        state.seats = Array.isArray(seatRes.data) ? seatRes.data : [];
        state.seatTypes = Array.isArray(seatTypeRes.data) ? seatTypeRes.data : [];
        state.payments = Array.isArray(payRes.data) ? payRes.data : [];
    } catch (err) {
        console.error("Lỗi khi tải dữ liệu hóa đơn:", err);
        state.invoices = [];
        state.customers = [];
        state.showtimes = [];
        state.seats = [];
        state.seatTypes = [];
        state.payments = [];
    }

    appElement.innerHTML = `
        <div class="space-y-6">
            <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <h2 class="text-2xl font-bold text-gray-800">Lịch Sử Hóa Đơn</h2>
                <button id="btn-add-invoice" class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-md">
                    <i data-lucide="plus" class="w-5 h-5"></i> Tạo Hóa Đơn
                </button>
            </div>
            
            <div class="bg-white rounded-xl shadow overflow-hidden border border-gray-100 max-h-[600px] overflow-y-auto scrollbar-thin">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-50 text-gray-600 text-xs uppercase sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th class="px-6 py-4">Mã HD</th>
                            <th class="px-6 py-3">Khách Hàng</th>
                            <th class="px-6 py-3">Ngày Đặt</th>
                            <th class="px-6 py-3">Tổng Tiền</th>
                            <th class="px-6 py-3 text-right">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${state.invoices.map(i => `
                            <tr class="hover:bg-amber-50/30 transition-colors">
                                <td class="px-6 py-4 font-bold text-amber-700">#${i.MaHoaDon}</td>
                                <td class="px-6 py-4 font-medium text-gray-700">${i.TenKhachHang}</td>
                                <td class="px-6 py-4 text-gray-500 font-medium">${new Date(i.NgayDat).toLocaleString('vi-VN')}</td>
                                <td class="px-6 py-4 font-bold text-red-600">${formatVND(i.TongTien)}</td>
                                <td class="px-6 py-4 text-right space-x-1">
                                    <button onclick="window.viewInvoiceDetail(${i.MaHoaDon})" class="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors" title="Xem Chi Tiết">
                                        <i data-lucide="receipt" class="w-4 h-4"></i>
                                    </button>
                                    <button onclick="window.editInvoice(${i.MaHoaDon})" class="text-amber-600 hover:bg-amber-50 p-2 rounded-full transition-colors" title="Sửa">
                                        <i data-lucide="edit" class="w-4 h-4"></i>
                                    </button>
                                    <button onclick="window.deleteInvoice(${i.MaHoaDon})" class="text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors" title="Xóa">
                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    document.getElementById('btn-add-invoice').addEventListener('click', () => showInvoiceForm());
    createIcons(iconConfig);
}

async function showInvoiceForm(invoice = null) {
    const isEdit = !!invoice;
    let details = [];
    if (isEdit) {
        try {
            const res = await axios.get(`/api/invoice-details/${invoice.MaHoaDon}`);
            details = res.data;
        } catch (err) {
            console.error("Lỗi tải chi tiết hóa đơn để sửa:", err);
        }
    }

    const currentMaSuat = isEdit && details.length > 0 ? details[0].MaSuat : "";
    showModal(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-4 uppercase text-amber-600 flex items-center gap-2">
                <i data-lucide="receipt" class="w-6 h-6"></i> ${isEdit ? 'Sửa Hóa Đơn #' + invoice.MaHoaDon : 'Mua Vé & Thanh Toán'}
            </h3>
            <form id="invoice-form" class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1 uppercase text-xs">Khách Hàng</label>
                        <select name="MaKH" required class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm">
                            ${state.customers.map(c => `<option value="${c.MaKH}" ${isEdit && invoice.MaKH === c.MaKH ? 'selected' : ''}>${c.Ten}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1 uppercase text-xs">Suất Chiếu</label>
                        <select id="select-suat-chieu" name="MaSuat" required class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm">
                            <option value="">-- Chọn Suất Chiếu --</option>
                            ${(state.showtimes || []).map(s => {
        const movieName = s.TenPhim || 'Phim ?';
        const roomName = s.TenPhong || 'Phòng ?';
        const dateStr = s.NgayChieu || '';
        const selected = isEdit && currentMaSuat === s.MaSuat ? 'selected' : '';
        return `<option value="${s.MaSuat}" ${selected}>${movieName} - ${roomName} (${dateStr} ${s.GioBatDau || ''})</option>`;
    }).join('')}
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1 uppercase text-xs">Số Lượng Ghế / Vé</label>
                        <input type="number" id="input-so-luong" name="SoLuong" value="${isEdit ? details.length : '1'}" min="1" max="10" required class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm">
                    </div>
                </div>

                <div id="seat-selection-container" class="space-y-3 pt-2">
                    <!-- Danh sách chọn ghế sẽ hiện ở đây -->
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1 uppercase text-xs">Phương Thức TT</label>
                        <select name="PhuongThuc" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm">
                            ${state.payments.map(p => `<option value="${p.TenPhuongThuc}" ${isEdit && invoice.PhuongThuc === p.TenPhuongThuc ? 'selected' : ''}>${p.TenPhuongThuc}</option>`).join('')}
                            ${state.payments.length === 0 ? `<option value="Tiền mặt" ${isEdit && invoice.PhuongThuc === 'Tiền mặt' ? 'selected' : ''}>Tiền mặt (Mặc định)</option>` : ''}
                        </select>
                    </div>
                </div>

                <div class="bg-gray-900 p-4 rounded-lg border border-gray-800 flex justify-between items-center mt-4 shadow-inner">
                    <div class="flex flex-col">
                        <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-white/50">Thời gian đặt</span>
                        <input type="datetime-local" name="NgayDat" value="${isEdit ? new Date(invoice.NgayDat).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16) : new Date().toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16)}" required class="bg-transparent font-bold text-white outline-none text-sm">
                    </div>
                    <div class="text-right">
                        <span class="text-[10px] font-bold text-white/50 uppercase tracking-widest block">Thành tiền tạm tính</span>
                        <span id="display-tong-tien" class="text-2xl font-black text-amber-400">${isEdit ? invoice.TongTien.toLocaleString() : '0'}đ</span>
                    </div>
                </div>

                <div class="flex justify-end gap-3 mt-6">
                    <button type="button" onclick="window.hideModal()" class="px-5 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                    <button type="submit" class="px-8 py-2 text-sm font-bold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all shadow-lg active:scale-95 text-xs uppercase tracking-widest">${isEdit ? 'Cập Nhật' : 'Xác Nhận & Xuất Hóa Đơn'}</button>
                </div>
            </form>
        </div>
    `);

    const suatSelect = document.getElementById('select-suat-chieu');
    const soLuongInput = document.getElementById('input-so-luong');
    const seatContainer = document.getElementById('seat-selection-container');
    const tongTienDisplay = document.getElementById('display-tong-tien');

    let bookedSeats = [];
    let initialSeats = isEdit ? details.map(d => d.MaGhe) : [];

    const calculateTotal = () => {
        const qty = parseInt(soLuongInput.value) || 0;
        let total = 0;
        for (let i = 0; i < qty; i++) {
            const select = document.querySelector(`select[name="MaGhe_${i}"]`);
            if (select && select.value) {
                const seatId = parseInt(select.value);
                const seat = state.seats.find(g => g.MaGhe === seatId);
                total += (seat?.GiaGhe || 0);
            }
        }
        tongTienDisplay.innerText = total.toLocaleString() + 'đ';
    };

    const renderSeatSelectors = async (isFirstLoad = false) => {
        const maSuat = parseInt(suatSelect.value);
        const qty = parseInt(soLuongInput.value) || 0;

        if (!maSuat || qty <= 0) {
            seatContainer.innerHTML = '<p class="text-center text-xs text-gray-400 py-4 border-2 border-dashed border-gray-100 rounded-lg">Vui lòng chọn suất chiếu và số lượng để chọn ghế</p>';
            return;
        }

        try {
            const res = await axios.get(`/api/booked-seats/${maSuat}`);
            bookedSeats = res.data;
            if (isEdit && maSuat === currentMaSuat) {
                bookedSeats = bookedSeats.filter(sId => !initialSeats.includes(sId));
            }
        } catch (e) { bookedSeats = []; }

        const showtime = state.showtimes.find(s => s.MaSuat === maSuat);
        const roomSeats = state.seats.filter(g => g.MaPhong === showtime?.MaPhong);

        let html = '<h4 class="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2"><i data-lucide="armchair" class="w-3 h-3"></i> Phân bổ ghế ngồi</h4><div class="grid grid-cols-2 gap-2">';
        for (let i = 0; i < qty; i++) {
            const preSelectedMaGhe = (isFirstLoad && isEdit && details[i]) ? details[i].MaGhe : "";
            html += `
                <div>
                    <select name="MaGhe_${i}" required class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-xs bg-white h-10">
                        <option value="">-- Ghế ${i + 1} --</option>
                        ${roomSeats.map(g => {
                const isBooked = bookedSeats.includes(g.MaGhe);
                const isSelected = preSelectedMaGhe === g.MaGhe;
                return `<option value="${g.MaGhe}" ${isSelected ? 'selected' : ''} ${isBooked ? 'disabled class="text-red-300 bg-red-50"' : ''}>${g.SoGhe} (${g.TenLoaiGhe} - ${g.GiaGhe.toLocaleString()}đ)${isBooked ? ' [Đã đặt]' : ''}</option>`;
            }).join('')}
                    </select>
                </div>
            `;
        }
        html += '</div>';
        seatContainer.innerHTML = html;
        createIcons(iconConfig);

        for (let i = 0; i < qty; i++) {
            const select = document.querySelector(`select[name="MaGhe_${i}"]`);
            if (select) select.addEventListener('change', calculateTotal);
        }
        calculateTotal();
    };

    suatSelect.addEventListener('change', () => renderSeatSelectors(false));
    soLuongInput.addEventListener('input', () => renderSeatSelectors(false));

    await renderSeatSelectors(true);

    document.getElementById('invoice-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const rawData = Object.fromEntries(formData.entries());

        const maSuat = parseInt(rawData.MaSuat);
        const showtime = state.showtimes.find(s => s.MaSuat === maSuat);
        const qty = parseInt(rawData.SoLuong);

        const MaGheList = [];
        let finalTotal = 0;
        for (let i = 0; i < qty; i++) {
            const val = rawData[`MaGhe_${i}`];
            if (val) {
                const seatId = parseInt(val);
                MaGheList.push(seatId);
                const seat = state.seats.find(g => g.MaGhe === seatId);
                finalTotal += (seat?.GiaGhe || 0);
            }
        }

        if (MaGheList.length < qty) return alert('Hệ thống yêu cầu bạn chọn đủ số lượng ghế đã đặt!');
        if (new Set(MaGheList).size !== MaGheList.length) return alert('Bạn không thể chọn một ghế cho nhiều vé trong cùng một hóa đơn!');

        const submitData = {
            MaKH: parseInt(rawData.MaKH),
            NgayDat: rawData.NgayDat,
            MaPhim: showtime ? showtime.MaPhim : 0,
            MaSuat: maSuat,
            MaGheList,
            GiaVe: 0,
            TongTien: finalTotal,
            PhuongThuc: rawData.PhuongThuc
        };

        try {
            if (isEdit) {
                await axios.put(`/api/invoices/${invoice.MaHoaDon}`, submitData);
            } else {
                await axios.post('/api/invoices', submitData);
            }
            hideModal();
            renderInvoices();
        } catch (err) { alert('Thao tác thất bại: ' + (err.response?.data?.error || err.message)); }
    });
}

window.editInvoice = (id) => {
    const i = state.invoices.find(x => x.MaHoaDon == id);
    if (i) showInvoiceForm(i);
};

window.deleteInvoice = async (id) => {
    if (confirm('Xóa hóa đơn này? Thao tác này sẽ xóa cả chi tiết hóa đơn.')) {
        try {
            await axios.delete(`/api/invoices/${id}`);
            renderPage();
        } catch (err) {
            const msg = err.response?.data?.error || err.message;
            alert('Lỗi: ' + msg);
        }
    }
};

window.viewInvoiceDetail = async (id) => {
    try {
        const [detailRes, invRes] = await Promise.all([
            axios.get(`/api/invoice-details/${id}`),
            axios.get('/api/invoices')
        ]);
        const details = detailRes.data;
        const invoice = (Array.isArray(invRes.data) ? invRes.data : []).find(i => i.MaHoaDon == id);
        const tickets = details.filter(d => d.MaGhe);
        const combos = details.filter(d => d.MaSP);

        const formatTime = (t) => {
            if (!t) return '';
            const s = t.toString();
            return s.includes('T') ? s.substring(11, 16) : s.substring(0, 5);
        };

        const ticketRows = tickets.map(d => {
            const showDate = d.NgayChieu ? new Date(d.NgayChieu).toLocaleDateString('vi-VN') : '-';
            const timeRange = `${formatTime(d.GioBatDau)} - ${formatTime(d.GioKetThuc)}`;
            return `
                <div class="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <div class="flex justify-between items-start gap-4">
                        <div class="flex-1">
                            <p class="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Vé phim #${d.MaCT || '-'}</p>
                            <h4 class="font-bold text-gray-900 uppercase">${d.TenPhim || 'Phim'}</h4>
                            <p class="text-sm text-gray-600 mt-1">Phòng: <span class="font-semibold">${d.TenPhong || '-'}</span> | Ghế: <span class="font-bold text-amber-600">${d.SoGhe || '-'}</span></p>
                            <p class="text-sm text-gray-500">Suất: ${showDate} | ${timeRange}</p>
                            <p class="text-xs text-gray-400 mt-1">Mã suất: ${d.MaSuat || '-'} | Mã ghế: ${d.MaGhe || '-'}</p>
                        </div>
                        <p class="font-bold text-gray-900 whitespace-nowrap">${formatVND(d.GiaVe)}</p>
                    </div>
                </div>
            `;
        }).join('');

        const comboRows = combos.map(d => {
            const unitPrice = Number(d.GiaSP || d.GiaNiemYet) || 0;
            const qty = Number(d.SoLuongSP) || 0;
            const lineTotal = unitPrice * qty;
            return `
                <div class="bg-amber-50/50 p-4 rounded-lg border border-amber-100">
                    <div class="flex justify-between items-start gap-4">
                        <div class="flex-1">
                            <p class="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Sản phẩm #${d.MaCT || '-'}</p>
                            <h4 class="font-bold text-gray-900">${d.TenSP || 'Combo / Bắp nước'}</h4>
                            <p class="text-sm text-gray-600 mt-1">Số lượng: <span class="font-bold">${qty}</span> × ${formatVND(unitPrice)}</p>
                            <p class="text-xs text-gray-400 mt-1">Mã SP: ${d.MaSP || '-'}</p>
                        </div>
                        <p class="font-bold text-gray-900 whitespace-nowrap">${formatVND(lineTotal)}</p>
                    </div>
                </div>
            `;
        }).join('');

        const lineSum = details.reduce((sum, d) => {
            if (d.MaGhe) return sum + (Number(d.GiaVe) || 0);
            if (d.MaSP) {
                const unit = Number(d.GiaSP || d.GiaNiemYet) || 0;
                return sum + unit * (Number(d.SoLuongSP) || 0);
            }
            return sum;
        }, 0);
        const total = invoice?.TongTien != null ? Number(invoice.TongTien) : lineSum;

        showModal(`
            <div class="p-8 max-h-[80vh] overflow-y-auto">
                <div class="border-b-2 border-dashed border-gray-200 pb-4 mb-4 text-center">
                    <h3 class="text-2xl font-black text-gray-900 uppercase">Chi Tiết Hóa Đơn #${id}</h3>
                    <p class="text-gray-500 text-sm mt-1">CINEMA MANAGER — Bảng ChiTietHoaDon</p>
                    ${invoice ? `<p class="text-xs text-gray-400 mt-2">Khách: ${invoice.TenKhachHang || '-'} | Thanh toán: ${invoice.PhuongThuc || '-'}</p>` : ''}
                </div>
                <div class="space-y-3">
                    ${ticketRows || '<p class="text-gray-500 text-sm text-center py-4">Không có dòng vé phim.</p>'}
                    ${comboRows}
                    ${details.length === 0 ? '<p class="text-gray-500 text-sm text-center py-4">Hóa đơn chưa có chi tiết.</p>' : ''}
                </div>
                <div class="mt-8 border-t-2 border-dashed border-gray-200 pt-4 flex justify-between items-center">
                    <span class="text-lg font-bold text-gray-600">Tổng cộng</span>
                    <span class="text-2xl font-black text-red-600">${formatVND(total)}</span>
                </div>
                <div class="mt-8 flex justify-center">
                    <button onclick="window.hideModal()" class="bg-gray-900 text-white px-8 py-2 rounded-full hover:bg-gray-800 transition-colors uppercase font-bold tracking-widest text-sm">Đóng</button>
                </div>
            </div>
        `, 'max-w-3xl');
    } catch (err) {
        alert('Lỗi tải chi tiết: ' + err.message);
    }
};

// --- QUẢN LÝ THANH TOÁN (PAYMENTS SECTION) ---
async function renderPayments() {
    const payRes = await axios.get('/api/payments');
    state.payments = payRes.data;

    appElement.innerHTML = `
        <div class="space-y-6">
            <div class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h2 class="text-2xl font-bold text-gray-800 uppercase tracking-tighter">Phương Thức Thanh Toán</h2>
                <button id="btn-add-payment" class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-md">
                    <i data-lucide="plus" class="w-5 h-5"></i> Thêm Phương Thức
                </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-h-[700px] overflow-y-auto scrollbar-thin p-1">
                ${state.payments.map(p => `
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center group hover:shadow-lg transition-all border-b-4 border-b-transparent hover:border-b-amber-500 relative">
                        <div class="w-24 h-24 mb-4 rounded-2xl overflow-hidden shadow-inner bg-gray-50 flex items-center justify-center p-3 group-hover:scale-105 transition-transform">
                            <img src="${p.HinhAnh || 'https://cdn-icons-png.flaticon.com/512/2331/2331717.png'}" alt="${p.TenPhuongThuc}" class="max-w-full max-h-full object-contain" onerror="this.src='https://cdn-icons-png.flaticon.com/512/2331/2331717.png'">
                        </div>
                        <h4 class="font-black text-gray-900 text-lg uppercase tracking-tight">${p.TenPhuongThuc}</h4>
                        
                        <div class="mt-4 flex gap-2">
                            <button onclick="window.editPayment(${p.MaThanhToan})" class="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-blue-100 transition-colors border border-blue-100">
                                <i data-lucide="edit" class="w-3 h-3"></i> Sửa
                            </button>
                            <button onclick="window.deletePayment(${p.MaThanhToan})" class="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-red-100 transition-colors border border-red-100">
                                <i data-lucide="trash-2" class="w-3 h-3"></i> Xóa
                            </button>
                        </div>
                    </div>
                `).join('')}
                ${state.payments.length === 0 ? `
                    <div class="col-span-full py-20 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                        <p class="text-gray-400 font-medium italic">Chưa có phương thức thanh toán nào được cấu hình.</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    document.getElementById('btn-add-payment').addEventListener('click', () => showPaymentForm());
    createIcons(iconConfig);
}

function showPaymentForm(payment = null) {
    const isEdit = !!payment;
    showModal(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-4 uppercase tracking-widest text-amber-600 flex items-center gap-2">
                <i data-lucide="wallet" class="w-6 h-6"></i> ${isEdit ? 'Sửa Phương Thức' : 'Thêm Phương Thức Mới'}
            </h3>
            <form id="payment-form" class="space-y-4">
                <div>
                    <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tên Phương Thức</label>
                    <input type="text" name="TenPhuongThuc" value="${isEdit ? payment.TenPhuongThuc : ''}" required class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm font-bold bg-gray-50 shadow-inner" placeholder="vd: Momo, Zalopay, ATM...">
                </div>
                <div>
                    <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Link Ảnh (Logo)</label>
                    <input type="text" name="HinhAnh" value="${isEdit ? payment.HinhAnh : ''}" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm font-bold bg-gray-50 shadow-inner" placeholder="https://example.com/logo.png">
                    <p class="text-[9px] text-gray-400 mt-1 italic italic leading-relaxed">Sử dụng link hình ảnh trực tuyến (PNG/JPG) để hiển thị logo đại diện cho phương thức này.</p>
                </div>
                <div class="flex justify-end gap-3 mt-8">
                    <button type="button" onclick="window.hideModal()" class="px-5 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
                    <button type="submit" class="px-8 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all shadow-lg active:scale-95 font-bold uppercase tracking-widest text-xs">${isEdit ? 'Lưu Thay Đổi' : 'Xác Nhận Thêm'}</button>
                </div>
            </form>
        </div>
    `);

    document.getElementById('payment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        try {
            if (isEdit) await axios.put(`/api/payments/${payment.MaThanhToan}`, data);
            else await axios.post('/api/payments', data);
            hideModal();
            renderPayments();
        } catch (err) { alert('Lỗi: ' + (err.response?.data?.error || err.message)); }
    });
    createIcons(iconConfig);
}

window.editPayment = (id) => {
    const p = state.payments.find(x => x.MaThanhToan == id);
    if (p) showPaymentForm(p);
};

window.deletePayment = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa phương thức thanh toán này?')) return;
    try {
        await axios.delete(`/api/payments/${id}`);
        renderPayments();
    } catch (err) { alert('Lỗi khi xóa: ' + (err.response?.data?.error || err.message)); }
};

// --- QUẢN LÝ SẢN PHẨM & LOẠI SẢN PHẨM ---
window.switchProductTab = (tab) => {
    state.currentProductTab = tab;
    renderProductsPage();
};

async function renderProductsPage() {
    state.currentProductTab = state.currentProductTab || 'products'; // 'products' or 'categories'

    const [prodRes, catRes] = await Promise.all([
        axios.get('/api/sanpham'),
        axios.get('/api/loaisp')
    ]);
    state.products = prodRes.data || [];
    state.productCategories = catRes.data || [];

    appElement.innerHTML = `
        <div class="space-y-6">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
                <h2 class="text-2xl font-bold text-gray-800">SP và Loại SP</h2>
                <div class="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                    <button type="button" onclick="window.switchProductTab('products')" class="${state.currentProductTab === 'products' ? 'bg-white shadow-sm font-bold text-amber-600' : 'text-gray-500 hover:text-gray-700'} px-4 py-2 rounded-md transition-all text-sm">Sản Phẩm</button>
                    <button type="button" onclick="window.switchProductTab('categories')" class="${state.currentProductTab === 'categories' ? 'bg-white shadow-sm font-bold text-amber-600' : 'text-gray-500 hover:text-gray-700'} px-4 py-2 rounded-md transition-all text-sm">Loại SP</button>
                </div>
            </div>
            
            <div id="product-content-area"></div>
        </div>
    `;

    const contentArea = document.getElementById('product-content-area');
    if (state.currentProductTab === 'products') {
        renderProductsTable(contentArea);
    } else {
        renderProductCategoriesTable(contentArea);
    }
}

function renderProductsTable(container) {
    container.innerHTML = `
        <div class="flex justify-end mb-4">
            <button type="button" onclick="window.showProductForm()" class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-md text-sm font-bold">
                <i data-lucide="plus" class="w-4 h-4"></i> Thêm Sản Phẩm
            </button>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-h-[600px] overflow-y-auto scrollbar-thin">
            <table class="w-full text-left">
                <thead class="bg-gray-50 text-gray-600 text-xs uppercase sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th class="px-6 py-4 font-bold">Hình Ảnh</th>
                        <th class="px-6 py-4 font-bold">Tên SP</th>
                        <th class="px-6 py-4 font-bold">Loại SP</th>
                        <th class="px-6 py-4 font-bold">Giá</th>
                        <th class="px-6 py-4 font-bold">Mô Tả</th>
                        <th class="px-6 py-4 font-bold text-right">Thao Tác</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    ${state.products.map(p => `
                        <tr class="hover:bg-amber-50/30 transition-colors">
                            <td class="px-6 py-4">
                                <img src="${p.HinhAnh || 'https://via.placeholder.com/80'}" alt="${p.TenSP}" class="w-16 h-16 object-cover rounded-lg shadow-sm border border-gray-200">
                            </td>
                            <td class="px-6 py-4 font-bold text-gray-900">${p.TenSP}</td>
                            <td class="px-6 py-4 text-sm text-gray-600 font-semibold uppercase">${p.LoaiTen || ''}</td>
                            <td class="px-6 py-4 text-amber-600 font-bold whitespace-nowrap">${formatVnd(p.Gia)}</td>
                            <td class="px-6 py-4 text-xs text-gray-500 max-w-[200px] truncate">${p.MoTa || ''}</td>
                            <td class="px-6 py-4 text-right space-x-2">
                                <button onclick="window.editProduct(${p.MaSP})" class="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors"><i data-lucide="edit" class="w-4 h-4"></i></button>
                                <button onclick="window.deleteProduct(${p.MaSP})" class="text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                            </td>
                        </tr>
                    `).join('')}
                    ${state.products.length === 0 ? '<tr><td colspan="6" class="p-8 text-center text-gray-500">Chưa có sản phẩm nào</td></tr>' : ''}
                </tbody>
            </table>
        </div>
    `;

    createIcons(iconConfig);
}

function renderProductCategoriesTable(container) {
    container.innerHTML = `
        <div class="flex justify-end mb-4">
            <button type="button" onclick="window.showProductCategoryForm()" class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-md text-sm font-bold">
                <i data-lucide="plus" class="w-4 h-4"></i> Thêm Loại SP
            </button>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-h-[600px] overflow-y-auto scrollbar-thin">
            <table class="w-full text-left">
                <thead class="bg-gray-50 text-gray-600 text-xs uppercase sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th class="px-6 py-4 font-bold w-20">ID</th>
                        <th class="px-6 py-4 font-bold">Tên Loại SP</th>
                        <th class="px-6 py-4 font-bold text-right">Thao Tác</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    ${state.productCategories.map(c => `
                        <tr class="hover:bg-amber-50/30 transition-colors">
                            <td class="px-6 py-4 font-mono text-gray-500">${c.MaLoaiSP}</td>
                            <td class="px-6 py-4 font-bold text-gray-900 uppercase">${c.TenLoaiSP}</td>
                            <td class="px-6 py-4 text-right space-x-2">
                                <button onclick="window.editProductCategory(${c.MaLoaiSP})" class="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors"><i data-lucide="edit" class="w-4 h-4"></i></button>
                                <button onclick="window.deleteProductCategory(${c.MaLoaiSP})" class="text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                            </td>
                        </tr>
                    `).join('')}
                    ${state.productCategories.length === 0 ? '<tr><td colspan="3" class="p-8 text-center text-gray-500">Chưa có loại sản phẩm nào</td></tr>' : ''}
                </tbody>
            </table>
        </div>
    `;
    createIcons(iconConfig);
}

window.showProductForm = function showProductForm(product = null) {
    const isEdit = !!product;
    showModal(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-4 uppercase">${isEdit ? 'Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}</h3>
            <form id="product-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">Tên Sản Phẩm</label>
                    <input type="text" name="TenSP" value="${isEdit ? product.TenSP : ''}" required class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">Giá (VNĐ)</label>
                        <input type="number" name="Gia" min="0" step="1000" value="${isEdit ? Math.round(Number(product.Gia) || 0) : ''}" required class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none">
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">Loại Sản Phẩm</label>
                        <select name="MaLoaiSP" required class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white">
                            ${state.productCategories.map(c => `<option value="${c.MaLoaiSP}" ${isEdit && product.MaLoaiSP == c.MaLoaiSP ? 'selected' : ''}>${c.TenLoaiSP}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">Hình Ảnh (URL)</label>
                    <input type="text" name="HinhAnh" value="${isEdit && product.HinhAnh ? product.HinhAnh : ''}" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Nhập link hình ảnh...">
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">Mô Tả</label>
                    <textarea name="MoTa" rows="3" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none resize-none">${isEdit && product.MoTa ? product.MoTa : ''}</textarea>
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button type="button" onclick="window.hideModal()" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
                    <button type="submit" class="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors shadow-md">${isEdit ? 'Lưu' : 'Thêm'}</button>
                </div>
            </form>
        </div>
    `);

    const form = document.getElementById('product-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (submitBtn.disabled) return;
        submitBtn.disabled = true;
        const data = Object.fromEntries(new FormData(e.target).entries());
        data.Gia = parseFloat(data.Gia);
        data.MaLoaiSP = parseInt(data.MaLoaiSP, 10);
        try {
            if (isEdit) await axios.put(`/api/sanpham/${product.MaSP}`, data);
            else await axios.post('/api/sanpham', data);
            hideModal();
            await renderProductsPage();
        } catch (err) {
            submitBtn.disabled = false;
            alert('Lỗi: ' + (err.response?.data?.error || err.message));
        }
    }, { once: true });
};

window.editProduct = (id) => {
    const p = state.products.find(x => x.MaSP == id);
    if (p) showProductForm(p);
};

window.deleteProduct = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return;
    try {
        await axios.delete(`/api/sanpham/${id}`);
        renderProductsPage();
    } catch (err) {
        alert('Lỗi khi xóa: ' + (err.response?.data?.error || err.message));
    }
};

window.showProductCategoryForm = function showProductCategoryForm(category = null) {
    const isEdit = !!category;
    showModal(`
        <div class="p-6">
            <h3 class="text-xl font-bold mb-4 uppercase">${isEdit ? 'Sửa Loại SP' : 'Thêm Loại SP Mới'}</h3>
            <form id="category-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">Tên Loại SP</label>
                    <input type="text" name="TenLoaiSP" value="${isEdit ? category.TenLoaiSP : ''}" required class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 outline-none">
                </div>
                <div class="flex justify-end gap-3 mt-6">
                    <button type="button" onclick="window.hideModal()" class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
                    <button type="submit" class="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors shadow-md">${isEdit ? 'Lưu' : 'Thêm'}</button>
                </div>
            </form>
        </div>
    `, 'max-w-md');

    const form = document.getElementById('category-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (submitBtn.disabled) return;
        submitBtn.disabled = true;
        const data = Object.fromEntries(new FormData(e.target).entries());
        try {
            if (isEdit) await axios.put(`/api/loaisp/${category.MaLoaiSP}`, data);
            else await axios.post('/api/loaisp', data);
            hideModal();
            await renderProductsPage();
        } catch (err) {
            submitBtn.disabled = false;
            alert('Lỗi: ' + (err.response?.data?.error || err.message));
        }
    }, { once: true });
};

window.editProductCategory = (id) => {
    const c = state.productCategories.find(x => x.MaLoaiSP == id);
    if (c) showProductCategoryForm(c);
};

window.deleteProductCategory = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa loại sản phẩm này?')) return;
    try {
        await axios.delete(`/api/loaisp/${id}`);
        renderProductsPage();
    } catch (err) {
        alert('Lỗi khi xóa: ' + (err.response?.data?.error || err.message));
    }
};

// --- KHỞI TẠO ỨNG DỤNG (APP INITIALIZATION) ---
document.getElementById('logout-btn')?.addEventListener('click', () => {
    if (confirm('Thoát hệ thống quản trị và về trang chủ?')) {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
});

renderPage();
createIcons(iconConfig);
