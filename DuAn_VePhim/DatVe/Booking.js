// Booking.js - Logic Đặt Vé & Thanh Toán

document.addEventListener('DOMContentLoaded', () => {
    // 1. Tải dữ liệu từ localStorage
    const bookingData = JSON.parse(localStorage.getItem('bookingData'));
    if (bookingData) {
        document.getElementById('fMovieTitle').innerText = bookingData.movieTitle;
        document.getElementById('fAge').innerText = bookingData.ageTag;
        document.getElementById('fDateTime').innerText = `${bookingData.day}, ${bookingData.date} - ${bookingData.time}`;
        document.getElementById('fHall').innerText = bookingData.room;
    }

    // 2. Cấu hình giá vé
    const PRICES = {
        regular: 80000,
        vip: 120000,
        sweetbox: 200000,
        centralPremium: 10000
    };

    // 3. Khởi tạo Sơ đồ ghế
    const seatGrid = document.getElementById('seatGrid');
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const cols = 12;
    let selectedSeats = [];

    function generateGrid() {
        seatGrid.innerHTML = '';
        seatGrid.appendChild(document.createElement('div')); 
        for (let c = 1; c <= cols; c++) {
            const colLabel = document.createElement('div');
            colLabel.className = 'row-label';
            colLabel.innerText = c;
            seatGrid.appendChild(colLabel);
        }

        rows.forEach(row => {
            const rowLabel = document.createElement('div');
            rowLabel.className = 'row-label';
            rowLabel.innerText = row;
            seatGrid.appendChild(rowLabel);

            for (let c = 1; c <= cols; c++) {
                if (row === 'J' && c % 2 === 0) continue; 

                const seat = document.createElement('div');
                const seatId = `${row}${c}`;
                seat.className = 'seat';
                seat.dataset.id = seatId;
                seat.innerText = seatId;

                let type = 'regular';
                if (row >= 'F' && row <= 'H') type = 'vip';
                if (row === 'J') type = 'sweetbox';
                const isCentral = (c >= 5 && c <= 8) && row !== 'J';
                
                seat.classList.add(type);
                if (isCentral) seat.classList.add('central');

                if (Math.random() < 0.1) seat.classList.add('booked');

                seat.addEventListener('click', () => toggleSeat(seat, type, isCentral));
                seatGrid.appendChild(seat);
            }
        });
    }

    function toggleSeat(seatElem, type, isCentral) {
        if (seatElem.classList.contains('booked')) return;
        const seatId = seatElem.dataset.id;
        const index = selectedSeats.findIndex(s => s.id === seatId);

        if (index > -1) {
            selectedSeats.splice(index, 1);
            seatElem.classList.remove('selected');
        } else {
            const price = PRICES[type] + (isCentral ? PRICES.centralPremium : 0);
            selectedSeats.push({ id: seatId, price: price });
            seatElem.classList.add('selected');
        }
        updateFooter();
    }

    function updateFooter() {
        const seatsText = selectedSeats.map(s => s.id).join(', ') || '-';
        const totalPrice = selectedSeats.reduce((sum, s) => sum + s.price, 0);
        document.getElementById('fSeats').innerText = seatsText;
        document.getElementById('fPrice').innerText = totalPrice.toLocaleString('vi-VN') + ' VND';
    }

    // 4. Zoom Functionality
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

    // 5. Logic Thanh Toán
    const paymentOverlay = document.getElementById('paymentOverlay');
    const closePayment = document.getElementById('closePayment');
    const bankGrid = document.getElementById('bankGrid');
    const payNowBtn = document.getElementById('payNowBtn');

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

    closePayment.addEventListener('click', () => paymentOverlay.style.display = 'none');

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
        
        alert(`Thanh toán thành công!\nMã giao dịch: ${transactionId}`);
        window.location.href = '../LichSu/History.html';
    });

    document.getElementById('backBtn').addEventListener('click', () => {
        const data = JSON.parse(localStorage.getItem('selectedShowtime') || localStorage.getItem('bookingData') || 'null');
        if (data?.MaPhim) localStorage.setItem('selectedMovieId', data.MaPhim);
        window.location.href = '../ChiTietPhim/MovieDetail.html';
    });
    document.getElementById('confirmBooking').addEventListener('click', () => {
        if (selectedSeats.length === 0) { alert('Vui lòng chọn ít nhất một chỗ ngồi!'); return; }
        
        // KIỂM TRA ĐĂNG NHẬP
        const currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            alert('Bạn cần đăng nhập để tiếp tục thanh toán!');
            localStorage.setItem('returnUrl', window.location.href);
            window.location.href = '../Login/Login.html';
            return;
        }
        
        openPaymentModal();
    });

    generateGrid();
});
