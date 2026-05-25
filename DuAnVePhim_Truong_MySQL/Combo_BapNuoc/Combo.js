/**
 * Combo.js - Xử lý Logic Chọn Combo Bắp Nước & Tích hợp Thanh Toán
 * Dự án Đặt Vé Xem Phim - TEAM BẤT ỔN
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. TẢI DỮ LIỆU ĐẶT VÉ TẠM THỜI TỪ LOCALSTORAGE
    const pendingBooking = JSON.parse(localStorage.getItem('pendingBooking'));
    const expiryTime = parseInt(localStorage.getItem('bookingExpiryTime'));

    // Chú thích: Nếu không có dữ liệu đặt vé hợp lệ hoặc đã hết hạn, chuyển hướng về trang đặt vé
    if (!pendingBooking || !expiryTime || Date.now() > expiryTime) {
        alert("Thông tin đặt vé không hợp lệ hoặc phiên giữ ghế đã hết hạn. Vui lòng chọn lại ghế!");
        clearBookingStorage();
        window.location.href = '../DatVe/Booking.html';
        return;
    }

    // Trích xuất các trường thông tin cần thiết từ đối tượng đặt vé tạm thời
    const { selectedSeats, showtime, currentUser } = pendingBooking;
    const ticketPrice = Number(pendingBooking.totalTicketPrice) || 0;
    pendingBooking.totalTicketPrice = ticketPrice;
    pendingBooking.combos = pendingBooking.combos || [];

    // 2. CẬP NHẬT THÔNG TIN VÉ XEM PHIM LÊN GIAO DIỆN CHỌN COMBO (SIDEBAR)
    document.getElementById('sMovieTitle').innerText = showtime.TenPhim;
    document.getElementById('sAge').innerText = "T18"; // Giá trị độ tuổi demo mặc định
    document.getElementById('sHall').innerText = `Phòng: ${showtime.TenPhong}`;
    document.getElementById('sDateTime').innerHTML = `<i class="fa-regular fa-calendar"></i> ${showtime.NgayChieu} | ${showtime.GioBatDau} ~ ${showtime.GioKetThuc}`;
    
    // Hiển thị danh sách ghế đã chọn và tổng tiền vé tạm tính
    const seatsText = selectedSeats.map(s => s.SoGhe).join(', ');
    document.getElementById('sSeats').innerText = seatsText;
    document.getElementById('sTicketPrice').innerText = ticketPrice.toLocaleString('vi-VN') + ' VND';

    // PHẦN 2: Danh sách sản phẩm (combo bắp nước) lấy từ API /api/sanpham — dữ liệu thật từ SQL
    let PRODUCTS = [];
    let selectedCombos = {};

    const comboGrid = document.getElementById('comboGrid');

    /** PHẦN 2: Tải sản phẩm từ server */
    async function loadProducts() {
        comboGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#aaa;padding:40px;">Đang tải sản phẩm...</div>';
        try {
            const res = await fetch('/api/sanpham');
            if (!res.ok) throw new Error('Lỗi API');
            const raw = await res.json();
            PRODUCTS = raw.map(p => ({
                MaSP: p.MaSP,
                TenSP: p.TenSP,
                Gia: Number(p.Gia) || 0,
                HinhAnh: p.HinhAnh,
                MoTa: p.MoTa,
                MaLoaiSP: p.MaLoaiSP,
                LoaiTen: p.LoaiTen
            }));
            if (PRODUCTS.length === 0) {
                comboGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#888;padding:40px;">Chưa có sản phẩm nào trong hệ thống.</div>';
                return;
            }
            renderCombos();
            updateSummary();
        } catch (err) {
            console.error(err);
            comboGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#ff3d49;padding:40px;">Không tải được danh sách sản phẩm.</div>';
        }
    }

    /** PHẦN 2: Render danh sách sản phẩm lên lưới Combo */
    function renderCombos() {
        comboGrid.innerHTML = '';
        PRODUCTS.forEach(combo => {
            const comboId = combo.MaSP;
            const price = Number(combo.Gia) || 0;
            const currentQty = selectedCombos[comboId] || 0;
            const isSelected = currentQty > 0;

            const comboEl = document.createElement('div');
            comboEl.className = `combo-item ${isSelected ? 'selected' : ''}`;
            comboEl.dataset.id = comboId;

            comboEl.innerHTML = `
                <div class="combo-select-badge">
                    <i class="fa-solid fa-check"></i>
                </div>
                <div class="combo-img-wrapper">
                    <img src="${combo.HinhAnh || 'https://placehold.co/180x135/111/FFF?text=SP'}" alt="${combo.TenSP}" onerror="this.src='https://placehold.co/180x135/111/FFF?text=SP'">
                </div>
                <div class="combo-info">
                    <div class="combo-header-row">
                        <h3 class="combo-title">${combo.TenSP}</h3>
                        <span class="combo-price">${price.toLocaleString('vi-VN')} đ</span>
                    </div>
                    <p class="combo-description">${combo.MoTa || ''}</p>
                    <div class="combo-controls">
                        <div class="quantity-selector">
                            <button class="qty-btn btn-minus" data-id="${comboId}">
                                <i class="fa-solid fa-minus"></i>
                            </button>
                            <input type="text" class="qty-input" value="${currentQty}" readonly id="qty-input-${comboId}">
                            <button class="qty-btn btn-plus" data-id="${comboId}">
                                <i class="fa-solid fa-plus"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;

            comboEl.addEventListener('click', (e) => {
                if (e.target.closest('.qty-btn') || e.target.closest('.quantity-selector')) return;
                toggleComboSelection(comboId);
            });
            
            comboGrid.appendChild(comboEl);
        });
        
        // Gắn sự kiện cho các nút tăng giảm số lượng sau khi render xong
        document.querySelectorAll('.btn-minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                updateComboQuantity(id, -1);
            });
        });
        
        document.querySelectorAll('.btn-plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                updateComboQuantity(id, 1);
            });
        });
    }

    // Chú thích: Bật tắt trạng thái chọn combo (nhấp chọn nhanh)
    function toggleComboSelection(comboId) {
        const currentQty = selectedCombos[comboId] || 0;
        if (currentQty > 0) {
            selectedCombos[comboId] = 0; // Hủy chọn đưa về 0
        } else {
            selectedCombos[comboId] = 1; // Chọn mặc định 1 cái
        }
        renderCombos();
        updateSummary();
    }

    // Chú thích: Tăng giảm số lượng của một combo cụ thể
    function updateComboQuantity(comboId, change) {
        const currentQty = selectedCombos[comboId] || 0;
        const newQty = Math.max(0, currentQty + change);
        
        selectedCombos[comboId] = newQty;
        
        // Cập nhật nhanh giá trị ô input mà không cần re-render toàn bộ grid để mượt mà hơn
        const inputField = document.getElementById(`qty-input-${comboId}`);
        if (inputField) {
            inputField.value = newQty;
        }
        
        // Cập nhật trạng thái viền của card combo tương ứng
        const comboCard = document.querySelector(`.combo-item[data-id="${comboId}"]`);
        if (comboCard) {
            if (newQty > 0) {
                comboCard.classList.add('selected');
            } else {
                comboCard.classList.remove('selected');
            }
        }
        
        updateSummary();
    }

    // 5. TÍNH TOÁN VÀ CẬP NHẬT TỔNG TIỀN (SIDEBAR)
    function updateSummary() {
        const selectedListEl = document.getElementById('selectedCombosList');
        selectedListEl.innerHTML = '';
        
        let comboSubtotal = 0;
        let selectedCount = 0;
        
        PRODUCTS.forEach(combo => {
            const qty = selectedCombos[combo.MaSP] || 0;
            if (qty > 0) {
                selectedCount++;
                const price = Number(combo.Gia) || 0;
                const itemTotal = price * qty;
                comboSubtotal += itemTotal;

                const li = document.createElement('li');
                li.className = 'selected-combo-li';
                li.innerHTML = `
                    <span>${qty}x ${combo.TenSP}</span>
                    <strong>${itemTotal.toLocaleString('vi-VN')} đ</strong>
                `;
                selectedListEl.appendChild(li);
            }
        });
        
        // Nếu không có combo nào được chọn thì hiển thị ghi chú trống
        if (selectedCount === 0) {
            selectedListEl.innerHTML = '<li class="empty-list">Chưa chọn combo nào</li>';
        }
        
        // Tính tổng tiền thanh toán cuối cùng (ép kiểu số — tránh nối chuỗi)
        const grandTotal = ticketPrice + comboSubtotal;
        
        // Render tổng tiền lên sidebar
        document.getElementById('sTotalPrice').innerText = grandTotal.toLocaleString('vi-VN') + ' VND';
        
        // Lưu trữ tổng tiền và danh sách combo được chọn
        pendingBooking.totalComboPrice = comboSubtotal;
        pendingBooking.grandTotal = grandTotal;
        pendingBooking.combos = PRODUCTS.filter(c => (selectedCombos[c.MaSP] || 0) > 0).map(c => ({
            id: c.MaSP,
            name: c.TenSP,
            qty: selectedCombos[c.MaSP],
            price: Number(c.Gia) || 0
        }));
        localStorage.setItem('pendingBooking', JSON.stringify(pendingBooking));
    }

    // 6. XỬ LÝ ĐỒNG HỒ ĐẾM NGƯỢC 5 PHÚT GIỮ GHẾ
    const countdownTimerEl = document.getElementById('countdownTimer');
    
    const timerInterval = setInterval(() => {
        const timeLeft = expiryTime - Date.now();
        
        if (timeLeft <= 0) {
            // Hết giờ giữ ghế
            clearInterval(timerInterval);
            countdownTimerEl.innerText = "00:00";
            
            // Xóa thông tin đặt ghế trong localStorage và thông báo
            clearBookingStorage();
            alert("Đã hết 5 phút giữ ghế! Ghế của bạn đã được giải phóng. Vui lòng đặt vé lại.");
            
            // Điều hướng quay lại trang đặt vé
            window.location.href = '../DatVe/Booking.html';
        } else {
            // Định dạng phút : giây
            const minutes = Math.floor(timeLeft / 1000 / 60);
            const seconds = Math.floor((timeLeft / 1000) % 60);
            countdownTimerEl.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 1000);

    // Chú thích: Nút quay lại màn hình chọn ghế
    document.getElementById('backToSeatsBtn').addEventListener('click', () => {
        clearInterval(timerInterval);
        // Lưu lại dữ liệu trước khi quay về để có thể hoàn trả lại ghế (nếu cần) hoặc chỉ đơn giản quay lại
        window.location.href = '../DatVe/Booking.html';
    });

    // 7. TÍCH HỢP THANH TOÁN (MODAL THANH TOÁN OVERLAY)
    const paymentOverlay = document.getElementById('paymentOverlay');
    const closePayment = document.getElementById('closePayment');
    const bankGrid = document.getElementById('bankGrid');
    const payNowBtn = document.getElementById('payNowBtn');
    let selectedPaymentMethod = null;

    // Chú thích: Khi bấm nút "XÁC NHẬN THANH TOÁN" ở sidebar
    document.getElementById('confirmCombosBtn').addEventListener('click', () => {
        updateSummary();

        // Cập nhật thông tin hóa đơn trên Modal Thanh toán
        document.getElementById('pMovieTitle').innerText = showtime.TenPhim;
        document.getElementById('pAge').innerText = "T18";
        document.getElementById('pDateTime').innerText = `${showtime.NgayChieu} | ${showtime.GioBatDau} ~ ${showtime.GioKetThuc}`;
        document.getElementById('pHall').innerText = showtime.TenPhong;
        document.getElementById('pSeats').innerText = selectedSeats.map(s => s.SoGhe).join(', ');
        
        // Hiển thị tóm tắt danh sách combo được chọn trên modal
        const combos = pendingBooking.combos || [];
        const combosSummaryText = combos.length > 0
            ? combos.map(c => `${c.qty}x ${c.name}`).join(', ')
            : "Không chọn combo";
        document.getElementById('pCombosListText').innerText = combosSummaryText;
        
        // Hiển thị tổng tiền đầy đủ (Tiền vé + Tiền combo)
        const grand = Number(pendingBooking.grandTotal) || ticketPrice;
        document.getElementById('pPrice').innerText = grand.toLocaleString('vi-VN') + ' VND';
        
        // Cập nhật thanh tiến độ sang bước 3: "Thanh Toán" hoạt động
        document.getElementById('step-combo').classList.remove('active');
        document.getElementById('step-combo').classList.add('completed');
        document.getElementById('step-payment').classList.add('active');
        
        // Tải phương thức thanh toán
        loadPaymentMethods();
        
        // Hiển thị modal overlay
        paymentOverlay.style.display = 'flex';
    });

    // Đóng modal thanh toán
    closePayment.addEventListener('click', () => {
        paymentOverlay.style.display = 'none';
        
        // Hoàn trả lại thanh tiến độ về bước 2: "Chọn Combo" hoạt động
        document.getElementById('step-payment').classList.remove('active');
        document.getElementById('step-combo').classList.remove('completed');
        document.getElementById('step-combo').classList.add('active');
    });

    // Tải phương thức thanh toán từ backend API
    async function loadPaymentMethods() {
        bankGrid.innerHTML = '<div style="color:#aaa; text-align:center; grid-column:span 2; padding:20px;">Đang tải phương thức...</div>';
        selectedPaymentMethod = null;
        payNowBtn.disabled = true;
        
        try {
            const res = await fetch('/api/payments');
            const payments = await res.json();
            bankGrid.innerHTML = '';
            
            payments.forEach(p => {
                const item = document.createElement('div');
                item.className = 'bank-item';
                item.innerHTML = `<img src="${p.HinhAnh}" alt="${p.TenPhuongThuc}"><span>${p.TenPhuongThuc}</span>`;
                
                item.addEventListener('click', () => {
                    document.querySelectorAll('.bank-item').forEach(el => el.classList.remove('selected'));
                    item.classList.add('selected');
                    selectedPaymentMethod = p.MaThanhToan; 
                    payNowBtn.disabled = false;
                });
                
                bankGrid.appendChild(item);
            });
        } catch (error) {
            console.error("Lỗi tải ngân hàng:", error);
            bankGrid.innerHTML = '<div style="color:#ff3d49; text-align:center; grid-column:span 2; padding:20px;">Không thể tải phương thức thanh toán.</div>';
        }
    }

    // Chú thích: Bấm nút "THANH TOÁN" cuối cùng trên modal
    payNowBtn.addEventListener('click', async () => {
        if (!selectedPaymentMethod) return;
        
        payNowBtn.disabled = true;
        payNowBtn.innerText = "ĐANG XỬ LÝ...";
        
        try {
            // Đóng gói thông tin yêu cầu đặt vé gửi lên backend API
            // Tổng tiền gửi lên bao gồm cả Tiền vé + Tiền combo để khớp đúng số tiền thanh toán thực tế
            const bookingRequest = {
                MaKH: currentUser.MaKH,
                NgayDat: new Date().toISOString(),
                TongTien: Number(pendingBooking.grandTotal) || ticketPrice,
                MaPhim: showtime.MaPhim,
                MaSuat: showtime.MaSuat,
                MaGheList: selectedSeats.map(s => s.MaGhe),
                GiaVe: Number(selectedSeats[0]?.GiaGhe) || 0,
                PhuongThuc: selectedPaymentMethod
            };
            
            const response = await fetch('/api/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingRequest)
            });
            
            if (response.ok) {
                // Hủy đồng hồ đếm ngược
                clearInterval(timerInterval);
                
                alert("Chúc mừng! Bạn đã đặt vé và chọn combo thành công.");
                
                // Dọn dẹp localStorage
                clearBookingStorage();
                
                // Chuyển hướng sang trang lịch sử xem vé
                window.location.href = '../LichSu/History.html';
            } else {
                const errResult = await response.json();
                alert("Lỗi đặt vé: " + (errResult.error || "Giao dịch không thành công"));
                payNowBtn.disabled = false;
                payNowBtn.innerText = "THANH TOÁN";
            }
        } catch (error) {
            console.error("Lỗi gửi giao dịch:", error);
            alert("Có lỗi xảy ra khi kết nối tới máy chủ thanh toán!");
            payNowBtn.disabled = false;
            payNowBtn.innerText = "THANH TOÁN";
        }
    });

    // Hàm dọn dẹp các biến liên quan đến booking trong localStorage
    function clearBookingStorage() {
        localStorage.removeItem('pendingBooking');
        localStorage.removeItem('bookingExpiryTime');
    }

    // PHẦN 2: Khởi chạy — tải sản phẩm từ database
    loadProducts();
});
