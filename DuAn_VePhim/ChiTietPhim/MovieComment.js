/**
 * FILE: MovieComment.js
 * Chức năng: Xử lý logic nghiệp vụ cho hệ thống bình luận, đánh giá sao, thích và trả lời bình luận.
 * Lưu trữ: Sử dụng localStorage để lưu dữ liệu riêng cho từng phim theo MaPhim.
 * Ghi chú: Code được viết rõ ràng, chú thích chi tiết bằng tiếng Việt.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. KHỞI TẠO CÁC BIẾN TOÀN CỤC & DOM ELEMENTS
    const movieId = localStorage.getItem('selectedMovieId') || 'default'; // Lấy ID phim đang xem
    const currentUser = JSON.parse(localStorage.getItem('currentUser')); // Kiểm tra thông tin người dùng đăng nhập

    const commentsList = document.getElementById('commentsList');
    const newCommentText = document.getElementById('newCommentText');
    const submitCommentBtn = document.getElementById('submitCommentBtn');
    
    const starRatingInput = document.getElementById('starRatingInput');
    const ratingStars = starRatingInput.querySelectorAll('i');
    const ratingDescription = document.getElementById('ratingDescription');
    
    const commentUserIdentity = document.getElementById('commentUserIdentity');
    const guestNameContainer = document.getElementById('guestNameContainer');
    const guestNickname = document.getElementById('guestNickname');

    let selectedRating = 0; // Biến lưu trữ số sao người dùng đã chọn (1 - 5)
    
    // Bảng tên mô tả cho từng mức sao đánh giá
    const ratingTexts = {
        1: 'Rất tệ',
        2: 'Tệ',
        3: 'Bình thường',
        4: 'Hay',
        5: 'Tuyệt vời!'
    };

    // 2. CẤU HÌNH THÔNG TIN NGƯỜI DÙNG BÌNH LUẬN (MEMBER vs GUEST)
    function setupUserIdentity() {
        if (currentUser) {
            // Nếu người dùng đã đăng nhập: Hiển thị tên tài khoản, ẩn phần nhập tên khách
            commentUserIdentity.innerHTML = `
                <span class="avatar-placeholder"><i class="fa-solid fa-user-tie"></i></span>
                <span class="identity-text">Đang bình luận với vai trò thành viên: <strong>${currentUser.Ten}</strong></span>
            `;
            guestNameContainer.style.display = 'none';
        } else {
            // Nếu chưa đăng nhập: Hiển thị vai trò Khách và hiện ô để nhập biệt danh
            commentUserIdentity.innerHTML = `
                <span class="avatar-placeholder"><i class="fa-solid fa-user"></i></span>
                <span class="identity-text">Đang bình luận với vai trò: <strong>Khách</strong></span>
            `;
            guestNameContainer.style.display = 'flex';
            
            // Lấy tên khách đã từng nhập trước đó (nếu có)
            const savedGuestName = localStorage.getItem('guestNickname');
            if (savedGuestName) {
                guestNickname.value = savedGuestName;
            }
        }
    }

    // 3. XỬ LÝ SỰ KIỆN KHUNG ĐÁNH GIÁ 5 SAO (STAR RATING WIDGET)
    function setupStarRating() {
        ratingStars.forEach(star => {
            // Khi rê chuột vào sao: Làm sáng các sao từ 1 đến sao đang hover
            star.addEventListener('mouseover', function() {
                const hoverValue = parseInt(this.getAttribute('data-value'));
                highlightStars(hoverValue, 'hover');
                ratingDescription.innerText = ratingTexts[hoverValue] || 'Chưa đánh giá';
            });

            // Khi chuột rời khỏi khu vực sao: Trả lại trạng thái các sao đã chọn (click)
            star.addEventListener('mouseout', function() {
                resetStars();
                if (selectedRating > 0) {
                    highlightStars(selectedRating, 'active');
                    ratingDescription.innerText = ratingTexts[selectedRating];
                } else {
                    ratingDescription.innerText = 'Chưa đánh giá';
                }
            });

            // Khi click chọn sao: Ghi nhận điểm số đánh giá
            star.addEventListener('click', function() {
                selectedRating = parseInt(this.getAttribute('data-value'));
                resetStars();
                highlightStars(selectedRating, 'active');
                ratingDescription.innerText = ratingTexts[selectedRating];
            });
        });
    }

    // Tô sáng sao bằng cách thêm class (hover hoặc active) và đổi icon từ regular sang solid
    function highlightStars(count, className) {
        ratingStars.forEach(star => {
            const starVal = parseInt(star.getAttribute('data-value'));
            if (starVal <= count) {
                star.classList.add(className);
                star.classList.remove('fa-regular');
                star.classList.add('fa-solid');
            }
        });
    }

    // Trả lại trạng thái mặc định (sao rỗng) cho toàn bộ các ngôi sao
    function resetStars() {
        ratingStars.forEach(star => {
            star.classList.remove('hover', 'active');
            star.classList.remove('fa-solid');
            star.classList.add('fa-regular');
        });
    }


    // 4. DỮ LIỆU MẪU (SEED DATA) CHO BÌNH LUẬN NẾU PHIM CHƯA CÓ BÌNH LUẬN NÀO
    function getSeededComments() {
        const defaultComments = [
            {
                id: 'c1',
                author: 'Hoàng Long',
                isMember: true,
                rating: 5,
                content: 'Phim quá xuất sắc! Đồ họa và hiệu ứng âm thanh đỉnh cao, đặc biệt là cốt truyện có chiều sâu hơn phần trước rất nhiều. Rất đáng tiền ra rạp coi phim này!',
                timestamp: Date.now() - 3600000 * 2, // 2 giờ trước
                likes: 18,
                likedByMe: false,
                replies: [
                    {
                        id: 'r1_1',
                        author: 'Khánh Linh',
                        isMember: true,
                        content: 'Đồng ý với bạn nè, đoạn cuối phim làm mình nổi da gà luôn á!',
                        timestamp: Date.now() - 3600000 * 1.5,
                        likes: 4,
                        likedByMe: false
                    }
                ]
            },
            {
                id: 'c2',
                author: 'Minh Tuấn (Guest)',
                isMember: false,
                rating: 4,
                content: 'Hành động kịch tính, nhịp phim nhanh cuốn hút từ đầu đến cuối. Tuy nhiên có một vài chỗ giải thích vũ trụ hơi nhanh làm người chưa đọc truyện hơi khó bắt kịp.',
                timestamp: Date.now() - 3600000 * 5, // 5 giờ trước
                likes: 8,
                likedByMe: false,
                replies: []
            }
        ];
        return defaultComments;
    }

    // Lấy danh sách bình luận từ localStorage, nếu trống thì tạo dữ liệu mẫu
    function getComments() {
        const storageKey = `comments_movie_${movieId}`;
        let comments = localStorage.getItem(storageKey);
        
        if (!comments) {
            comments = getSeededComments();
            localStorage.setItem(storageKey, JSON.stringify(comments));
        } else {
            comments = JSON.parse(comments);
        }
        return comments;
    }

    // Lưu danh sách bình luận mới vào localStorage
    function saveComments(comments) {
        const storageKey = `comments_movie_${movieId}`;
        localStorage.setItem(storageKey, JSON.stringify(comments));
    }


    // 5. CÔNG CỤ TÍNH THỜI GIAN ĐÃ TRÔI QUA (TIME AGO FORMATTER)
    function timeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) {
            return 'Vừa xong';
        } else if (minutes < 60) {
            return `${minutes} phút trước`;
        } else if (hours < 24) {
            return `${hours} giờ trước`;
        } else if (days < 7) {
            return `${days} ngày trước`;
        } else {
            const date = new Date(timestamp);
            return date.toLocaleDateString('vi-VN');
        }
    }


    // 6. HIỂN THỊ DANH SÁCH BÌNH LUẬN RA GIAO DIỆN (RENDER COMMENTS)
    function renderComments() {
        const comments = getComments();
        commentsList.innerHTML = ''; // Xóa sạch danh sách cũ

        if (comments.length === 0) {
            commentsList.innerHTML = `
                <div class="no-comments-message">
                    <i class="fa-regular fa-comments"></i>
                    <p>Chưa có bình luận nào cho phim này. Hãy là người đầu tiên chia sẻ cảm nghĩ của bạn!</p>
                </div>
            `;
            return;
        }

        // Duyệt qua từng bình luận cha
        comments.forEach(comment => {
            const commentItem = document.createElement('div');
            commentItem.className = 'comment-item';
            commentItem.dataset.id = comment.id;

            // Tạo chuỗi sao HTML hiển thị điểm đánh giá của người dùng
            let starsHTML = '';
            for (let i = 1; i <= 5; i++) {
                if (i <= comment.rating) {
                    starsHTML += '<i class="fa-solid fa-star"></i>'; // Sao đặc
                } else {
                    starsHTML += '<i class="fa-regular fa-star"></i>'; // Sao rỗng
                }
            }

            // Giao diện bình luận cha
            let repliesHTML = '';
            if (comment.replies && comment.replies.length > 0) {
                repliesHTML = `<div class="replies-container">`;
                comment.replies.forEach(reply => {
                    repliesHTML += `
                        <div class="reply-item" data-id="${reply.id}">
                            <div class="reply-header">
                                <span class="reply-author-name">
                                    <i class="fa-regular fa-user" style="margin-right: 5px; font-size: 11px;"></i>
                                    ${reply.author} ${reply.isMember ? '<span style="font-size: 10px; background: #333; padding: 2px 6px; border-radius: 4px; margin-left: 5px;">Thành viên</span>' : ''}
                                </span>
                                <span class="reply-time">${timeAgo(reply.timestamp)}</span>
                            </div>
                            <div class="reply-text">${escapeHTML(reply.content)}</div>
                            <div class="reply-actions">
                                <button class="action-btn reply-like-btn ${reply.likedByMe ? 'liked' : ''}" onclick="toggleLikeReply('${comment.id}', '${reply.id}')">
                                    <i class="${reply.likedByMe ? 'fa-solid' : 'fa-regular'} fa-heart"></i> Thích (${reply.likes || 0})
                                </button>
                            </div>
                        </div>
                    `;
                });
                repliesHTML += `</div>`;
            }

            // Lắp ráp bình luận cha
            commentItem.innerHTML = `
                <div class="comment-header">
                    <div class="comment-author-info">
                        <div class="avatar-placeholder">
                            <i class="fa-solid ${comment.isMember ? 'fa-user-tie' : 'fa-user'}"></i>
                        </div>
                        <div>
                            <span class="comment-author-name">${comment.author}</span>
                            ${comment.isMember ? '<span style="font-size: 11px; background: #222; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">Thành viên</span>' : ''}
                            <span class="comment-time" style="margin-left: 10px;">${timeAgo(comment.timestamp)}</span>
                        </div>
                    </div>
                    <div class="comment-rating" title="Đánh giá ${comment.rating}/5 sao">
                        ${starsHTML}
                    </div>
                </div>
                <div class="comment-text">${escapeHTML(comment.content)}</div>
                <div class="comment-actions">
                    <button class="action-btn comment-like-btn ${comment.likedByMe ? 'liked' : ''}" onclick="toggleLikeComment('${comment.id}')">
                        <i class="${comment.likedByMe ? 'fa-solid' : 'fa-regular'} fa-heart"></i> Hữu ích (${comment.likes})
                    </button>
                    <button class="action-btn comment-reply-trigger-btn" onclick="showReplyForm('${comment.id}')">
                        <i class="fa-regular fa-comment-dots"></i> Phản hồi
                    </button>
                </div>
                <!-- Vùng chứa form reply động -->
                <div class="reply-form-wrapper" id="replyFormWrapper_${comment.id}"></div>
                <!-- Các phản hồi của bình luận này -->
                ${repliesHTML}
            `;

            commentsList.appendChild(commentItem);
        });
    }

    // Hàm tránh lỗi bảo mật XSS bằng cách mã hóa các thẻ HTML
    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }


    // 7. THÊM BÌNH LUẬN MỚI
    submitCommentBtn.addEventListener('click', () => {
        const content = newCommentText.value.trim();
        
        // Kiểm tra hợp lệ dữ liệu nhập
        if (selectedRating === 0) {
            alert('Vui lòng chọn số sao đánh giá cho bộ phim này!');
            return;
        }
        if (content === '') {
            alert('Vui lòng viết bình luận trước khi gửi!');
            return;
        }

        let authorName = '';
        let isMember = false;

        if (currentUser) {
            authorName = currentUser.Ten;
            isMember = true;
        } else {
            const nickname = guestNickname.value.trim();
            if (nickname === '') {
                authorName = 'Khách ẩn danh';
            } else {
                authorName = nickname;
                // Lưu lại biệt danh để lần bình luận sau không phải gõ lại
                localStorage.setItem('guestNickname', nickname);
            }
        }

        // Tạo đối tượng bình luận mới
        const newComment = {
            id: 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            author: authorName,
            isMember: isMember,
            rating: selectedRating,
            content: content,
            timestamp: Date.now(),
            likes: 0,
            likedByMe: false,
            replies: []
        };

        // Đọc danh sách cũ, đẩy bình luận mới lên đầu danh sách và lưu trữ
        const comments = getComments();
        comments.unshift(newComment);
        saveComments(comments);

        // Reset các trường nhập liệu
        newCommentText.value = '';
        selectedRating = 0;
        resetStars();
        ratingDescription.innerText = 'Chưa đánh giá';

        // Vẽ lại danh sách bình luận
        renderComments();
    });


    // 8. ĐĂNG KÝ CÁC HÀM XỬ LÝ SỰ KIỆN BÌNH LUẬN VỚI WINDOW SCOPE (Cho việc gọi từ inline onclick)
    
    // Thích / Bỏ thích bình luận cha
    window.toggleLikeComment = function(commentId) {
        const comments = getComments();
        const comment = comments.find(c => c.id === commentId);
        
        if (comment) {
            if (comment.likedByMe) {
                comment.likes = Math.max(0, comment.likes - 1);
                comment.likedByMe = false;
            } else {
                comment.likes += 1;
                comment.likedByMe = true;
            }
            saveComments(comments);
            renderComments();
        }
    };

    // Thích / Bỏ thích bình luận con (trả lời)
    window.toggleLikeReply = function(commentId, replyId) {
        const comments = getComments();
        const comment = comments.find(c => c.id === commentId);
        
        if (comment && comment.replies) {
            const reply = comment.replies.find(r => r.id === replyId);
            if (reply) {
                if (reply.likedByMe) {
                    reply.likes = Math.max(0, reply.likes - 1);
                    reply.likedByMe = false;
                } else {
                    reply.likes += 1;
                    reply.likedByMe = true;
                }
                saveComments(comments);
                renderComments();
            }
        }
    };

    // Hiển thị khung nhập phản hồi (Reply Form) dưới bình luận tương ứng
    window.showReplyForm = function(commentId) {
        const wrapper = document.getElementById(`replyFormWrapper_${commentId}`);
        if (!wrapper) return;

        // Nếu form đã mở thì tắt đi, ngược lại thì mở ra
        if (wrapper.innerHTML !== '') {
            wrapper.innerHTML = '';
            return;
        }

        // Đóng các form reply khác đang mở để giữ giao diện gọn gàng
        document.querySelectorAll('.reply-form-wrapper').forEach(el => {
            el.innerHTML = '';
        });

        // Tạo khung HTML của form phản hồi
        wrapper.innerHTML = `
            <div class="reply-form">
                <textarea id="replyText_${commentId}" placeholder="Viết phản hồi cho bình luận này..."></textarea>
                <div class="reply-form-actions">
                    <button class="btn-cancel-reply" onclick="closeReplyForm('${commentId}')">Hủy bỏ</button>
                    <button class="btn-submit-reply" onclick="submitReply('${commentId}')">Trả lời</button>
                </div>
            </div>
        `;

        // Focus con trỏ vào ô nhập phản hồi vừa hiển thị
        const textarea = document.getElementById(`replyText_${commentId}`);
        if (textarea) textarea.focus();
    };

    // Đóng form phản hồi
    window.closeReplyForm = function(commentId) {
        const wrapper = document.getElementById(`replyFormWrapper_${commentId}`);
        if (wrapper) wrapper.innerHTML = '';
    };

    // Gửi phản hồi mới
    window.submitReply = function(commentId) {
        const textarea = document.getElementById(`replyText_${commentId}`);
        if (!textarea) return;

        const content = textarea.value.trim();
        if (content === '') {
            alert('Vui lòng viết nội dung phản hồi trước khi gửi!');
            return;
        }

        let authorName = '';
        let isMember = false;

        if (currentUser) {
            authorName = currentUser.Ten;
            isMember = true;
        } else {
            const nickname = guestNickname.value.trim();
            if (nickname === '') {
                authorName = 'Khách ẩn danh';
            } else {
                authorName = nickname;
                localStorage.setItem('guestNickname', nickname);
            }
        }

        // Tạo đối tượng phản hồi con
        const newReply = {
            id: 'r_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            author: authorName,
            isMember: isMember,
            content: content,
            timestamp: Date.now(),
            likes: 0,
            likedByMe: false
        };

        const comments = getComments();
        const comment = comments.find(c => c.id === commentId);

        if (comment) {
            if (!comment.replies) comment.replies = [];
            comment.replies.push(newReply); // Thêm phản hồi vào cuối danh sách con
            saveComments(comments);
            renderComments(); // Vẽ lại giao diện
        }
    };


    // 9. CHẠY KHỞI TẠO BAN ĐẦU
    setupUserIdentity();
    setupStarRating();
    renderComments();
});
