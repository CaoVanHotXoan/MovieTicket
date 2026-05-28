/**
 * FILE: api.js
 * Hệ thống xử lý dữ liệu tập trung: Kết nối SQL Server, Đăng nhập, Đăng ký, Đặt vé, Lịch sử, Phim & Tìm kiếm.
 */

/** Định dạng tiền VND (không thập phân) */
function formatVND(amount) {
    const n = Math.round(Number(amount) || 0);
    return n.toLocaleString('vi-VN') + ' đ';
}

// 1. XỬ LÝ ĐĂNG NHẬP
function handleLogin() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const result = await response.json();

            if (result.success) {
                const user = result.user;
                sessionStorage.setItem('currentUser', JSON.stringify(user));
                alert(`Đăng nhập thành công! Chào mừng ${user.Ten}`);

                const returnUrl = sessionStorage.getItem('returnUrl');
                if (returnUrl) {
                    sessionStorage.removeItem('returnUrl');
                    window.location.href = returnUrl;
                } else if (user.roleName.toLowerCase() === 'admin') {
                    window.location.href = '../admin.html';
                } else {
                    window.location.href = '../index.html';
                }
            } else {
                alert(result.message || "Đăng nhập thất bại!");
            }
        } catch (error) {
            console.error("Lỗi đăng nhập:", error);
            alert("Có lỗi xảy ra khi kết nối tới máy chủ!");
        }
    });
}

// 2. XỬ LÝ ĐĂNG KÝ
function handleRegister() {
    const registerForm = document.getElementById('register-form');
    if (!registerForm) return;

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value.trim();
        const password = document.getElementById('reg-password').value;

        if (password.length < 8) {
            alert("Mật khẩu phải có ít nhất 8 kí tự!");
            return;
        }

        try {
            const newUser = {
                Ten: username, TenDangNhap: username, MatKhau: password,
                Email: username.includes('@') ? username : "",
                SDT: !username.includes('@') ? username : "",
                MaLoaiUser: 2
            };

            const response = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });

            if (response.ok) {
                alert("Đăng ký thành công! Bạn hiện là Customer.");
                registerForm.style.display = 'none';
                document.getElementById('login-form').style.display = 'block';
            } else {
                const err = await response.json();
                alert("Lỗi đăng ký: " + (err.error || "Không xác định"));
            }
        } catch (error) {
            console.error("Lỗi đăng ký:", error);
        }
    });
}

// 2.1 CHUYỂN ĐỔI QUA LẠI GIỮA ĐĂNG NHẬP VÀ ĐĂNG KÝ
function handleFormSwitching() {
    const showRegisterBtn = document.getElementById('show-register-btn');
    const showLoginBtn = document.getElementById('show-login-btn');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (showRegisterBtn && loginForm && registerForm) {
        showRegisterBtn.addEventListener('click', () => {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
        });
    }

    if (showLoginBtn && loginForm && registerForm) {
        showLoginBtn.addEventListener('click', () => {
            registerForm.style.display = 'none';
            loginForm.style.display = 'block';
        });
    }
}

// 3. XỬ LÝ ĐĂNG XUẤT
function handleLogout() {
    // Chú thích: Chỉ kích hoạt đăng xuất khi bấm nút logout-btn trong trang Profile
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            const currentUser = sessionStorage.getItem('currentUser');
            // Nếu đang có người dùng đăng nhập thì mới xử lý đăng xuất
            if (currentUser) {
                e.preventDefault();
                if (confirm('Bạn có chắc chắn muốn thoát khỏi tài khoản này không?')) {
                    sessionStorage.removeItem('currentUser');
                    alert('Đã thoát tài khoản!');

                    // Chú thích: Fix lỗi chuyển hướng sai đường dẫn khi ở trong các thư mục con
                    // Kiểm tra xem trang hiện tại có nằm trong thư mục con hay không (dựa trên pathname)
                    const path = window.location.pathname;
                    const isSubfolder = path.includes('/Login/') ||
                        path.includes('/ChiTietPhim/') ||
                        path.includes('/Phim/') ||
                        path.includes('/DatVe/') ||
                        path.includes('/LichSu/') ||
                        path.includes('/Information_AboutUs/') ||
                        path.includes('/Profile/');

                    // Nếu ở thư mục con thì cần ../ để ra ngoài rồi vào Login, nếu ở root thì vào trực tiếp Login/
                    window.location.href = isSubfolder ? '../Login/Login.html' : 'Login/Login.html';
                }
            }
        });
    }
}

// 3.1 CẬP NHẬT GIAO DIỆN KHI ĐÃ ĐĂNG NHẬP
function updateAuthUI() {
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    const loginIcon = document.querySelector('.login-icon');

    // Xóa nút admin cũ nếu tồn tại để tránh tạo trùng lặp khi hàm này chạy lại nhiều lần
    const oldAdminBtn = document.querySelector('.admin-link-btn');
    if (oldAdminBtn) oldAdminBtn.remove();

    if (loginIcon) {
        // Xác định đường dẫn tương đối chính xác đến file admin.html tùy thuộc vào thư mục trang hiện tại
        const pathName = window.location.pathname;
        const isSubfolder = pathName.includes('/Login/') ||
            pathName.includes('/ChiTietPhim/') ||
            pathName.includes('/Phim/') ||
            pathName.includes('/DatVe/') ||
            pathName.includes('/LichSu/') ||
            pathName.includes('/Information_AboutUs/') ||
            pathName.includes('/Profile/');

        if (user) {
            // Nếu đã đăng nhập: Đổi title thành tên người dùng và trỏ đến trang cá nhân
            loginIcon.title = `Thông tin cá nhân (${user.Ten})`;
            loginIcon.style.color = '#ff3d49'; // Đổi màu icon sang đỏ để nhận biết
            loginIcon.href = isSubfolder ? '../Profile/Profile.html' : 'Profile/Profile.html';

            // KIỂM TRA QUYỀN ADMIN: Nếu tài khoản đăng nhập thuộc loại Admin (MaLoaiUser === 1 hoặc roleName === "Admin")
            const role = user.roleName ? user.roleName.toLowerCase() : '';
            if (role === 'admin' || user.MaLoaiUser === 1) {
                // Tạo thẻ <a> làm nút điều hướng sang trang admin.html
                const adminBtn = document.createElement('a');
                adminBtn.className = 'admin-link-btn';
                adminBtn.title = "Trang quản lý hệ thống (Admin)";

                adminBtn.href = isSubfolder ? '../admin.html' : 'admin.html';

                // Sử dụng icon khiên bảo mật Font Awesome cực kỳ chuyên nghiệp
                adminBtn.innerHTML = '<i class="fa-solid fa-user-shield"></i>';

                // Chèn nút Admin ngay bên trái của icon đăng nhập/đăng xuất
                loginIcon.parentElement.insertBefore(adminBtn, loginIcon);
            }
        } else {
            // Nếu chưa đăng nhập: Trả về trạng thái mặc định và trỏ tới trang đăng nhập
            loginIcon.title = "Đăng nhập";
            loginIcon.style.color = '';
            loginIcon.href = isSubfolder ? '../Login/Login.html' : 'Login/Login.html';
        }
    }
}

// 4. TRANG CHỦ - TẢI PHIM
async function loadMovies() {
    const trackNowShowing = document.getElementById('track-now-showing');
    const trackComingSoon = document.getElementById('track-coming-soon');
    if (!trackNowShowing && !trackComingSoon) return;

    try {
        const response = await fetch('/api/movies');
        const movies = await response.json();
        const nowShowing = movies.filter(m => m.TrangThai === "Đang chiếu");
        const comingSoon = movies.filter(m => m.TrangThai === "Sắp chiếu");

        if (trackNowShowing) renderMovieList(trackNowShowing, nowShowing, "PHIM ĐANG CHIẾU");
        if (trackComingSoon) renderMovieList(trackComingSoon, comingSoon, "PHIM SẮP CHIẾU");

        if (typeof setupCarousel === 'function') {
            setupCarousel('track-now-showing');
            setupCarousel('track-coming-soon');
        }
    } catch (error) { console.error(error); }
}

function renderMovieList(container, movies, tagText) {
    container.innerHTML = '';
    movies.forEach(movie => {
        const li = document.createElement('li');
        li.className = 'movie-card';
        li.style.cursor = 'pointer';
        li.innerHTML = `
            <div class="poster-wrapper">
                <img src="${movie.HinhAnh}" alt="${movie.TenPhim}" onerror="this.src='https://placehold.co/300x450?text=No+Image'">
                <div class="movie-tag">${tagText}</div>
                <div class="age-tag">P</div>
            </div>
            <h3 class="movie-name">${movie.TenPhim}</h3>
        `;
        li.addEventListener('click', () => {
            localStorage.setItem('selectedMovieId', movie.MaPhim);
            const path = window.location.pathname;
            if (path.includes('/ChiTietPhim/')) window.location.href = 'MovieDetail.html';
            else if (path.includes('/Login/') || path.includes('/Phim/') || path.includes('/LichSu/')) window.location.href = '../ChiTietPhim/MovieDetail.html';
            else window.location.href = 'ChiTietPhim/MovieDetail.html';
        });
        container.appendChild(li);
    });
}

// 4.1 TRANG CHỦ - TẢI BANNER ĐỘNG
async function loadBanners() {
    const bannerSlider = document.getElementById('bannerSlider');
    if (!bannerSlider) return;

    try {
        const response = await fetch('/api/banners');
        const banners = await response.json();

        if (banners.length === 0) return;

        bannerSlider.innerHTML = '';
        banners.forEach((banner, index) => {
            const slide = document.createElement('div');
            slide.className = `banner-slide ${index === 0 ? 'active' : ''}`;
            slide.style.backgroundImage = `url('${banner.LinkBanner}')`;

            // Nếu có MaPhim, khi click vào banner sẽ trỏ tới trang chi tiết phim đó
            if (banner.MaPhim) {
                slide.style.cursor = 'pointer';
                slide.addEventListener('click', () => {
                    localStorage.setItem('selectedMovieId', banner.MaPhim);
                    const path = window.location.pathname;
                    if (path.includes('/ChiTietPhim/')) {
                        window.location.href = 'MovieDetail.html';
                    } else if (path.includes('/Login/') || path.includes('/Phim/') || path.includes('/LichSu/')) {
                        window.location.href = '../ChiTietPhim/MovieDetail.html';
                    } else {
                        window.location.href = 'ChiTietPhim/MovieDetail.html';
                    }
                });
            }

            bannerSlider.appendChild(slide);
        });

        // Khởi chạy hoạt ảnh trượt đổi ảnh banner động từ script.js
        if (typeof window.setupBannerSlider === 'function') {
            window.setupBannerSlider();
        } else if (typeof setupBannerSlider === 'function') {
            setupBannerSlider();
        }
    } catch (error) {
        console.error("Lỗi tải banners:", error);
    }
}

// 5. TRANG CHI TIẾT PHIM & SUẤT CHIẾU
async function loadMovieDetail() {
    const movieTitleElem = document.querySelector('.movie-title');
    if (!movieTitleElem || !window.location.pathname.includes('MovieDetail.html')) return;

    const movieId = localStorage.getItem('selectedMovieId');
    if (!movieId) return;

    try {
        const response = await fetch('/api/movies');
        const movies = await response.json();
        const movie = movies.find(m => m.MaPhim == movieId);

        if (movie) {
            document.querySelector('.movie-title').innerText = movie.TenPhim;
            document.querySelector('.movie-synopsis p').innerText = movie.MoTa || "Đang cập nhật nội dung...";
            document.querySelector('.poster-card img').src = movie.HinhAnh;
            document.querySelector('.movie-banner img').src = movie.HinhAnh;
            document.querySelector('.duration').innerHTML = `<i class="fa-regular fa-clock"></i> ${movie.ThoiLuong} phút`;

            const detailList = document.querySelector('.detail-list');
            const releaseDate = new Date(movie.NgayKhoiChieu).toLocaleDateString('vi-VN');
            detailList.innerHTML = `
                <li><strong>Ngày phát hành:</strong> ${releaseDate}</li>
                <li><strong>Quốc gia:</strong> Việt Nam</li>
                <li><strong>Thể loại:</strong> ${movie.TenLoai || "Hành động"}</li>
            `;

            // Xử lý Trailer Modal
            const trailerBtn = document.getElementById('movieTrailerBtn');
            const modal = document.getElementById('trailerModal');
            const closeModal = document.getElementById('closeModal');
            const iframe = document.getElementById('trailerIframe');
            if (trailerBtn && modal && iframe) {
                trailerBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    let trailerUrl = movie.Trailer;
                    if (trailerUrl) {
                        if (trailerUrl.includes('watch?v=')) trailerUrl = trailerUrl.replace('watch?v=', 'embed/');
                        else if (trailerUrl.includes('youtu.be/')) trailerUrl = trailerUrl.replace('youtu.be/', 'www.youtube.com/embed/');
                        iframe.src = trailerUrl + "?autoplay=1";
                        modal.classList.add('show');
                    } else alert("Hiện chưa có trailer cho phim này.");
                });
                closeModal.onclick = () => { modal.classList.remove('show'); iframe.src = ""; };
                window.onclick = (e) => { if (e.target === modal) { modal.classList.remove('show'); iframe.src = ""; } };
            }

            loadShowtimes(movieId, movie.TenPhim);
        }
    } catch (error) { console.error(error); }
}

async function loadShowtimes(movieId, movieTitle) {
    const dateSelector = document.getElementById('dateSelector');
    const timeSelector = document.getElementById('timeSelector');
    if (!dateSelector || !timeSelector) return;

    try {
        const response = await fetch('/api/showtimes');
        const allShowtimes = await response.json();
        const showtimes = allShowtimes.filter(s => s.MaPhim == movieId);

        if (showtimes.length === 0) {
            dateSelector.innerHTML = '<p style="padding: 20px;">Hiện chưa có lịch chiếu cho phim này.</p>';
            timeSelector.innerHTML = '';
            return;
        }

        const dates = [...new Set(showtimes.map(s => s.NgayChieu))];
        dateSelector.innerHTML = '';
        dates.forEach((date, index) => {
            const dateObj = new Date(date);
            const dateItem = document.createElement('div');
            dateItem.className = `date-item ${index === 0 ? 'active' : ''}`;
            dateItem.innerHTML = `<span class="day-text">Thứ ${dateObj.getDay() + 1 === 1 ? 'CN' : dateObj.getDay() + 1}</span><span class="date-text">${dateObj.getDate()}/${dateObj.getMonth() + 1}</span>`;
            dateItem.addEventListener('click', () => {
                document.querySelectorAll('.date-item').forEach(el => el.classList.remove('active'));
                dateItem.classList.add('active');
                renderTimes(date, showtimes, movieTitle);
            });
            dateSelector.appendChild(dateItem);
        });
        renderTimes(dates[0], showtimes, movieTitle);
    } catch (error) { console.error(error); }
}

function renderTimes(selectedDate, showtimes, movieTitle) {
    const timeSelector = document.getElementById('timeSelector');
    timeSelector.innerHTML = '';
    const filtered = showtimes.filter(s => s.NgayChieu === selectedDate);
    filtered.forEach(s => {
        const timeBtn = document.createElement('div');
        timeBtn.className = 'time-item';
        // Đảm bảo lấy chính xác Giờ và Phút từ dữ liệu gốc
        const start = s.GioBatDau ? s.GioBatDau.split(':').slice(0, 2).join(':') : "";
        const end = s.GioKetThuc ? s.GioKetThuc.split(':').slice(0, 2).join(':') : "";
        timeBtn.innerText = end ? `${start} ~ ${end}` : start;

        timeBtn.addEventListener('click', () => {
            const selectedShowtime = {
                MaSuat: s.MaSuat, MaPhim: s.MaPhim, MaPhong: s.MaPhong, TenPhim: movieTitle, TenPhong: s.TenPhong,
                NgayChieu: selectedDate, GioBatDau: start, GioKetThuc: end
            };
            localStorage.setItem('selectedShowtime', JSON.stringify(selectedShowtime));
            window.location.href = '../DatVe/Booking.html';
        });
        timeSelector.appendChild(timeBtn);
    });
}

// 6. TRANG ĐẶT VÉ & THANH TOÁN
async function loadBookingPage() {
    const seatGrid = document.getElementById('seatGrid');
    if (!seatGrid || !window.location.pathname.includes('Booking.html')) return;

    const showtime = JSON.parse(localStorage.getItem('selectedShowtime'));
    if (!showtime) return;

    // ============================================================
    // ✨ TÍNH NĂNG ĐỒNG BỘ THỜI GIAN THỰC: GHẾ CỦA NGƯỜI DÙNG KHÁC
    // ============================================================
    // Lấy thông tin người dùng hiện tại từ sessionStorage
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    // Tạo BroadcastChannel riêng cho mỗi suất chiếu (MaSuat)
    // Ví dụ: "seat-selection-123" nếu MaSuat = 123
    // Các tab cùng suất chiếu sẽ kết nối vào channel này
    const channelName = `seat-selection-${showtime.MaSuat}`;
    let broadcastChannel = null;
    
    // Khởi tạo BroadcastChannel nếu trình duyệt hỗ trợ
    if (typeof BroadcastChannel !== 'undefined') {
        broadcastChannel = new BroadcastChannel(channelName);
    }
    
    // Lưu trữ ghế đang bị người dùng khác giữ
    // Cấu trúc: { "A1": { userName: "Nguyễn Văn A", MaKH: 5 }, "B2": {...} }
    const otherUsersSeats = {};

    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (showtime.MaPhim) {
                localStorage.setItem('selectedMovieId', showtime.MaPhim);
            }
            // Đóng BroadcastChannel khi rời trang
            if (broadcastChannel) broadcastChannel.close();
            window.location.href = '../ChiTietPhim/MovieDetail.html';
        });
    }

    document.getElementById('fMovieTitle').innerText = showtime.TenPhim;
    document.getElementById('fDateTime').innerText = `${showtime.NgayChieu} | ${showtime.GioBatDau} ~ ${showtime.GioKetThuc}`;
    document.getElementById('fHall').innerText = showtime.TenPhong;

    try {
        // TẢI SONG SONG DỮ LIỆU GHẾ, VÉ ĐÃ ĐẶT VÀ CÁC LOẠI GHẾ TỪ SQL SERVER (Hiệu năng tối ưu)
        const [seatsRes, bookedRes, seatTypesRes] = await Promise.all([
            fetch('/api/seats'),
            fetch(`/api/booked-seats/${showtime.MaSuat}`),
            fetch('/api/seat-types')
        ]);
        const allSeats = await seatsRes.json();
        const bookedSeatIds = await bookedRes.json();
        const seatTypes = await seatTypesRes.json();

        // DỰNG CHÚ THÍCH (LEGEND) DỰ THÀNH DỮ LIỆU THỰC TẾ SQL SERVER CÓ SẴN
        const seatLegend = document.getElementById('seatLegend');
        if (seatLegend) {
            seatLegend.innerHTML = '';

            // 1. Thêm chú thích trạng thái cơ bản (Đã đặt, Đang chọn)
            const basicLegends = [
                { className: 'booked', label: 'Ghế đã đặt' },
                { className: 'selected', label: 'Ghế bạn chọn' },
                { className: 'other-user-selecting', label: 'Ghế người khác đang chọn' }
            ];

            basicLegends.forEach(item => {
                const legendItem = document.createElement('div');
                legendItem.className = 'legend-item';
                legendItem.innerHTML = `<span class="seat-box ${item.className}"></span> ${item.label}`;
                seatLegend.appendChild(legendItem);
            });

            // 2. Thêm các loại ghế thực tế được tải động trực tiếp từ CSDL SQL Server
            seatTypes.forEach(type => {
                const legendItem = document.createElement('div');
                legendItem.className = 'legend-item';

                // Xác định class CSS phù hợp để khớp 100% hình dạng với các ghế tương ứng trong sơ đồ
                let typeClass = 'regular';
                const seatType = type.TenLoai ? type.TenLoai.toLowerCase() : '';
                if (seatType.includes('vip')) typeClass = 'vip';
                else if (seatType.includes('đôi') || seatType.includes('sweetbox')) typeClass = 'sweetbox';
                else if (seatType.includes('trung tâm') || seatType.includes('central')) typeClass = 'central';

                // Định dạng hiển thị tên và giá tiền của từng loại ghế cho khách hàng dễ nhận diện
                const priceFormatted = Number(type.GiaGhe).toLocaleString('vi-VN') + ' VND';
                legendItem.innerHTML = `<span class="seat-box ${typeClass}"></span> ${type.TenLoai} (${priceFormatted})`;
                seatLegend.appendChild(legendItem);
            });
        }

        const roomSeats = allSeats.filter(s => s.MaPhong == showtime.MaPhong);

        seatGrid.innerHTML = '';
        const rows = {};
        roomSeats.forEach(seat => {
            const rowLabel = seat.SoGhe.charAt(0);
            if (!rows[rowLabel]) rows[rowLabel] = [];
            rows[rowLabel].push(seat);
        });

        const sortedRowLabels = Object.keys(rows).sort();
        let selectedSeats = [];

        const recalcTotal = () =>
            selectedSeats.reduce((sum, s) => sum + Number(s.GiaGhe || 0), 0);

        sortedRowLabels.forEach(label => {
            const labelEl = document.createElement('div');
            labelEl.className = 'row-label';
            labelEl.innerText = label;
            seatGrid.appendChild(labelEl);

            const rowSeats = rows[label].sort((a, b) => {
                const numA = parseInt(a.SoGhe.substring(1));
                const numB = parseInt(b.SoGhe.substring(1));
                return numA - numB;
            });

            rowSeats.forEach(seat => {
                const seatEl = document.createElement('div');
                let typeClass = 'regular';
                const seatType = seat.TenLoaiGhe ? seat.TenLoaiGhe.toLowerCase() : '';
                if (seatType.includes('vip')) typeClass = 'vip';
                else if (seatType.includes('đôi') || seatType.includes('sweetbox')) typeClass = 'sweetbox';
                else if (seatType.includes('trung tâm') || seatType.includes('central')) typeClass = 'central';

                const isBooked = bookedSeatIds.includes(seat.MaGhe);
                seatEl.className = `seat ${typeClass} ${isBooked ? 'booked' : ''}`;
                // 🔖 Thêm data-seat-id để dễ tìm kiếm ghế chính xác khi cần cập nhật từ tab khác
                // Ví dụ: data-seat-id="A1" giúp querySelector tìm nhanh mà không nhầm lẫn
                seatEl.setAttribute('data-seat-id', seat.SoGhe);
                seatEl.innerText = seat.SoGhe.substring(1);

                if (!isBooked) {
                    seatEl.addEventListener('click', () => {
                        const seatData = { ...seat, GiaGhe: Number(seat.GiaGhe) || 0 };
                        const seatNumber = seat.SoGhe; // Ví dụ: "A1", "B2"
                        
                        if (seatEl.classList.contains('selected')) {
                            // Người dùng BỎ CHỌN ghế
                            seatEl.classList.remove('selected');
                            selectedSeats = selectedSeats.filter(s => s.MaGhe !== seat.MaGhe);
                            
                            // ✨ GỬI TÍN HIỆU GIẢI PHÓNG GHẾ: Thông báo cho các tab khác biết ghế này đã được bỏ chọn
                            if (broadcastChannel && currentUser) {
                                broadcastChannel.postMessage({
                                    type: 'SEAT_DESELECTED', // Loại sự kiện: Ghế được bỏ chọn
                                    seatNumber: seatNumber,  // Số ghế (VD: "A1")
                                    MaKH: currentUser.MaKH   // ID khách hàng
                                });
                            }
                        } else {
                            // Người dùng CHỌN ghế
                            seatEl.classList.add('selected');
                            selectedSeats.push(seatData);
                            
                            // ✨ GỬI TÍN HIỆU CHIẾM GHẾ: Thông báo cho các tab khác biết ghế này đang được chọn
                            if (broadcastChannel && currentUser) {
                                broadcastChannel.postMessage({
                                    type: 'SEAT_SELECTED',    // Loại sự kiện: Ghế được chọn
                                    seatNumber: seatNumber,   // Số ghế (VD: "A1")
                                    userName: currentUser.Ten, // Tên người dùng
                                    MaKH: currentUser.MaKH    // ID khách hàng
                                });
                            }
                        }
                        const totalPrice = recalcTotal();
                        document.getElementById('fSeats').innerText = selectedSeats.map(s => s.SoGhe).join(', ') || '-';
                        document.getElementById('fPrice').innerText = totalPrice.toLocaleString('vi-VN') + ' VND';
                    });
                }
                seatGrid.appendChild(seatEl);
            });
        });

        // ============================================================
        // ✨ LẮP NGHE TÍN HIỆU TỬ CÁC TAB KHÁC (BroadcastChannel Listener)
        // ============================================================
        // Khi nhận message từ channel, cập nhật giao diện để hiển thị ghế của người khác
        if (broadcastChannel) {
            broadcastChannel.onmessage = (event) => {
                const message = event.data;
                
                // Lọc loại sự kiện từ message
                if (message.type === 'SEAT_SELECTED') {
                    // 📍 CÓ NGƯỜI DÙNG KHÁC CHỌN GHẾ
                    // - message.seatNumber: Số ghế (VD: "A1")
                    // - message.userName: Tên người dùng
                    // - message.MaKH: ID khách hàng
                    
                    const seatNumber = message.seatNumber; // VD: "A1"
                    const userName = message.userName || 'Người dùng khác';
                    
                    // 🔍 TÌM KIẾM GHẾ CHÍNH XÁC
                    // Dùng data-seat-id attribute để tìm ghế đúng vị trí
                    // querySelector(`[data-seat-id="A1"]`) sẽ tìm ghế A1 một cách chính xác
                    const targetSeat = seatGrid.querySelector(`[data-seat-id="${seatNumber}"]`);
                    
                    if (targetSeat && !targetSeat.classList.contains('selected')) {
                        // ✅ TÌM THẤY GHẾ VÀ NÓ CHƯA BỊ BẠN CHỌN
                        // Thêm class để hiển thị ghế này đang bị người khác giữ (màu cam nhấp nháy)
                        targetSeat.classList.add('other-user-selecting');
                        
                        // 📝 LƯU THÔNG TIN: Ai đang giữ ghế này
                        // Lưu vào otherUsersSeats để có thể kiểm tra sau này nếu cần
                        otherUsersSeats[seatNumber] = { 
                            userName: userName, 
                            MaKH: message.MaKH 
                        };
                        
                        // 🖨️ LOG THÔNG TIN (tuỳ chọn, để debug)
                        console.log(`ℹ️ ${userName} đang chọn ghế ${seatNumber}`);
                    }
                    
                } else if (message.type === 'SEAT_DESELECTED') {
                    // 🔄 NGƯỜI DÙNG KHÁC BỎ CHỌN GHẾ
                    // - message.seatNumber: Số ghế được bỏ chọn (VD: "A1")
                    
                    const seatNumber = message.seatNumber; // VD: "A1"
                    
                    // 🔍 TÌM KIẾM GHẾ CHÍNH XÁC - dùng data-seat-id để tìm nhanh
                    const targetSeat = seatGrid.querySelector(`[data-seat-id="${seatNumber}"]`);
                    
                    if (targetSeat) {
                        // ✅ TÌM THẤY GHẾ
                        // Bỏ class cảnh báo - ghế trở lại trạng thái bình thường (có thể chọn)
                        targetSeat.classList.remove('other-user-selecting');
                        
                        // 🗑️ XÓA KHỎI DANH SÁCH: Xóa khỏi danh sách ghế của người khác
                        delete otherUsersSeats[seatNumber];
                        
                        // 🖨️ LOG THÔNG TIN (tuỳ chọn, để debug)
                        console.log(`✅ Ghế ${seatNumber} đã được giải phóng`);
                    }
                }
            };
        }

        document.getElementById('confirmBooking').addEventListener('click', () => {
            // Chú thích: Kiểm tra xem người dùng đã chọn ghế chưa
            if (selectedSeats.length === 0) { alert("Vui lòng chọn ít nhất một ghế!"); return; }

            // Chú thích: Kiểm tra xem người dùng đã đăng nhập chưa
            const currentUserCheck = JSON.parse(sessionStorage.getItem('currentUser'));
            if (!currentUserCheck) {
                alert("Vui lòng đăng nhập để tiếp tục đặt vé!");
                sessionStorage.setItem('returnUrl', window.location.href);
                window.location.href = '../Login/Login.html';
                return;
            }

            // ✨ THÔNG BÁO CHO CÁC TAB KHÁC: Người dùng hiện tại đã xác nhận đặt vé
            // Gửi message rằng tất cả ghế của user này đã được chốt/đặt thành công
            if (broadcastChannel && currentUser) {
                selectedSeats.forEach(seat => {
                    broadcastChannel.postMessage({
                        type: 'SEAT_CONFIRMED', // Loại sự kiện: Ghế đã được đặt chắc chắn
                        seatNumber: seat.SoGhe, // Số ghế
                        MaKH: currentUser.MaKH  // ID khách hàng
                    });
                });
                // Đóng BroadcastChannel vì không cần giao tiếp nữa
                broadcastChannel.close();
            }

            // Chú thích: Lưu thông tin đặt vé tạm thời sang localStorage để xử lý tiếp ở trang Chọn Combo
            const ticketTotal = recalcTotal();
            const pendingBooking = {
                selectedSeats: selectedSeats, // Danh sách đối tượng ghế đã chọn
                totalTicketPrice: ticketTotal, // Tổng tiền của các ghế đã chọn (số)
                showtime: showtime,           // Thông tin suất chiếu (phòng, phim, thời gian)
                currentUser: currentUserCheck      // Người dùng thực hiện đặt vé
            };
            localStorage.setItem('pendingBooking', JSON.stringify(pendingBooking));

            // Chú thích: Lưu thời gian hết hạn giữ ghế (5 phút kể từ bây giờ)
            const expiryTime = Date.now() + 5 * 60 * 1000;
            localStorage.setItem('bookingExpiryTime', expiryTime.toString());

            // Chú thích: Chuyển hướng người dùng qua trang Chọn Combo Bắp Nước
            window.location.href = '../Combo_BapNuoc/Combo.html';
        });

        // Zoom ghế + tự co vừa màn hình mobile
        let currentScale = 1;
        let baseFitScale = 1;
        const seatMap = document.getElementById('seatMap');
        const seatMapWrapper = document.querySelector('.seat-map-wrapper');

        const applySeatMapScale = () => {
            if (!seatMap) return;
            seatMap.style.transform = `scale(${currentScale})`;
            if (seatMapWrapper) {
                const scaledH = seatMap.offsetHeight * currentScale;
                seatMapWrapper.style.minHeight = `${scaledH + 24}px`;
            }
        };

        const fitSeatMapToScreen = () => {
            if (!seatMap || !seatMapWrapper || window.innerWidth >= 768) {
                currentScale = 1;
                baseFitScale = 1;
                applySeatMapScale();
                return;
            }
            seatMap.style.transform = 'scale(1)';
            const mapW = seatMap.scrollWidth;
            const available = seatMapWrapper.clientWidth - 8;
            baseFitScale = mapW > available ? Math.max(0.45, available / mapW) : 1;
            currentScale = baseFitScale;
            applySeatMapScale();
        };

        if (seatMap) {
            requestAnimationFrame(() => {
                fitSeatMapToScreen();
                setTimeout(fitSeatMapToScreen, 100);
            });
            window.addEventListener('resize', () => {
                clearTimeout(seatMap._resizeTimer);
                seatMap._resizeTimer = setTimeout(fitSeatMapToScreen, 150);
            });
            const zoomInBtn = document.getElementById('zoomIn');
            const zoomOutBtn = document.getElementById('zoomOut');
            if (zoomInBtn) {
                zoomInBtn.onclick = () => {
                    currentScale = Math.min(currentScale + 0.08, 1.5);
                    applySeatMapScale();
                };
            }
            if (zoomOutBtn) {
                zoomOutBtn.onclick = () => {
                    currentScale = Math.max(currentScale - 0.08, baseFitScale * 0.85);
                    applySeatMapScale();
                };
            }
        }

        // ============================================================
        // ✨ TỰ ĐỘNG GIẢI PHÓNG GHẾ KHI RỜI TRANG
        // ============================================================
        // Khi người dùng rời khỏi trang (đóng tab, quay lại, v.v.) mà chưa xác nhận đặt vé,
        // cần thông báo cho các tab khác biết để họ có thể chọn lại những ghế này.
        window.addEventListener('beforeunload', () => {
            // Gửi tín hiệu SEAT_DESELECTED cho tất cả ghế được chọn nhưng chưa xác nhận
            if (broadcastChannel && currentUser && selectedSeats.length > 0) {
                selectedSeats.forEach(seat => {
                    broadcastChannel.postMessage({
                        type: 'SEAT_DESELECTED', // Loại sự kiện: Ghế được giải phóng
                        seatNumber: seat.SoGhe, // Số ghế
                        MaKH: currentUser.MaKH  // ID khách hàng
                    });
                });
                // Đóng channel sau khi gửi tín hiệu
                broadcastChannel.close();
            }
        });

    } catch (error) { console.error(error); }
}

async function showPaymentModal(selectedSeats, totalPrice, showtime, user) {
    const overlay = document.getElementById('paymentOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';

    document.getElementById('pMovieTitle').innerText = showtime.TenPhim;
    document.getElementById('pDateTime').innerText = `${showtime.NgayChieu} | ${showtime.GioBatDau} ~ ${showtime.GioKetThuc}`;
    document.getElementById('pHall').innerText = showtime.TenPhong;
    document.getElementById('pSeats').innerText = selectedSeats.map(s => s.SoGhe).join(', ');
    document.getElementById('pPrice').innerText = totalPrice.toLocaleString('vi-VN') + ' VND';

    let selectedPayment = null;
    const bankGrid = document.getElementById('bankGrid');
    bankGrid.innerHTML = 'Đang tải phương thức...';
    try {
        const payRes = await fetch('/api/payments');
        const payments = await payRes.json();
        bankGrid.innerHTML = '';
        payments.forEach(p => {
            const item = document.createElement('div');
            item.className = 'bank-item';
            item.innerHTML = `<img src="${p.HinhAnh}" alt="${p.TenPhuongThuc}"><span>${p.TenPhuongThuc}</span>`;
            item.addEventListener('click', () => {
                document.querySelectorAll('.bank-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                // Gán MaThanhToan (ID dạng int) thay vì tên chuỗi để khớp với DB mới cập nhật
                selectedPayment = p.MaThanhToan;
                document.getElementById('payNowBtn').disabled = false;
            });
            bankGrid.appendChild(item);
        });
    } catch (error) { bankGrid.innerHTML = 'Không thể tải phương thức.'; }

    document.getElementById('payNowBtn').onclick = async () => {
        if (!selectedPayment) return;
        try {
            const bookingRequest = {
                MaKH: user.MaKH, NgayDat: new Date().toISOString(), TongTien: totalPrice,
                MaPhim: showtime.MaPhim, MaSuat: showtime.MaSuat, MaGheList: selectedSeats.map(s => s.MaGhe),
                GiaVe: selectedSeats[0].GiaGhe, PhuongThuc: selectedPayment
            };
            const response = await fetch('/api/invoices', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingRequest)
            });
            if (response.ok) {
                alert("Chúc mừng! Bạn đã đặt vé thành công.");
                window.location.href = '../LichSu/History.html';
            } else alert("Lỗi đặt vé.");
        } catch (error) { console.error(error); }
    };
    document.getElementById('closePayment').onclick = () => overlay.style.display = 'none';
}

// 7. TRANG LỊCH SỬ GIAO DỊCH (PHẦN 4: mã QR vé — MaQR từ HoaDon)
async function loadHistoryPage() {
    const historyList = document.getElementById('historyList');
    if (!historyList || !window.location.pathname.includes('History.html')) return;

    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!user) {
        historyList.innerHTML = '<div class="no-history">Vui lòng <a href="../Login/Login.html" style="color: #ff3d49;">đăng nhập</a> để xem lịch sử.</div>';
        return;
    }

    const closeQrBtn = document.getElementById('closeQrModal');
    const qrModal = document.getElementById('qrTicketModal');
    if (closeQrBtn && qrModal) {
        closeQrBtn.onclick = () => { qrModal.style.display = 'none'; };
        qrModal.addEventListener('click', (e) => {
            if (e.target === qrModal) qrModal.style.display = 'none';
        });
    }

    try {
        const response = await fetch('/api/invoices');
        const allInvoices = await response.json();
        const userInvoices = allInvoices.filter(i => i.MaKH == user.MaKH);

        historyList.innerHTML = '';
        if (userInvoices.length === 0) {
            historyList.innerHTML = '<div class="no-history">Bạn chưa có giao dịch nào.</div>';
            return;
        }

        userInvoices.reverse().forEach(inv => {
            const item = document.createElement('div');
            item.className = 'history-item-bar';
            const date = new Date(inv.NgayDat);
            item.innerHTML = `
                <div class="history-info">
                    <div class="history-detail-trigger">
                        <div class="movie-name">${inv.TenPhim || 'PHIM ĐÃ XEM'}</div>
                        <div class="booking-time">
                            ${date.toLocaleDateString('vi-VN')} | ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} | ${inv.PhuongThuc || ''}
                        </div>
                    </div>
                    <div class="history-amount">${formatVND(inv.TongTien)}</div>
                    <button type="button" class="btn-view-ticket" title="Xem mã QR vé">
                        <i class="fa-solid fa-qrcode"></i> XEM VÉ
                    </button>
                </div>
            `;
            item.querySelector('.history-detail-trigger').onclick = () => showHistoryDetail(inv);
            item.querySelector('.btn-view-ticket').onclick = (e) => {
                e.stopPropagation();
                showTicketQR(inv);
            };
            historyList.appendChild(item);
        });
    } catch (error) { console.error(error); }
}

/** Đọc MaQR từ object hóa đơn (hỗ trợ string, Buffer JSON, nhiều kiểu tên cột) */
function parseMaQRFromInvoice(invoice) {
    if (!invoice) return '';
    let raw = invoice.MaQR ?? invoice.maqr ?? invoice.MAQR;
    if (raw == null || raw === '') return '';

    if (typeof raw === 'string') {
        const s = raw.replace(/[{}]/g, '').trim();
        return s && s !== 'null' ? s : '';
    }

    if (typeof raw === 'object' && raw.type === 'Buffer' && Array.isArray(raw.data)) {
        const buf = raw.data;
        if (buf.length >= 16) {
            const hex = (n, len) => n.toString(16).padStart(len, '0');
            const r = (a, b) => buf.slice(a, b);
            const p1 = hex(r(3, 4)[0] | (r(2, 3)[0] << 8) | (r(1, 2)[0] << 16) | (r(0, 1)[0] << 24) >>> 0, 8);
            const p2 = hex((r(5, 6)[0] << 8) | r(4, 5)[0], 4);
            const p3 = hex((r(7, 8)[0] << 8) | r(6, 7)[0], 4);
            const p4 = r(8, 10).map(b => hex(b, 2)).join('');
            const p5 = r(10, 16).map(b => hex(b, 2)).join('');
            return `${p1.slice(0, 8)}-${p1.slice(8)}-${p2}-${p3}-${p4}-${p5}`;
        }
    }

    const s = String(raw).replace(/[{}]/g, '').trim();
    return s && s !== 'null' && s !== '[object Object]' ? s : '';
}

/** PHẦN 4: Tạo và hiển thị ảnh QR từ MaQR (uniqueidentifier) */
async function showTicketQR(invoice) {
    const qrModal = document.getElementById('qrTicketModal');
    const qrContainer = document.getElementById('qrCodeContainer');
    const maQRText = document.getElementById('qrMaQRText');
    const maHoaDonText = document.getElementById('qrMaHoaDonText');

    if (!qrModal || !qrContainer) return;

    let maQR = parseMaQRFromInvoice(invoice);

    if (!maQR && invoice.MaHoaDon) {
        try {
            const res = await fetch(`/api/invoices/${invoice.MaHoaDon}`);
            if (res.ok) {
                const fresh = await res.json();
                maQR = parseMaQRFromInvoice(fresh);
                invoice.MaQR = maQR;
            }
        } catch (e) { console.error(e); }
    }

    if (!maQR) {
        alert('Hóa đơn này chưa có mã QR. Vui lòng liên hệ quầy vé.');
        return;
    }

    qrContainer.innerHTML = '';
    const qrPayload = JSON.stringify({
        type: 'TEAM_BAT_ON_TICKET',
        MaQR: maQR,
        MaHoaDon: invoice.MaHoaDon
    });

    if (typeof QRCode !== 'undefined') {
        new QRCode(qrContainer, {
            text: qrPayload,
            width: 220,
            height: 220,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
    } else {
        qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrPayload)}" alt="QR vé">`;
    }

    if (maQRText) maQRText.innerText = maQR;
    if (maHoaDonText) maHoaDonText.innerText = invoice.MaHoaDon;
    qrModal.style.display = 'flex';
}

async function showHistoryDetail(invoice) {
    const modal = document.getElementById('historyModal');
    if (!modal) return;
    modal.style.display = 'flex';

    try {
        const [detailsRes, paymentsRes] = await Promise.all([
            fetch(`/api/invoice-details/${invoice.MaHoaDon}`),
            fetch('/api/payments')
        ]);
        const allItems = await detailsRes.json();
        const payments = paymentsRes.ok ? await paymentsRes.json() : [];
        const paymentId = invoice.MaPhuongThuc ?? (Number.isFinite(Number(invoice.PhuongThuc)) ? Number(invoice.PhuongThuc) : null);
        const payment = payments.find(p => p.MaThanhToan == paymentId)
            || payments.find(p => p.TenPhuongThuc === invoice.PhuongThuc || p.TenPhuongThuc === invoice.TenPhuongThuc);

        // Phân loại: Dòng nào có MaGhe là vé phim, dòng nào có MaSP là Combo
        const details = allItems.filter(d => d.MaGhe);
        const combos = allItems.filter(d => d.MaSP);

        const mCombosEl = document.getElementById('mCombos');
        if (mCombosEl) {
            mCombosEl.innerText = combos.length > 0
                ? combos.map(c => `${c.SoLuongSP}x ${c.TenSP} (${(Number(c.SoLuongSP) * Number(c.GiaSP || c.GiaNiemYet)).toLocaleString('vi-VN')} đ)`).join(', ')
                : 'Không có';
        }

        if (details.length > 0) {
            const first = details[0];
            const paymentDate = new Date(invoice.NgayDat);
            document.getElementById('mPaymentDate').innerText = paymentDate.toLocaleDateString('vi-VN');
            document.getElementById('mPaymentTime').innerText = paymentDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            document.getElementById('mMaQR').innerText = parseMaQRFromInvoice(invoice) || `#${invoice.MaHoaDon}`;

            const formatTimeNeutral = (t) => { if (!t) return ""; const s = t.toString(); return s.includes('T') ? s.substring(11, 16) : s.substring(0, 5); };
            const start = formatTimeNeutral(first.GioBatDau);
            const end = formatTimeNeutral(first.GioKetThuc);
            document.getElementById('mShowDate').innerHTML = `${new Date(first.NgayChieu).toLocaleDateString('vi-VN')}<br><span style="color: #ff3d49; font-weight: bold;">Thời gian: ${start} - ${end}</span>`;
            document.getElementById('mHall').innerText = first.TenPhong || "Phòng Chiếu";
            document.getElementById('mMovieTitle').innerText = first.TenPhim;
            document.getElementById('mTotalAmount').innerText = formatVND(invoice.TongTien);
            document.getElementById('mBankName').innerText = payment?.TenPhuongThuc || invoice.TenPhuongThuc || invoice.PhuongThuc || '-';
            document.getElementById('mSeats').innerText = details.map(d => d.SoGhe).join(', ');

            // ĐỔ DỮ LIỆU RẠP CHIẾU VÀ ĐỊA CHỈ (DEMO)
            if (document.getElementById('mCinemaName'))
                document.getElementById('mCinemaName').innerText = "CGV Vincom Biên Hòa";
            if (document.getElementById('mCinemaAddress'))
                document.getElementById('mCinemaAddress').innerText = "Tầng 3, Vincom Biên Hòa, 1096 Phạm Văn Thuận, Biên Hòa, Đồng Nai";

            const bankIcon = document.getElementById('mBankIcon');
            if (bankIcon) {
                const iconSrc = payment?.HinhAnh || '';
                if (iconSrc) {
                    bankIcon.src = iconSrc;
                    bankIcon.alt = payment.TenPhuongThuc || 'Thanh toán';
                    bankIcon.style.display = '';
                } else {
                    bankIcon.removeAttribute('src');
                    bankIcon.style.display = 'none';
                }
            }
        }
    } catch (error) { console.error("Lỗi chi tiết:", error); }
    document.getElementById('closeHistoryModal').onclick = () => modal.style.display = 'none';
}

// 8. TRANG DANH SÁCH PHIM (Movies.html) - TẢI, LỌC VÀ TÌM KIẾM
async function loadMoviesPage() {
    const moviesGrid = document.getElementById('moviesGrid');
    if (!moviesGrid || !window.location.pathname.includes('Movies.html')) return;

    const filterGroups = document.querySelectorAll('.filter-group');
    let genreContainer = null;
    filterGroups.forEach(group => {
        const btnText = group.querySelector('.filter-dropdown-btn span')?.innerText;
        if (btnText === 'THỂ LOẠI') {
            genreContainer = group.querySelector('.filter-dropdown-content');
        }
    });

    try {
        const [moviesRes, genresRes] = await Promise.all([
            fetch('/api/movies'),
            fetch('/api/movie-types')
        ]);

        const allMovies = await moviesRes.json();
        let allGenres = [];

        if (genresRes.ok) {
            allGenres = await genresRes.json();
        } else {
            const uniqueGenres = [...new Set(allMovies.map(m => m.TenLoai).filter(Boolean))];
            allGenres = uniqueGenres.map(name => ({ TenLoai: name }));
        }

        if (genreContainer) {
            genreContainer.innerHTML = `
                <label class="filter-item">
                    <input type="radio" name="genre" value="all" checked>
                    <span>Tất cả</span>
                </label>
            `;
            allGenres.forEach(g => {
                const label = document.createElement('label');
                label.className = 'filter-item';
                label.innerHTML = `
                    <input type="radio" name="genre" value="${g.TenLoai}">
                    <span>${g.TenLoai}</span>
                `;
                genreContainer.appendChild(label);
            });
        }

        const applyFilters = () => {
            let filtered = [...allMovies];
            const genreRadio = document.querySelector('input[name="genre"]:checked');
            if (genreRadio && genreRadio.value !== 'all') {
                filtered = filtered.filter(m => m.TenLoai === genreRadio.value);
            }

            const sortRadio = document.querySelector('input[name="sort"]:checked');
            if (sortRadio && sortRadio.value === 'latest') filtered.sort((a, b) => new Date(b.NgayKhoiChieu) - new Date(a.NgayKhoiChieu));
            else if (sortRadio && sortRadio.value === 'popular') filtered.sort((a, b) => (b.MaPhim || 0) - (a.MaPhim || 0));

            const searchInput = document.querySelector('.search-txt');
            if (searchInput && searchInput.value.trim() !== "") {
                const query = searchInput.value.toLowerCase().trim();
                filtered = filtered.filter(m => m.TenPhim.toLowerCase().includes(query));
            }
            renderMoviesGrid(moviesGrid, filtered);
        };

        document.addEventListener('change', (e) => {
            if (e.target.name === 'genre' || e.target.name === 'sort') {
                applyFilters();
            }
        });

        document.querySelectorAll('.filter-dropdown-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const content = btn.nextElementSibling;
                const icon = btn.querySelector('i');
                if (content.style.display === 'none' || content.style.display === '') { content.style.display = 'flex'; icon.style.transform = 'rotate(0deg)'; }
                else { content.style.display = 'none'; icon.style.transform = 'rotate(-90deg)'; }
            });
        });

        applyFilters();
    } catch (error) { console.error("Lỗi tải trang Movies:", error); }
}

function renderMoviesGrid(container, movies) {
    container.innerHTML = '';
    if (movies.length === 0) { container.innerHTML = '<div class="no-history" style="grid-column: 1/-1; text-align: center; padding: 50px;">Không tìm thấy phim phù hợp.</div>'; return; }
    movies.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card'; card.style.cursor = 'pointer';
        const dateObj = new Date(movie.NgayKhoiChieu);
        card.innerHTML = `
            <div class="poster-wrapper">
                <img src="${movie.HinhAnh}" alt="${movie.TenPhim}" onerror="this.src='https://placehold.co/300x450?text=No+Image'">
                <div class="movie-tag">${movie.TrangThai}</div><div class="age-tag">P</div>
            </div>
            <div class="movie-info" style="padding: 15px;">
                <h3 class="movie-name" style="font-size: 16px; margin-bottom: 5px;">${movie.TenPhim}</h3>
                <p class="release-date" style="font-size: 13px; color: #888;">Khởi chiếu: ${dateObj.toLocaleDateString('vi-VN')}</p>
            </div>
        `;
        card.onclick = () => { localStorage.setItem('selectedMovieId', movie.MaPhim); window.location.href = '../ChiTietPhim/MovieDetail.html'; };
        container.appendChild(card);
    });
}

// 9. XỬ LÝ TÌM KIẾM & GỢI Ý (SEARCH AUTOCOMPLETE)
async function handleSearch() {
    const searchInput = document.querySelector('.search-txt');
    const searchBtn = document.querySelector('.search-btn');
    const suggestions = document.getElementById('searchSuggestions');
    if (!searchInput) return;

    try {
        const response = await fetch('/api/movies');
        const allMovies = await response.json();

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (suggestions) {
                suggestions.innerHTML = '';
                if (query.length > 0) {
                    const matches = allMovies.filter(m => m.TenPhim.toLowerCase().includes(query)).slice(0, 5);
                    if (matches.length > 0) {
                        matches.forEach(m => {
                            const item = document.createElement('div');
                            item.className = 'suggestion-item';
                            item.innerHTML = `<img src="${m.HinhAnh}"><div><div class="suggestion-title">${m.TenPhim}</div><div class="suggestion-category">${m.TenLoai || 'Phim'}</div></div>`;
                            item.onclick = () => { localStorage.setItem('selectedMovieId', m.MaPhim); window.location.href = window.location.pathname.includes('index.html') ? 'ChiTietPhim/MovieDetail.html' : '../ChiTietPhim/MovieDetail.html'; };
                            suggestions.appendChild(item);
                        });
                        suggestions.style.display = 'block';
                    } else { suggestions.innerHTML = '<div class="no-suggestion">Không tìm thấy phim</div>'; suggestions.style.display = 'block'; }
                } else { suggestions.style.display = 'none'; }
            }
            if (window.location.pathname.includes('Movies.html')) {
                const event = new Event('change');
                document.querySelector('input[name="sort"]:checked')?.dispatchEvent(event);
            }
        });

        const performSearch = () => {
            const query = searchInput.value.trim();
            if (query === "") return;
            if (!window.location.pathname.includes('Movies.html')) {
                localStorage.setItem('headerSearchQuery', query);
                window.location.href = window.location.pathname.includes('index.html') ? 'Phim/Movies.html' : '../Phim/Movies.html';
            }
        };

        if (searchBtn) searchBtn.addEventListener('click', (e) => { e.preventDefault(); performSearch(); });
        searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') performSearch(); });
        document.addEventListener('click', (e) => { if (suggestions && !searchInput.contains(e.target)) suggestions.style.display = 'none'; });

        if (window.location.pathname.includes('Movies.html')) {
            const pendingQuery = localStorage.getItem('headerSearchQuery');
            if (pendingQuery) { searchInput.value = pendingQuery; localStorage.removeItem('headerSearchQuery'); setTimeout(() => { const event = new Event('change'); document.querySelector('input[name="sort"]:checked')?.dispatchEvent(event); }, 500); }
        }
    } catch (error) { console.error(error); }
}

// KHỞI CHẠY HỆ THỐNG
document.addEventListener('DOMContentLoaded', () => {
    // Chú thích: Gọi updateAuthUI để cập nhật trạng thái icon đăng nhập ngay khi tải trang
    updateAuthUI();
    handleLogin(); handleRegister(); handleFormSwitching(); handleLogout(); handleSearch();
    loadMovies(); loadMovieDetail(); loadBookingPage(); loadHistoryPage(); loadMoviesPage(); loadBanners();
});

// 10. HỖ TRỢ TÍNH TOÁN THỜI GIAN CHO ADMIN
// Hàm này được gọi từ main.js để tự động tính giờ kết thúc dựa trên giờ bắt đầu và thời lượng phim
window.calculateEndTime = function (startTimeStr, durationMinutes) {
    if (!startTimeStr || !durationMinutes) return "";
    const [hours, minutes] = startTimeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes + parseInt(durationMinutes), 0);
    return date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
};
