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
    const { selectedSeats, totalTicketPrice, showtime, currentUser } = pendingBooking;

    // 2. CẬP NHẬT THÔNG TIN VÉ XEM PHIM LÊN GIAO DIỆN CHỌN COMBO (SIDEBAR)
    document.getElementById('sMovieTitle').innerText = showtime.TenPhim;
    document.getElementById('sAge').innerText = "T18"; // Giá trị độ tuổi demo mặc định
    document.getElementById('sHall').innerText = `Phòng: ${showtime.TenPhong}`;
    document.getElementById('sDateTime').innerHTML = `<i class="fa-regular fa-calendar"></i> ${showtime.NgayChieu} | ${showtime.GioBatDau} ~ ${showtime.GioKetThuc}`;
    
    // Hiển thị danh sách ghế đã chọn và tổng tiền vé tạm tính
    const seatsText = selectedSeats.map(s => s.SoGhe).join(', ');
    document.getElementById('sSeats').innerText = seatsText;
    document.getElementById('sTicketPrice').innerText = totalTicketPrice.toLocaleString('vi-VN') + ' VND';

    // 3. DANH SÁCH MẪU COMBO BẮP NƯỚC (Từ 100.000đ đến 500.000đ, Tối đa 15 combo)
    // Sử dụng ảnh chất lượng cao từ Unsplash để đảm bảo thẩm mỹ premium đen trắng.
    const COMBOS = [
        {
            id: 1,
            name: "Combo Solo Premium",
            desc: "1 Bắp ngọt lớn (vị Caramel/Bơ) + 1 Coca-Cola 22oz mát lạnh. Thích hợp cho trải nghiệm cá nhân.",
            price: 105000,
            image: "https://images.unsplash.com/photo-1578849278619-e73505e9610f?q=80&w=600&auto=format&fit=crop"
        },
        {
            id: 2,
            name: "Combo Couple Sweet",
            desc: "1 Bắp ngọt khổng lồ + 2 Coca-Cola 22oz. Lựa chọn tuyệt vời cho các cặp đôi ngọt ngào.",
            price: 155000,
            image: "https://images.unsplash.com/photo-1585647347483-22b66260dfff?q=80&w=600&auto=format&fit=crop"
        },
        {
            id: 3,
            name: "Combo Mix Cheese & Caramel",
            desc: "1 Bắp cỡ lớn lắc Phô mai & Caramel hảo hạng + 2 Nước ngọt tùy chọn. Nhân đôi hương vị.",
            price: 185000,
            image: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=600&auto=format&fit=crop"
        },
        {
            id: 4,
            name: "Combo VIP Cinema",
            desc: "1 Bắp lớn Phô mai + 1 Bắp lớn Caramel + 2 Ly trà sữa đá xay VIP + 1 Khay Snack khoai tây chiên giòn.",
            price: 295000,
            image: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?q=80&w=600&auto=format&fit=crop"
        },
        {
            id: 5,
            name: "Combo Family Movie",
            desc: "2 Bắp ngọt lớn + 3 Coca-Cola 22oz + 1 Hộp Kẹo dẻo gấu lớn. Phù hợp cho nhóm gia đình 3-4 người.",
            price: 245000,
            image: "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?q=80&w=600&auto=format&fit=crop"
        },
        {
            id: 6,
            name: "Combo Party Mega Crunch",
            desc: "3 Bắp khổng lồ (tự chọn vị) + 4 Ly nước ngọt lớn + 2 Gói Snack Oishi đại. Combo bùng nổ cho hội bạn.",
            price: 385000,
            image: "https://images.unsplash.com/photo-1578849278619-e73505e9610f?q=80&w=600&auto=format&fit=crop"
        },
        {
            id: 7,
            name: "Combo Kid's Fruit Joy",
            desc: "1 Bắp ngọt nhỏ + 1 Hộp nước ép trái cây hữu cơ + 1 Món đồ chơi mô hình siêu anh hùng ngẫu nhiên.",
            price: 125000,
            image: "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?q=80&w=600&auto=format&fit=crop"
        },
        {
            id: 8,
            name: "Combo Healthy Tea Deluxe",
            desc: "1 Bắp ăn kiêng không đường cỡ vừa + 2 Chai Trà xanh Oolong hữu cơ ít ngọt thanh mát.",
            price: 135000,
            image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=600&auto=format&fit=crop"
        }
    ];

    // Khởi tạo đối tượng lưu trữ số lượng các combo được chọn: { comboId: quantity }
    let selectedCombos = {};

    // 4. RENDER DANH SÁCH COMBO BẮP NƯỚC LÊN GIAO DIỆN
    const comboGrid = document.getElementById('comboGrid');
    
    function renderCombos() {
        comboGrid.innerHTML = '';
        COMBOS.forEach(combo => {
            const currentQty = selectedCombos[combo.id] || 0;
            const isSelected = currentQty > 0;
            
            const comboEl = document.createElement('div');
            comboEl.className = `combo-item ${isSelected ? 'selected' : ''}`;
            comboEl.dataset.id = combo.id;
            
            comboEl.innerHTML = `
                <!-- Huy hiệu chọn -->
                <div class="combo-select-badge">
                    <i class="fa-solid fa-check"></i>
                </div>
                
                <!-- Hình ảnh combo bên trái -->
                <div class="combo-img-wrapper">
                    <img src="${combo.image}" alt="${combo.name}" onerror="this.src='https://placehold.co/180x135/111/FFF?text=Popcorn'">
                </div>
                
                <!-- Thông tin chi tiết bên phải -->
                <div class="combo-info">
                    <div class="combo-header-row">
                        <h3 class="combo-title">${combo.name}</h3>
                        <span class="combo-price">${combo.price.toLocaleString('vi-VN')} đ</span>
                    </div>
                    <p class="combo-description">${combo.desc}</p>
                    
                    <!-- Nút tăng giảm số lượng -->
                    <div class="combo-controls">
                        <div class="quantity-selector">
                            <button class="qty-btn btn-minus" data-id="${combo.id}">
                                <i class="fa-solid fa-minus"></i>
                            </button>
                            <input type="text" class="qty-input" value="${currentQty}" readonly id="qty-input-${combo.id}">
                            <button class="qty-btn btn-plus" data-id="${combo.id}">
                                <i class="fa-solid fa-plus"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Chú thích: Nhấp chuột vào bất cứ đâu trên thẻ combo (trừ các nút +/-) sẽ chọn/bỏ chọn combo đó
            comboEl.addEventListener('click', (e) => {
                if (e.target.closest('.qty-btn') || e.target.closest('.quantity-selector')) {
                    return; // Bỏ qua nếu người dùng bấm thẳng vào bộ chỉnh số lượng
                }
                toggleComboSelection(combo.id);
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
        
        // Duyệt qua toàn bộ các combo để lọc những cái được chọn
        COMBOS.forEach(combo => {
            const qty = selectedCombos[combo.id] || 0;
            if (qty > 0) {
                selectedCount++;
                const itemTotal = combo.price * qty;
                comboSubtotal += itemTotal;
                
                // Tạo thẻ hiển thị thông tin combo trong danh sách tóm tắt
                const li = document.createElement('li');
                li.className = 'selected-combo-li';
                li.innerHTML = `
                    <span>${qty}x ${combo.name}</span>
                    <strong>${itemTotal.toLocaleString('vi-VN')} đ</strong>
                `;
                selectedListEl.appendChild(li);
            }
        });
        
        // Nếu không có combo nào được chọn thì hiển thị ghi chú trống
        if (selectedCount === 0) {
            selectedListEl.innerHTML = '<li class="empty-list">Chưa chọn combo nào</li>';
        }
        
        // Tính tổng tiền thanh toán cuối cùng
        const grandTotal = totalTicketPrice + comboSubtotal;
        
        // Render tổng tiền lên sidebar
        document.getElementById('sTotalPrice').innerText = grandTotal.toLocaleString('vi-VN') + ' VND';
        
        // Lưu trữ tổng tiền và danh sách combo được chọn vào biến tạm thời
        pendingBooking.totalComboPrice = comboSubtotal;
        pendingBooking.grandTotal = grandTotal;
        pendingBooking.combos = COMBOS.filter(c => (selectedCombos[c.id] || 0) > 0).map(c => ({
            id: c.id,
            name: c.name,
            qty: selectedCombos[c.id],
            price: c.price
        }));
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
        // Cập nhật thông tin hóa đơn trên Modal Thanh toán
        document.getElementById('pMovieTitle').innerText = showtime.TenPhim;
        document.getElementById('pAge').innerText = "T18";
        document.getElementById('pDateTime').innerText = `${showtime.NgayChieu} | ${showtime.GioBatDau} ~ ${showtime.GioKetThuc}`;
        document.getElementById('pHall').innerText = showtime.TenPhong;
        document.getElementById('pSeats').innerText = selectedSeats.map(s => s.SoGhe).join(', ');
        
        // Hiển thị tóm tắt danh sách combo được chọn trên modal
        const combosSummaryText = pendingBooking.combos.length > 0 
            ? pendingBooking.combos.map(c => `${c.qty}x ${c.name}`).join(', ')
            : "Không chọn combo";
        document.getElementById('pCombosListText').innerText = combosSummaryText;
        
        // Hiển thị tổng tiền đầy đủ (Tiền vé + Tiền combo)
        document.getElementById('pPrice').innerText = pendingBooking.grandTotal.toLocaleString('vi-VN') + ' VND';
        
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
                TongTien: pendingBooking.grandTotal, // Tổng tiền (Vé + Combo)
                MaPhim: showtime.MaPhim,
                MaSuat: showtime.MaSuat,
                MaGheList: selectedSeats.map(s => s.MaGhe),
                GiaVe: selectedSeats[0].GiaGhe, // Giá vé đơn lẻ của ghế đầu tiên
                PhuongThuc: selectedPaymentMethod,
                MaGiaoDich: 'GD' + Date.now()
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

    // KHỞI CHẠY KHỞI TẠO BAN ĐẦU
    renderCombos();
    updateSummary();
});
