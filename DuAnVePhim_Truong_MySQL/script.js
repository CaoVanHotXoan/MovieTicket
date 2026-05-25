// script.js
/**
 * FILE: script.js
 * Chứa logic xử lý hiệu ứng giao diện (Banner, Carousel)
 * Các logic kết nối dữ liệu đã được chuyển sang api.js
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. HOẠT ẢNH BANNER (Slide đổi ảnh trang chủ)
    setupBannerSlider();
});

// Hàm khởi tạo hoạt ảnh slider cho banner (gọi từ api.js sau khi tải dữ liệu động)
function setupBannerSlider() {
    const slides = document.querySelectorAll('.banner-slide');
    if (slides.length > 0) {
        let currentSlide = 0;
        const slideIntervalTime = 5000; // 5 giây đổi ảnh 1 lần
        let slideInterval;

        const resetInterval = () => {
            clearInterval(slideInterval);
            slideInterval = setInterval(nextSlide, slideIntervalTime);
        };

        const showSlide = (index) => {
            slides.forEach(s => s.classList.remove('active'));
            slides[index].classList.add('active');
        };

        const nextSlide = () => {
            currentSlide = (currentSlide + 1) % slides.length;
            showSlide(currentSlide);
            resetInterval();
        };

        const prevSlide = () => {
            currentSlide = (currentSlide - 1 + slides.length) % slides.length;
            showSlide(currentSlide);
            resetInterval();
        };

        const nextBtn = document.getElementById('bannerNext');
        const prevBtn = document.getElementById('bannerPrev');
        
        if (nextBtn) {
            const newNextBtn = nextBtn.cloneNode(true);
            nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
            newNextBtn.addEventListener('click', nextSlide);
        }
        if (prevBtn) {
            const newPrevBtn = prevBtn.cloneNode(true);
            prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
            newPrevBtn.addEventListener('click', prevSlide);
        }

        // Khởi chạy vòng lặp slide
        resetInterval();
    }
}

// 2. SLIDER PHIM (CAROUSEL TRƯỢT HÌNH)
// Hàm này được gọi từ api.js sau khi dữ liệu phim thật đã được tải xong
function setupCarousel(trackId) {
    const track = document.getElementById(trackId);
    if (!track) return;

    const wrapper = track.closest('.carousel-wrapper');
    if (!wrapper) return;
    
    const prevBtn = wrapper.querySelector('.prev-btn');
    const nextBtn = wrapper.querySelector('.next-btn');
    
    // Đợi một chút để card phim được render xong
    setTimeout(() => {
        const items = track.querySelectorAll('.movie-card');
        if (items.length === 0) return;

        let currentIndex = 0;
        const itemsToDisplay = 3; 
        const maxIndex = Math.max(0, items.length - itemsToDisplay);

        const updateTrackPosition = () => {
            const itemWidth = items[0].getBoundingClientRect().width;
            // Tính toán khoảng cách (gap) giữa các card
            const gap = items.length > 1 ? (items[1].getBoundingClientRect().left - items[0].getBoundingClientRect().right) : 0;
            const moveAmount = itemWidth + gap;
            track.style.transform = `translateX(-${currentIndex * moveAmount}px)`;
        };

        // Gắn sự kiện cho nút Next
        const newNextBtn = nextBtn.cloneNode(true);
        nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
        newNextBtn.addEventListener('click', () => {
            currentIndex = (currentIndex < maxIndex) ? currentIndex + 1 : 0;
            updateTrackPosition();
        });

        // Gắn sự kiện cho nút Prev
        const newPrevBtn = prevBtn.cloneNode(true);
        prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
        newPrevBtn.addEventListener('click', () => {
            currentIndex = (currentIndex > 0) ? currentIndex - 1 : maxIndex;
            updateTrackPosition();
        });

        // Cập nhật khi resize trình duyệt
        window.addEventListener('resize', updateTrackPosition);
        updateTrackPosition();
    }, 500);
}
