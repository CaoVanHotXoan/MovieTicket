/**
 * FILE: MovieComment.js — PHẦN 1: Bình luận phim từ SQL Server (bảng BinhLuan)
 * - Tải bình luận thật qua API /api/binhluan/:maPhim
 * - Chỉ cho phép gử bình luận khi người dùng đã đăng nhập (currentUser trong sessionStorage)
 */

document.addEventListener('DOMContentLoaded', () => {
    const movieId = parseInt(localStorage.getItem('selectedMovieId'), 10);
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || 'null');

    const commentsList = document.getElementById('commentsList');
    const newCommentText = document.getElementById('newCommentText');
    const submitCommentBtn = document.getElementById('submitCommentBtn');
    const commentInputBox = document.querySelector('.comment-input-box');

    const starRatingInput = document.getElementById('starRatingInput');
    const ratingStars = starRatingInput ? starRatingInput.querySelectorAll('i') : [];
    const ratingDescription = document.getElementById('ratingDescription');

    const commentUserIdentity = document.getElementById('commentUserIdentity');
    const guestNameContainer = document.getElementById('guestNameContainer');

    let selectedRating = 0;

    const ratingTexts = {
        1: 'Rất tệ',
        2: 'Tệ',
        3: 'Bình thường',
        4: 'Hay',
        5: 'Tuyệt vời!'
    };

    /** PHẦN 1: Cấu hình giao diện — chỉ thành viên đăng nhập mới được bình luận */
    function setupUserIdentity() {
        if (guestNameContainer) guestNameContainer.style.display = 'none';

        if (currentUser) {
            commentUserIdentity.innerHTML = `
                <span class="avatar-placeholder"><i class="fa-solid fa-user-tie"></i></span>
                <span class="identity-text">Đang bình luận với vai trò thành viên: <strong>${escapeHTML(currentUser.Ten)}</strong></span>
            `;
            if (commentInputBox) commentInputBox.style.display = 'block';
            if (submitCommentBtn) submitCommentBtn.disabled = false;
        } else {
            commentUserIdentity.innerHTML = `
                <span class="avatar-placeholder"><i class="fa-solid fa-user-lock"></i></span>
                <span class="identity-text">Vui lòng <a href="../Login/Login.html" style="color:#ff3d49;font-weight:bold;">đăng nhập</a> để bình luận và đánh giá phim.</span>
            `;
            if (commentInputBox) {
                const ratingGroup = commentInputBox.querySelector('.rating-input-group');
                const textareaContainer = commentInputBox.querySelector('.textarea-container');
                const submitBar = commentInputBox.querySelector('.comment-submit-bar');
                if (ratingGroup) ratingGroup.style.display = 'none';
                if (textareaContainer) textareaContainer.style.display = 'none';
                if (submitBar) submitBar.style.display = 'none';
            }
        }
    }

    /** Widget chọn sao 1–5 */
    function setupStarRating() {
        if (!currentUser || ratingStars.length === 0) return;

        ratingStars.forEach(star => {
            star.addEventListener('mouseover', function () {
                const hoverValue = parseInt(this.getAttribute('data-value'), 10);
                highlightStars(hoverValue, 'hover');
                ratingDescription.innerText = ratingTexts[hoverValue] || 'Chưa đánh giá';
            });

            star.addEventListener('mouseout', function () {
                resetStars();
                if (selectedRating > 0) {
                    highlightStars(selectedRating, 'active');
                    ratingDescription.innerText = ratingTexts[selectedRating];
                } else {
                    ratingDescription.innerText = 'Chưa đánh giá';
                }
            });

            star.addEventListener('click', function () {
                selectedRating = parseInt(this.getAttribute('data-value'), 10);
                resetStars();
                highlightStars(selectedRating, 'active');
                ratingDescription.innerText = ratingTexts[selectedRating];
            });
        });
    }

    function highlightStars(count, className) {
        ratingStars.forEach(star => {
            const starVal = parseInt(star.getAttribute('data-value'), 10);
            if (starVal <= count) {
                star.classList.add(className);
                star.classList.remove('fa-regular');
                star.classList.add('fa-solid');
            }
        });
    }

    function resetStars() {
        ratingStars.forEach(star => {
            star.classList.remove('hover', 'active');
            star.classList.remove('fa-solid');
            star.classList.add('fa-regular');
        });
    }

    /** PHẦN 1: Tải bình luận thật từ API */
    async function loadComments() {
        if (!movieId) {
            commentsList.innerHTML = '<div class="no-comments-message"><p>Không xác định được phim.</p></div>';
            return;
        }

        commentsList.innerHTML = '<div class="no-comments-message"><p>Đang tải bình luận...</p></div>';

        try {
            const res = await fetch(`/api/binhluan/${movieId}`);
            if (!res.ok) throw new Error('Không tải được bình luận');
            const comments = await res.json();
            const validComments = (Array.isArray(comments) ? comments : []).filter(c => {
                const content = (c.NoiDung || '').toString().trim();
                return content.length > 0 && Number(c.SoSao) >= 1;
            });
            renderComments(validComments);
        } catch (err) {
            console.error(err);
            commentsList.innerHTML = '<div class="no-comments-message"><p>Lỗi tải bình luận. Vui lòng thử lại sau.</p></div>';
        }
    }

    /** Hiển thị danh sách bình luận từ database */
    function renderComments(comments) {
        commentsList.innerHTML = '';

        if (!comments || comments.length === 0) {
            commentsList.innerHTML = `
                <div class="no-comments-message">
                    <i class="fa-regular fa-comments"></i>
                    <p>Chưa có bình luận nào cho phim này. Hãy là người đầu tiên chia sẻ cảm nghĩ của bạn!</p>
                </div>
            `;
            return;
        }

        comments.forEach(comment => {
            const content = (comment.NoiDung || '').toString().trim();
            if (!content || Number(comment.SoSao) < 1) return;

            const commentItem = document.createElement('div');
            commentItem.className = 'comment-item';

            let starsHTML = '';
            const rating = comment.SoSao || 0;
            for (let i = 1; i <= 5; i++) {
                starsHTML += i <= rating
                    ? '<i class="fa-solid fa-star"></i>'
                    : '<i class="fa-regular fa-star"></i>';
            }

            const avatarHtml = comment.HinhAnh
                ? `<img src="${escapeHTML(comment.HinhAnh)}" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'">`
                : `<i class="fa-solid fa-user-tie"></i>`;

            const ngay = comment.NgayBL ? new Date(comment.NgayBL) : new Date();

            commentItem.innerHTML = `
                <div class="comment-header">
                    <div class="comment-author-info">
                        <div class="avatar-placeholder">${avatarHtml}</div>
                        <div>
                            <span class="comment-author-name">${escapeHTML(comment.TenKH || 'Thành viên')}</span>
                            <span style="font-size: 11px; background: #222; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">Thành viên</span>
                            <span class="comment-time" style="margin-left: 10px;">${timeAgo(ngay.getTime())}</span>
                        </div>
                    </div>
                    <div class="comment-rating" title="Đánh giá ${rating}/5 sao">${starsHTML}</div>
                </div>
                <div class="comment-text">${escapeHTML(comment.NoiDung || '')}</div>
            `;

            commentsList.appendChild(commentItem);
        });
    }

    function timeAgo(timestamp) {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Vừa xong';
        if (minutes < 60) return `${minutes} phút trước`;
        if (hours < 24) return `${hours} giờ trước`;
        if (days < 7) return `${days} ngày trước`;
        return new Date(timestamp).toLocaleDateString('vi-VN');
    }

    function escapeHTML(str) {
        if (!str) return '';
        return String(str).replace(/[&<>'"]/g,
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }

    /** PHẦN 1: Gửi bình luận mới lên server (POST /api/binhluan) */
    if (submitCommentBtn) {
        submitCommentBtn.addEventListener('click', async () => {
            if (!currentUser) {
                alert('Vui lòng đăng nhập để bình luận!');
                window.location.href = '../Login/Login.html';
                return;
            }
            if (!movieId) {
                alert('Không xác định được phim!');
                return;
            }

            const content = newCommentText.value.trim();
            if (selectedRating === 0) {
                alert('Vui lòng chọn số sao đánh giá cho bộ phim này!');
                return;
            }
            if (content === '') {
                alert('Vui lòng viết bình luận trước khi gửi!');
                return;
            }

            submitCommentBtn.disabled = true;
            try {
                const res = await fetch('/api/binhluan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        MaPhim: movieId,
                        MaKH: currentUser.MaKH,
                        NoiDung: content,
                        SoSao: selectedRating
                    })
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || 'Gửi bình luận thất bại');
                }

                newCommentText.value = '';
                selectedRating = 0;
                resetStars();
                ratingDescription.innerText = 'Chưa đánh giá';
                await loadComments();
            } catch (err) {
                alert(err.message || 'Có lỗi khi gửi bình luận');
            } finally {
                submitCommentBtn.disabled = false;
            }
        });
    }

    setupUserIdentity();
    setupStarRating();
    loadComments();
});
