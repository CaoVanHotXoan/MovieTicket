// script.js
/**
 * FILE: script.js
 * Chứa logic xử lý hiệu ứng giao diện (Banner, Carousel)
 * Các logic kết nối dữ liệu đã được chuyển sang api.js
 */

document.addEventListener('DOMContentLoaded', () => {
    setupResponsiveHamburgerMenu();
    // 1. HOẠT ẢNH BANNER (Slide đổi ảnh trang chủ)
    setupBannerSlider();
});

function setupResponsiveHamburgerMenu() {
    const header = document.querySelector('.main-header');
    const container = header?.querySelector('.header-container');
    const nav = header?.querySelector('.header-center');
    const headerRight = header?.querySelector('.header-right');
    const searchBox = header?.querySelector('.search-box');
    if (!header || !container || !nav) return;

    let mobileSearchSlot = nav.querySelector('.mobile-search-slot');
    if (!mobileSearchSlot) {
        mobileSearchSlot = document.createElement('div');
        mobileSearchSlot.className = 'mobile-search-slot';
        nav.insertBefore(mobileSearchSlot, nav.firstChild);
    }

    if (!container.querySelector('.hamburger-toggle')) {
        const hamburgerBtn = document.createElement('button');
        hamburgerBtn.type = 'button';
        hamburgerBtn.className = 'hamburger-toggle';
        hamburgerBtn.setAttribute('aria-label', 'Mở menu điều hướng');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
        hamburgerBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
        container.insertBefore(hamburgerBtn, container.firstChild);

        hamburgerBtn.addEventListener('click', () => {
            const isOpen = header.classList.toggle('mobile-menu-open');
            hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
        });

        document.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof Node)) return;
            if (!header.contains(target)) {
                header.classList.remove('mobile-menu-open');
                hamburgerBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    const dropdownLink = nav.querySelector('.dropdown > a');
    const dropdownItem = nav.querySelector('.dropdown');
    if (dropdownLink && dropdownItem) {
        dropdownLink.addEventListener('click', (event) => {
            if (window.innerWidth >= 1025) return;
            event.preventDefault();
            dropdownItem.classList.toggle('mobile-open');
        });
    }

    const relocateSearchBox = () => {
        if (!searchBox || !headerRight || !mobileSearchSlot) return;
        if (window.innerWidth < 640) {
            if (searchBox.parentElement !== mobileSearchSlot) {
                mobileSearchSlot.appendChild(searchBox);
            }
        } else if (searchBox.parentElement !== headerRight) {
            headerRight.insertBefore(searchBox, headerRight.firstChild);
        }
    };

    relocateSearchBox();

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1025) {
            header.classList.remove('mobile-menu-open');
            dropdownItem?.classList.remove('mobile-open');
            const btn = container.querySelector('.hamburger-toggle');
            btn?.setAttribute('aria-expanded', 'false');
        }
        relocateSearchBox();
    });
}

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

        const getItemsToDisplay = () => {
            const w = window.innerWidth;
            if (w >= 1025) return 3;
            if (w >= 768) return 2;
            return 2; /* mobile: 2 poster nhỏ / hàng */
        };

        const getMaxIndex = () => Math.max(0, items.length - getItemsToDisplay());

        const updateTrackPosition = () => {
            const maxIndex = getMaxIndex();
            if (currentIndex > maxIndex) currentIndex = maxIndex;
            const itemWidth = items[0].getBoundingClientRect().width;
            const gap = items.length > 1
                ? (items[1].getBoundingClientRect().left - items[0].getBoundingClientRect().right)
                : 0;
            const moveAmount = itemWidth + gap;
            track.style.transform = `translateX(-${currentIndex * moveAmount}px)`;
        };

        // Gắn sự kiện cho nút Next
        const newNextBtn = nextBtn.cloneNode(true);
        nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
        newNextBtn.addEventListener('click', () => {
            const maxIndex = getMaxIndex();
            currentIndex = (currentIndex < maxIndex) ? currentIndex + 1 : 0;
            updateTrackPosition();
        });

        // Gắn sự kiện cho nút Prev
        const newPrevBtn = prevBtn.cloneNode(true);
        prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
        newPrevBtn.addEventListener('click', () => {
            const maxIndex = getMaxIndex();
            currentIndex = (currentIndex > 0) ? currentIndex - 1 : maxIndex;
            updateTrackPosition();
        });

        // Cập nhật khi resize trình duyệt
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(updateTrackPosition, 150);
        });
        updateTrackPosition();
    }, 500);
}
