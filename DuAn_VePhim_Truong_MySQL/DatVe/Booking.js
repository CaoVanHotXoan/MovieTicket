// Booking.js - Logic Đặt Vé & Thanh Toán với Real-time Seat Booking

document.addEventListener('DOMContentLoaded', () => {
    // ======================== PHẦN 1: KHỞI TẠO SOCKET.IO ========================
    // Kết nối tới server Socket.io để nhận/gửi dữ liệu real-time
    const socket = io({
        reconnection: true, // Tự động kết nối lại nếu mất kết nối
        reconnectionDelay: 1000, // Chờ 1 giây trước khi kết nối lại
        reconnectionDelayMax: 5000, // Tối đa 5 giây
        reconnectionAttempts: 5 // Thử kết nối lại 5 lần
    });

    // Lưu trữ ghế đang được người dùng khác chọn
    let otherUsersSeats = {}; // { seatId: { userName, userId, ... } }
    const selectedShowtime = JSON.parse(localStorage.getItem('selectedShowtime') || 'null');
    const bookingData = JSON.parse(localStorage.getItem('bookingData') || 'null');

    /**
     * Khi Socket.io kết nối thành công
     */
    socket.on('connect', () => {
        console.log('✅ Kết nối Socket.io thành công');
        
        // Lấy thông tin người dùng hiện tại và suất chiếu đang chọn
        const currentUser = localStorage.getItem('currentUser');
        const bookingInfo = selectedShowtime || bookingData;
        
        if (currentUser && bookingInfo) {
            const userObj = JSON.parse(currentUser);
            const movieId = bookingInfo.MaPhim || bookingInfo.movieId || 1;
            const roomId = bookingInfo.MaPhong || bookingInfo.room || 'P01';
            const date = bookingInfo.NgayChieu || bookingInfo.date || new Date().toLocaleDateString('vi-VN');
            
            // Gửi thông tin đăng nhập tới server để gắn socket vào phòng suất chiếu
            socket.emit('login', {
                userId: userObj.MaKH,
                userName: userObj.Ten,
                movieId,
                roomId,
                date
            });
            
            console.log(`📝 ${userObj.Ten} đã bắt đầu booking suất ${movieId} / ${roomId} / ${date}`);
            
            // Yêu cầu lấy danh sách ghế đang được chọn cho suất chiếu hiện tại
            socket.emit('getActiveSeatSelections', {
                movieId,
                roomId,
                date
            });
        }
    });

    /**
     * Khi nhận được cập nhật ghế từ người dùng khác
     * Cập nhật UI để hiển thị ghế người dùng khác đang chọn
     */
    socket.on('seatUpdate', (data) => {
        const { seatId, action, userName, userId } = data;
        
        if (action === 'select') {
            // Lưu trữ ghế này đang được người dùng khác chọn
            otherUsersSeats[seatId] = { userName, userId };
            console.log(`👤 ${userName} chọn ghế ${seatId}`);
        } else if (action === 'deselect') {
            // Xóa ghế khỏi danh sách
            delete otherUsersSeats[seatId];
            console.log(`👤 ${userName} hủy chọn ghế ${seatId}`);
        }
        
        // Cập nhật hiển thị
        updateRealtimeSeatDisplay();
        updateSeatVisuals(seatId, action);
    });

    /**
     * Nhận danh sách ghế hiện tại đang được chọn
     */
    socket.on('activeSeatSelections', (seatMap) => {
        otherUsersSeats = seatMap;
        console.log('📋 Danh sách ghế hiện tại:', seatMap);
        updateRealtimeSeatDisplay();
    });

    /**
     * Khi Socket.io kết nối bị mất
     */
    socket.on('disconnect', () => {
        console.log('❌ Mất kết nối Socket.io');
    });

    // ======================== PHẦN 2: TẢI DỮ LIỆU ========================
    // 1. Lấy dữ liệu suất chiếu đang chọn, ưu tiên selectedShowtime nếu có
    const bookingInfo = selectedShowtime || bookingData;
    if (bookingInfo) {
        const movieTitle = bookingInfo.TenPhim || bookingInfo.movieTitle || '';
        const ageTag = bookingInfo.ageTag || '';
        const hallName = bookingInfo.TenPhong || bookingInfo.room || '';
        const dateTimeText = bookingInfo.NgayChieu
            ? `${bookingInfo.NgayChieu} | ${bookingInfo.GioBatDau || ''}${bookingInfo.GioKetThuc ? ` ~ ${bookingInfo.GioKetThuc}` : ''}`
            : `${bookingInfo.day || ''}${bookingInfo.date ? `, ${bookingInfo.date}` : ''}${bookingInfo.time ? ` - ${bookingInfo.time}` : ''}`;

        if (movieTitle) document.getElementById('fMovieTitle').innerText = movieTitle;
        if (ageTag) document.getElementById('fAge').innerText = ageTag;
        if (dateTimeText) document.getElementById('fDateTime').innerText = dateTimeText;
        if (hallName) document.getElementById('fHall').innerText = hallName;
    }

    // ======================== PHẦN 3: CẤU HÌNH GIÁ VÉ ========================
    // 2. Cấu hình giá vé cho từng loại ghế
    const PRICES = {
        regular: 80000,      // Ghế thường
        vip: 120000,         // Ghế VIP
        sweetbox: 200000,    // Ghế đôi
        centralPremium: 10000 // Phụ phí ghế chính giữa
    };

    // ======================== PHẦN 4: KHỞI TẠO SƠ ĐỒ GHẾ ========================
    // 3. Khởi tạo Sơ đồ ghế
    const seatGrid = document.getElementById('seatGrid');
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const cols = 12;
    let selectedSeats = []; // Ghế của người dùng hiện tại đã chọn

    /**
     * Hàm tạo sơ đồ ghế
     * Tạo một lưới ghế với các hàng A-J và cột 1-12
     */
    function generateGrid() {
        seatGrid.innerHTML = '';
        seatGrid.appendChild(document.createElement('div')); 
        
        // Thêm số cột (1-12)
        for (let c = 1; c <= cols; c++) {
            const colLabel = document.createElement('div');
            colLabel.className = 'row-label';
            colLabel.innerText = c;
            seatGrid.appendChild(colLabel);
        }

        // Thêm các hàng ghế (A-J)
        rows.forEach(row => {
            const rowLabel = document.createElement('div');
            rowLabel.className = 'row-label';
            rowLabel.innerText = row;
            seatGrid.appendChild(rowLabel);

            for (let c = 1; c <= cols; c++) {
                // Hàng J (ghế đôi) chỉ có ghế lẻ
                if (row === 'J' && c % 2 === 0) continue; 

                const seat = document.createElement('div');
                const seatId = `${row}${c}`; // VD: A1, A2, B3...
                seat.className = 'seat';
                seat.dataset.id = seatId;
                seat.innerText = seatId;

                // Xác định loại ghế
                let type = 'regular'; // Mặc định là ghế thường
                if (row >= 'F' && row <= 'H') type = 'vip'; // Hàng F-H là VIP
                if (row === 'J') type = 'sweetbox'; // Hàng J là ghế đôi
                
                // Kiểm tra xem ghế có ở giữa (có phụ phí) không
                const isCentral = (c >= 5 && c <= 8) && row !== 'J';
                
                // Thêm class cho CSS styling
                seat.classList.add(type);
                if (isCentral) seat.classList.add('central');

                // Ngẫu nhiên chọn ~10% ghế là đã được đặt (booked)
                if (Math.random() < 0.1) seat.classList.add('booked');

                // Thêm sự kiện click để chọn/hủy chọn ghế
                seat.addEventListener('click', () => toggleSeat(seat, type, isCentral, seatId));
                seatGrid.appendChild(seat);
            }
        });
    }

    /**
     * Hàm chuyển đổi trạng thái ghế (chọn/hủy chọn)
     * @param seatElem - phần tử DOM của ghế
     * @param type - loại ghế (regular, vip, sweetbox)
     * @param isCentral - có phải ghế giữa không
     * @param seatId - ID ghế (VD: A1)
     */
    function toggleSeat(seatElem, type, isCentral, seatId) {
        // Nếu ghế đã bị đặt, không cho phép chọn
        if (seatElem.classList.contains('booked')) return;
        
        // Kiểm tra xem ghế này có được người dùng khác chọn không
        if (otherUsersSeats[seatId]) {
            alert(`❌ Ghế ${seatId} đang được người dùng khác chọn!`);
            return;
        }

        const index = selectedSeats.findIndex(s => s.id === seatId);

        if (index > -1) {
            // Nếu ghế đã được chọn trước đó, bỏ chọn nó
            selectedSeats.splice(index, 1);
            seatElem.classList.remove('selected');
            
            // Gửi thông tin hủy chọn ghế đến server để cập nhật real-time cho người khác
            socket.emit('selectSeat', {
                seatId: seatId,
                seatPrice: 0,
                action: 'deselect'
            });
        } else {
            // Chọn ghế mới và lưu giá tạm tính
            const price = PRICES[type] + (isCentral ? PRICES.centralPremium : 0);
            selectedSeats.push({ id: seatId, price: price });
            seatElem.classList.add('selected');
            
            // Gửi sự kiện chọn ghế đến server, nhớ chọn ghế theo đúng suất chiếu hiện tại
            socket.emit('selectSeat', {
                seatId: seatId,
                seatPrice: price,
                action: 'select'
            });
        }
        
        // Cập nhật footer với thông tin tạm tính
        updateFooter();
    }

    /**
     * Cập nhật hiển thị footer với thông tin ghế và giá
     */
    function updateFooter() {
        const seatsText = selectedSeats.map(s => s.id).join(', ') || '-';
        const totalPrice = selectedSeats.reduce((sum, s) => sum + s.price, 0);
        document.getElementById('fSeats').innerText = seatsText;
        document.getElementById('fPrice').innerText = totalPrice.toLocaleString('vi-VN') + ' VND';
    }

    /**
     * Cập nhật visual của ghế khi người dùng khác chọn/hủy chọn
     * Thêm class 'other-user-selecting' để hiển thị ghế đang được người dùng khác chọn
     */
    function updateSeatVisuals(seatId, action) {
        const seatElem = document.querySelector(`[data-id="${seatId}"]`);
        if (!seatElem) return;

        if (action === 'select') {
            seatElem.classList.add('other-user-selecting');
        } else if (action === 'deselect') {
            seatElem.classList.remove('other-user-selecting');
        }
    }

    /**
     * Cập nhật danh sách ghế đang được người dùng khác chọn
     * Hiển thị thông tin realtime dưới sơ đồ ghế
     */
    function updateRealtimeSeatDisplay() {
        const realtimeInfo = document.getElementById('realtimeInfo');
        const activeSeatList = document.getElementById('activeSeatList');
        
        // Lấy danh sách các ghế được người dùng khác chọn (không bao gồm ghế của người dùng hiện tại)
        const otherSeats = Object.entries(otherUsersSeats)
            .filter(([seatId]) => !selectedSeats.some(s => s.id === seatId));
        
        if (otherSeats.length > 0) {
            realtimeInfo.style.display = 'block';
            activeSeatList.innerHTML = '';
            
            otherSeats.forEach(([seatId, userData]) => {
                const badge = document.createElement('div');
                badge.style.cssText = `
                    background: #ff6b6b;
                    color: white;
                    padding: 8px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: bold;
                `;
                badge.innerHTML = `👤 ${userData.userName} - Ghế ${seatId}`;
                activeSeatList.appendChild(badge);
            });
        } else {
            realtimeInfo.style.display = 'none';
        }
    }

    // ======================== PHẦN 5: ZOOM FUNCTIONALITY ========================
    // 4. Zoom Functionality - Phóng to/thu nhỏ sơ đồ ghế
    const seatMap = document.getElementById('seatMap');
    let currentScale = 1;
    
    document.getElementById('zoomIn').addEventListener('click', () => {
        currentScale = Math.min(currentScale + 0.1, 1.5);
        seatMap.style.transform = `scale(${currentScale})`;
    });
    
    document.getElementById('zoomOut').addEventListener('click', () => {
        currentScale = Math.max(currentScale - 0.1, 0.5);
        seatMap.style.transform = `scale(${currentScale})`;
    });

    // ======================== PHẦN 6: PAYMENT MODAL ========================
    // 5. Logic Thanh Toán
    const paymentOverlay = document.getElementById('paymentOverlay');
    const closePayment = document.getElementById('closePayment');
    const bankGrid = document.getElementById('bankGrid');
    const payNowBtn = document.getElementById('payNowBtn');

    // Danh sách các phương thức thanh toán
    const banks = [
        { name: 'MoMo', icon: 'https://img.icons8.com/color/48/momo_messenger.png' },
        { name: 'MB Bank', icon: 'https://img.icons8.com/ios-filled/50/ffffff/bank.png' },
        { name: 'VNPay', icon: 'https://img.icons8.com/color/48/vnpay.png' },
        { name: 'ZaloPay', icon: 'https://img.icons8.com/color/48/zalo.png' },
        { name: 'VietcomBank', icon: 'https://img.icons8.com/ios-filled/50/ffffff/museum.png' },
        { name: 'TechcomBank', icon: 'https://img.icons8.com/ios-filled/50/ffffff/account.png' },
        { name: 'ACB', icon: 'https://img.icons8.com/ios-filled/50/ffffff/wallet--v1.png' },
        { name: 'TPBank', icon: 'https://img.icons8.com/ios-filled/50/ffffff/safe.png' },
        { name: 'Agribank', icon: 'https://img.icons8.com/ios-filled/50/ffffff/card-security.png' },
        { name: 'BIDV', icon: 'https://img.icons8.com/ios-filled/50/ffffff/money-transfer.png' }
    ];

    /**
     * Render danh sách các phương thức thanh toán
     */
    function renderBanks() {
        bankGrid.innerHTML = '';
        banks.forEach(bank => {
            const item = document.createElement('div');
            item.className = 'bank-item';
            item.innerHTML = `<img src="${bank.icon}" alt="${bank.name}"><span>${bank.name}</span>`;
            item.addEventListener('click', () => {
                document.querySelectorAll('.bank-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                payNowBtn.disabled = false;
            });
            bankGrid.appendChild(item);
        });
    }

    /**
     * Mở modal thanh toán
     */
    function openPaymentModal() {
        document.getElementById('pMovieTitle').innerText = document.getElementById('fMovieTitle').innerText;
        document.getElementById('pAge').innerText = document.getElementById('fAge').innerText;
        document.getElementById('pDateTime').innerText = document.getElementById('fDateTime').innerText;
        document.getElementById('pHall').innerText = document.getElementById('fHall').innerText;
        document.getElementById('pSeats').innerText = document.getElementById('fSeats').innerText;
        document.getElementById('pPrice').innerText = document.getElementById('fPrice').innerText;
        renderBanks();
        paymentOverlay.style.display = 'flex';
    }

    // Đóng modal thanh toán
    closePayment.addEventListener('click', () => paymentOverlay.style.display = 'none');

    /**
     * Xử lý thanh toán
     */
    payNowBtn.addEventListener('click', () => {
        const selectedBankElem = document.querySelector('.bank-item.selected');
        const selectedBank = selectedBankElem.querySelector('span').innerText;
        const selectedBankIcon = selectedBankElem.querySelector('img').src;
        
        const now = new Date();
        const transactionId = Math.floor(100000 + Math.random() * 900000);
        const paymentDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
        const paymentTime = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        const bookingData = JSON.parse(localStorage.getItem('bookingData'));
        const newTransaction = {
            id: transactionId,
            movieTitle: document.getElementById('pMovieTitle').innerText,
            moviePoster: bookingData ? bookingData.moviePoster : '',
            showDate: document.getElementById('pDateTime').innerText,
            room: document.getElementById('pHall').innerText,
            seats: document.getElementById('pSeats').innerText,
            total: document.getElementById('pPrice').innerText,
            bankName: selectedBank,
            bankIcon: selectedBankIcon,
            paymentDate: paymentDate,
            paymentTime: paymentTime,
            cinemaName: "CGV Vincom Biên Hòa",
            cinemaAddress: "Tầng 4, Vincom Plaza Biên Hòa, 1096 Phạm Văn Thuận, Tân Mai, Biên Hòa, Đồng Nai"
        };
        
        let history = JSON.parse(localStorage.getItem('transactionHistory')) || [];
        history.unshift(newTransaction);
        localStorage.setItem('transactionHistory', JSON.stringify(history));
        
        alert(`✅ Thanh toán thành công!\nMã giao dịch: ${transactionId}`);
        window.location.href = '../LichSu/History.html';
    });

    // ======================== PHẦN 7: NAVIGATION ========================
    // Nút Quay lại
    document.getElementById('backBtn').addEventListener('click', () => {
        const data = JSON.parse(localStorage.getItem('selectedShowtime') || localStorage.getItem('bookingData') || 'null');
        if (data?.MaPhim) localStorage.setItem('selectedMovieId', data.MaPhim);
        window.location.href = '../ChiTietPhim/MovieDetail.html';
    });

    /**
     * Xử lý nút "ĐẶT VÉ" (Confirm Booking)
     * - Kiểm tra đã chọn ghế chưa
     * - Kiểm tra đã đăng nhập chưa
     * - Mở modal thanh toán
     */
    document.getElementById('confirmBooking').addEventListener('click', () => {
        if (selectedSeats.length === 0) { 
            alert('❌ Vui lòng chọn ít nhất một chỗ ngồi!'); 
            return; 
        }
        
        // KIỂM TRA ĐĂNG NHẬP
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            alert('❌ Bạn cần đăng nhập để tiếp tục thanh toán!');
            localStorage.setItem('returnUrl', window.location.href);
            window.location.href = '../Login/Login.html';
            return;
        }
        
        openPaymentModal();
    });

    // Khởi tạo sơ đồ ghế
    generateGrid();
});
