// History.js - Xử lý hiển thị lịch sử giao dịch

document.addEventListener('DOMContentLoaded', () => {
    const historyList = document.getElementById('historyList');
    const historyModal = document.getElementById('historyModal');
    const closeHistoryModal = document.getElementById('closeHistoryModal');

    // 1. Tải lịch sử từ localStorage
    const transactionHistory = JSON.parse(localStorage.getItem('transactionHistory')) || [];

    function renderHistory() {
        if (transactionHistory.length === 0) {
            historyList.innerHTML = '<div class="no-history">Bạn chưa có giao dịch nào hoàn tất.</div>';
            return;
        }

        historyList.innerHTML = '';
        transactionHistory.forEach((item, index) => {
            const bar = document.createElement('div');
            bar.className = 'history-item-bar';
            bar.innerHTML = `
                <img src="${item.moviePoster || 'https://placehold.co/70x100/111/FFF?text=No+Poster'}" class="bar-poster" alt="Poster">
                <div class="bar-info">
                    <div style="flex: 2;">
                        <h3 class="bar-movie-name">${item.movieTitle}</h3>
                        <p class="bar-cinema">${item.cinemaName || 'CGV Cinema'}</p>
                    </div>
                    <div class="bar-meta">
                        <span>Ngày: ${item.showDate.split(' - ')[0]}</span>
                        <span>Giờ: ${item.showDate.split(' - ')[1]}</span>
                    </div>
                    <div class="bar-total">${item.total}</div>
                </div>
            `;
            
            bar.addEventListener('click', () => showDetail(item));
            historyList.appendChild(bar);
        });
    }

    function showDetail(item) {
        // Điền thông tin vào modal
        document.getElementById('mPaymentDate').innerText = item.paymentDate;
        document.getElementById('mPaymentTime').innerText = item.paymentTime;
        document.getElementById('mTransactionId').innerText = `#${item.id}`;
        document.getElementById('mMovieTitle').innerText = item.movieTitle;
        document.getElementById('mCinemaName').innerText = item.cinemaName || "CGV Vincom Biên Hòa";
        document.getElementById('mCinemaAddress').innerText = item.cinemaAddress || "Tầng 4, Vincom Plaza Biên Hòa, Đồng Nai";
        document.getElementById('mShowDate').innerText = item.showDate;
        document.getElementById('mHall').innerText = item.room;
        document.getElementById('mSeats').innerText = item.seats;
        document.getElementById('mTotalAmount').innerText = item.total;
        document.getElementById('mBankName').innerText = item.bankName;
        document.getElementById('mBankIcon').src = item.bankIcon;

        // Hiện modal
        historyModal.style.display = 'flex';
    }

    // Đóng modal
    closeHistoryModal.addEventListener('click', () => {
        historyModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === historyModal) {
            historyModal.style.display = 'none';
        }
    });

    // Khởi tạo
    renderHistory();
});
