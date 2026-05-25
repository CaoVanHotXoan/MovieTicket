/* ========================================================
   FILE JS: AboutUs.js
   Xử lý đóng/mở modal và hiển thị thông tin thành viên
   ======================================================== */

// Dữ liệu mô phỏng cho các thành viên
const teamData = {
    "1": {
        name: "CAO VĂN HỘT XOÀN",
        role: "TEAM LEADER_BACKEND DEVELOPER",
        img: "img/Xoan.jpg",
        desc: "Tôi là một Backend Developer với kinh nghiệm làm việc với các công nghệ web hiện đại như Node.js, Express, và MongoDB. Tôi đã tham gia vào việc phát triển các trang web cho nhiều khách hàng khác nhau, bao gồm các công ty khởi nghiệp, doanh nghiệp vừa và nhỏ, và các tổ chức phi lợi nhuận."
    },
    "2": {
        name: "PHẠM TIẾN DOANH",
        role: "FRONTEND DEVELOPER",
        img: "img/Doanh.jpg",
        desc: "Tôi là một Frontend Developer với kinh nghiệm làm việc với các công nghệ web hiện đại như React, Vue, và Angular. Tôi đã tham gia vào việc phát triển các trang web cho nhiều khách hàng khác nhau, bao gồm các công ty khởi nghiệp, doanh nghiệp vừa và nhỏ, và các tổ chức phi lợi nhuận. Tôi có kinh nghiệm làm việc với các công nghệ web hiện đại như React, Vue, và Angular. Tôi đã tham gia vào việc phát triển các trang web cho nhiều khách hàng khác nhau, bao gồm các công ty khởi nghiệp, doanh nghiệp vừa và nhỏ, và các tổ chức phi lợi nhuận."
    }
};

// Lấy các phần tử DOM cần thiết
const cards = document.querySelectorAll('.team-card');
const modal = document.getElementById('memberModal');
const closeBtn = document.getElementById('closeModal');

const modalImg = document.getElementById('modalImg');
const modalName = document.getElementById('modalName');
const modalRole = document.getElementById('modalRole');
const modalDesc = document.getElementById('modalDesc');

// Hàm mở modal và đổ dữ liệu
function openModal(memberId) {
    const data = teamData[memberId];
    if (data) {
        modalImg.src = data.img;
        modalName.textContent = data.name;
        modalRole.textContent = data.role;
        modalDesc.textContent = data.desc;

        modal.style.display = 'flex';
        // Ngăn cuộn trang khi mở modal
        document.body.style.overflow = 'hidden';
    }
}

// Hàm đóng modal
function closeModal() {
    modal.style.display = 'none';
    // Cho phép cuộn lại trang
    document.body.style.overflow = 'auto';
}

// Gán sự kiện click cho mỗi card
cards.forEach(card => {
    card.addEventListener('click', () => {
        const memberId = card.getAttribute('data-member');
        openModal(memberId);
    });
});

// Gán sự kiện cho nút đóng
closeBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Ngăn sự kiện lan tới các phần tử cha nếu có
    closeModal();
});

// Đóng modal khi bấm ra ngoài vùng nội dung (overlay)
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

// Hỗ trợ phím ESC để đóng modal
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
        closeModal();
    }
});
