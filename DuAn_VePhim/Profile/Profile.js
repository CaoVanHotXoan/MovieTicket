/**
 * FILE: Profile.js
 * Quản lý toàn bộ logic tương tác và dữ liệu trên giao diện trang Thông Tin Cá Nhân (Profile).
 * Các chức năng chính gồm: Kiểm tra đăng nhập, tải dữ liệu cá nhân, tính toán tổng chi tiêu hội viên,
 * thiết lập thanh tiến trình, chuyển tab, ẩn hiện mật khẩu, và gọi API cập nhật thông tin.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Kiểm tra trạng thái đăng nhập đầu tiên khi tải trang
    const currentUser = checkLoginState();
    if (!currentUser) return;

    // 2. Kích hoạt hoạt ảnh chuyển đổi giữa các tab (Thông tin cá nhân & Thông báo)
    setupTabs();

    // 3. Thiết lập ẩn/hiện mật khẩu khi nhấn icon con mắt
    setupPasswordToggle();

    // 4. Gọi hàm tải thông tin cá nhân và tích lũy chi tiêu từ server
    loadProfileData(currentUser);

    // 5. Cài đặt lắng nghe sự kiện cập nhật thông tin form nhập
    setupProfileUpdate(currentUser);
});

/**
 * HÀM 1: KIỂM TRA ĐĂNG NHẬP
 * Kiểm tra sự tồn tại của currentUser trong localStorage.
 * Nếu không có người dùng đăng nhập thì tự động chuyển hướng ra trang đăng nhập.
 */
function checkLoginState() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        alert('Vui lòng đăng nhập để truy cập trang thông tin cá nhân!');
        window.location.href = '../Login/Login.html';
        return null;
    }
    return user;
}

/**
 * HÀM 2: CHUYỂN ĐỔI TAB (TABS NAVIGATION)
 * Bắt sự kiện click vào các nút Tab để ẩn/hiện vùng nội dung tương ứng.
 * Nếu click vào tab Thông báo thì tự động đánh dấu toàn bộ thông báo đã đọc.
 */
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const notifCountBadge = document.getElementById('notifCount');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTabId = button.getAttribute('data-tab');

            // Xóa active cũ và thêm active mới cho nút tab được chọn
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Ẩn/Hiện nội dung các tab tương ứng
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetTabId) {
                    content.classList.add('active');
                }
            });

            // Nếu người dùng chọn xem thông báo -> Đánh dấu đã xem toàn bộ
            if (targetTabId === 'notif-tab') {
                if (notifCountBadge) {
                    notifCountBadge.style.display = 'none'; // Ẩn số đếm unread
                }
                
                // Xóa trạng thái nổi bật của các thông báo chưa đọc
                document.querySelectorAll('.notification-item').forEach(item => {
                    item.classList.remove('unread');
                    const badge = item.querySelector('.notif-badge');
                    if (badge) badge.remove();
                });
            }
        });
    });
}

/**
 * HÀM 3: ẨN/HIỆN MẬT KHẨU (PASSWORD EYE-TOGGLE)
 * Đổi định dạng của input từ 'password' sang 'text' để hiển thị mật khẩu và ngược lại.
 */
function setupPasswordToggle() {
    // Xử lý nút hiển thị khu vực đổi mật khẩu
    const showChangePasswordBtn = document.getElementById('showChangePasswordBtn');
    const passwordFields = document.getElementById('passwordFields');
    const changePasswordTrigger = document.getElementById('changePasswordTrigger');
    
    if (showChangePasswordBtn && passwordFields && changePasswordTrigger) {
        showChangePasswordBtn.addEventListener('click', () => {
            passwordFields.style.display = 'grid';
            changePasswordTrigger.style.display = 'none';
        });
    }

    // Toggle cho Mật khẩu cũ
    const toggleOldBtn = document.getElementById('toggleOldPasswordBtn');
    const oldPasswordInput = document.getElementById('profileOldPassword');
    const oldEyeIcon = document.getElementById('oldEyeIcon');

    if (toggleOldBtn && oldPasswordInput && oldEyeIcon) {
        toggleOldBtn.addEventListener('click', () => {
            const isPassword = oldPasswordInput.getAttribute('type') === 'password';
            oldPasswordInput.setAttribute('type', isPassword ? 'text' : 'password');
            oldEyeIcon.className = isPassword ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
            toggleOldBtn.title = isPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu';
        });
    }

    // Toggle cho Mật khẩu mới
    const toggleNewBtn = document.getElementById('toggleNewPasswordBtn');
    const newPasswordInput = document.getElementById('profileNewPassword');
    const newEyeIcon = document.getElementById('newEyeIcon');

    if (toggleNewBtn && newPasswordInput && newEyeIcon) {
        toggleNewBtn.addEventListener('click', () => {
            const isPassword = newPasswordInput.getAttribute('type') === 'password';
            newPasswordInput.setAttribute('type', isPassword ? 'text' : 'password');
            newEyeIcon.className = isPassword ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
            toggleNewBtn.title = isPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu';
        });
    }

    // Toggle cho Nhập lại mật khẩu mới
    const toggleConfirmBtn = document.getElementById('toggleConfirmPasswordBtn');
    const confirmPasswordInput = document.getElementById('profileConfirmPassword');
    const confirmEyeIcon = document.getElementById('confirmEyeIcon');

    if (toggleConfirmBtn && confirmPasswordInput && confirmEyeIcon) {
        toggleConfirmBtn.addEventListener('click', () => {
            const isPassword = confirmPasswordInput.getAttribute('type') === 'password';
            confirmPasswordInput.setAttribute('type', isPassword ? 'text' : 'password');
            confirmEyeIcon.className = isPassword ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
            toggleConfirmBtn.title = isPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu';
        });
    }
}

/**
 * HÀM 4: ĐỔ DỮ LIỆU LÊN GIAO DIỆN & TẢI DANH SÁCH HÓA ĐƠN
 * Gán thông tin người dùng hiện tại lên form nhập liệu.
 * Gọi API lấy toàn bộ hóa đơn từ máy chủ để tính tổng tiền tích lũy chi tiêu.
 */
async function loadProfileData(user) {
    // Điền thông tin vào các trường input
    document.getElementById('profileName').value = user.Ten || '';
    document.getElementById('profileEmail').value = user.Email || '';
    
    // Đặt trống các trường mật khẩu để người dùng tự nhập mới
    if (document.getElementById('profileOldPassword')) document.getElementById('profileOldPassword').value = '';
    if (document.getElementById('profileNewPassword')) document.getElementById('profileNewPassword').value = '';
    if (document.getElementById('profileConfirmPassword')) document.getElementById('profileConfirmPassword').value = '';
    
    // Đổi tên hiển thị lớn
    document.getElementById('profileNameDisplay').innerText = user.Ten || 'Người dùng';

    // Tạo ảnh đại diện Placeholder cực đẹp với chữ cái đầu của tên người dùng
    const avatarImg = document.getElementById('profileAvatar');
    if (avatarImg && user.Ten) {
        const firstLetter = user.Ten.trim().charAt(0).toUpperCase();
        avatarImg.src = `https://placehold.co/150x150/111/fff?text=${encodeURIComponent(firstLetter)}`;
    }

    try {
        // Tải danh sách hóa đơn từ API
        const response = await fetch('/api/invoices');
        if (!response.ok) throw new Error('Không lấy được hóa đơn từ máy chủ.');
        
        const invoices = await response.json();
        
        // Lọc danh sách hóa đơn của khách hàng này (khớp MaKH)
        const myInvoices = invoices.filter(inv => inv.MaKH == user.MaKH);
        
        // Tính tổng tiền chi tiêu
        const totalSpent = myInvoices.reduce((sum, inv) => sum + (Number(inv.TongTien) || 0), 0);
        
        // Cập nhật văn bản hiển thị
        document.getElementById('totalSpentText').innerText = totalSpent.toLocaleString('vi-VN') + ' đ';

        // Cập nhật thanh tiến trình theo số tiền tích lũy
        updateSpentProgress(totalSpent, user);

    } catch (error) {
        console.error('Lỗi khi tính tổng chi tiêu:', error);
        // Trạng thái dự phòng khi API lỗi hoặc mất kết nối
        document.getElementById('totalSpentText').innerText = '0 đ';
        updateSpentProgress(0, user);
    }
}

/**
 * HÀM 5: THIẾT LẬP CHIỀU RỘNG TIẾN TRÌNH & HẠNG HỘI VIÊN
 * Chạy hiệu ứng thanh tiến trình (Progress Bar) và thắp sáng các checkpoint.
 * Các mốc hạng hội viên:
 * - Dưới 2.000.000 đ: Hội viên mới (New Member)
 * - Từ 2.000.000 đ đến dưới 4.000.000 đ: Hội viên Vàng (Gold Member)
 * - Từ 4.000.000 đ trở lên: Hội viên Kim Cương (Diamond Member)
 */
function updateSpentProgress(spentAmount, user) {
    const progressFill = document.getElementById('progressBarFill');
    const checkpoint2M = document.getElementById('checkpoint-2m');
    const checkpoint4M = document.getElementById('checkpoint-4m');
    const membershipTierText = document.getElementById('membershipTier');

    let fillPercentage = 0;

    // Chia tỷ lệ mượt: phần đầu 0 -> 2M chiếm 50%, phần sau 2M -> 4M chiếm 50%
    if (spentAmount <= 0) {
        fillPercentage = 0;
    } else if (spentAmount <= 2000000) {
        fillPercentage = (spentAmount / 2000000) * 50;
    } else if (spentAmount <= 4000000) {
        fillPercentage = 50 + ((spentAmount - 2000000) / 2000000) * 50;
    } else {
        fillPercentage = 100;
    }

    // Tự động đẩy chiều rộng của thanh chạy
    if (progressFill) {
        progressFill.style.width = `${fillPercentage}%`;
    }

    // Thắp sáng các mốc đạt được
    if (spentAmount >= 2000000) {
        checkpoint2M?.classList.add('reached');
    } else {
        checkpoint2M?.classList.remove('reached');
    }

    if (spentAmount >= 4000000) {
        checkpoint4M?.classList.add('reached');
    } else {
        checkpoint4M?.classList.remove('reached');
    }

    // Hiển thị danh hiệu dựa theo quyền Admin hoặc mức tích lũy chi tiêu
    const role = user.roleName ? user.roleName.toLowerCase() : '';
    if (role === 'admin' || user.MaLoaiUser === 1) {
        membershipTierText.innerText = 'Quản trị viên';
        membershipTierText.style.borderColor = '#ff3d49';
        membershipTierText.style.color = '#ff3d49';
    } else if (spentAmount >= 4000000) {
        membershipTierText.innerText = 'Hội viên Kim Cương';
        membershipTierText.style.borderColor = '#ffffff';
        membershipTierText.style.color = '#ffffff';
    } else if (spentAmount >= 2000000) {
        membershipTierText.innerText = 'Hội viên Vàng';
        membershipTierText.style.borderColor = '#cccccc';
        membershipTierText.style.color = '#cccccc';
    } else {
        membershipTierText.innerText = 'Hội viên mới';
        membershipTierText.style.borderColor = '#555555';
        membershipTierText.style.color = '#888888';
    }
}

/**
 * HÀM 6: CẬP NHẬT DỮ LIỆU QUA API (PUT CUSTOMERS)
 * Lấy dữ liệu mới nhập từ form, gửi yêu cầu chỉnh sửa thông tin lên máy chủ.
 * Nếu thành công, cập nhật ngược lại localStorage và cập nhật giao diện ngay lập tức.
 */
function setupProfileUpdate(user) {
    const profileForm = document.getElementById('profileForm');
    
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const oldPassword = document.getElementById('profileOldPassword').value;
            const newPassword = document.getElementById('profileNewPassword').value;
            const confirmPassword = document.getElementById('profileConfirmPassword').value;

            // Kiểm tra tính hợp lệ dữ liệu
            if (!oldPassword || !newPassword || !confirmPassword) {
                alert('Vui lòng nhập đầy đủ các trường mật khẩu!');
                return;
            }

            // Kiểm tra mật khẩu cũ
            if (oldPassword !== user.MatKhau) {
                alert('Mật khẩu cũ không chính xác!');
                return;
            }

            // Kiểm tra mật khẩu mới lần 2 (xác nhận mật khẩu)
            if (newPassword !== confirmPassword) {
                alert('Nhập lại mật khẩu mới không khớp!');
                return;
            }

            // Đảm bảo mật khẩu mới đủ độ dài (ít nhất 8 kí tự như lúc đăng ký)
            if (newPassword.length < 8) {
                alert('Mật khẩu mới phải có ít nhất 8 kí tự!');
                return;
            }

            // Gói dữ liệu cập nhật (Họ tên và email giữ nguyên không đổi)
            const updatePayload = {
                Ten: user.Ten,
                Email: user.Email,
                MatKhau: newPassword,
                TenDangNhap: user.TenDangNhap, // Không cho phép đổi tên đăng nhập
                SDT: user.SDT,                 // Không cho phép đổi số điện thoại ở màn hình này
                MaLoaiUser: user.MaLoaiUser    // Giữ nguyên phân quyền người dùng
            };

            try {
                // Gọi API PUT cập nhật thông tin khách hàng
                const response = await fetch(`/api/customers/${user.MaKH}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatePayload)
                });

                if (response.ok || response.status === 200) {
                    // Cập nhật dữ liệu mới vào bộ nhớ trình duyệt
                    const updatedUser = {
                        ...user,
                        MatKhau: newPassword
                    };
                    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                    
                    alert('Đổi mật khẩu thành công!');
                    
                    // Reset các ô nhập mật khẩu và ẩn khu vực đổi mật khẩu
                    document.getElementById('profileOldPassword').value = '';
                    document.getElementById('profileNewPassword').value = '';
                    document.getElementById('profileConfirmPassword').value = '';
                    
                    document.getElementById('passwordFields').style.display = 'none';
                    document.getElementById('changePasswordTrigger').style.display = 'block';

                    // Cập nhật lại đối tượng user cục bộ đang dùng
                    user.MatKhau = newPassword;

                } else {
                    const errResult = await response.json();
                    alert('Lỗi cập nhật: ' + (errResult.error || 'Yêu cầu không được thực thi.'));
                }

            } catch (error) {
                console.error('Lỗi gửi cập nhật tài khoản:', error);
                alert('Có lỗi xảy ra khi kết nối máy chủ. Vui lòng kiểm tra lại đường truyền!');
            }
        });
    }
}
