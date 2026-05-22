/**
 * FILE: LienHe.js
 * Xử lý tab Ứng tuyển / CSKH, dropdown, gửi form lên API
 */

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initCustomSelects();
    initDatePickerIcon();
    initFileDisplay();
    initRecruitmentForm();
    initSupportForm();
});

/** Chuyển đổi tab giữa Ứng tuyển và CSKH */
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const panels = {
        'ung-tuyen': document.getElementById('panel-ung-tuyen'),
        'cskh': document.getElementById('panel-cskh')
    };

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;

            tabButtons.forEach(b => {
                b.classList.toggle('active', b === btn);
                b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
            });

            Object.entries(panels).forEach(([key, panel]) => {
                const isActive = key === target;
                panel.classList.toggle('active', isActive);
                panel.hidden = !isActive;
            });
        });
    });
}

/** Dropdown tùy chỉnh: bấm mở danh sách, chọn mục */
function initCustomSelects() {
    document.querySelectorAll('.custom-select').forEach(wrapper => {
        const trigger = wrapper.querySelector('.select-trigger');
        const valueEl = wrapper.querySelector('.select-value');
        const hiddenInput = wrapper.querySelector('input[type="hidden"]');
        const options = wrapper.querySelectorAll('.select-options li');

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-select.open').forEach(el => {
                if (el !== wrapper) el.classList.remove('open');
            });
            wrapper.classList.toggle('open');
        });

        options.forEach(li => {
            li.addEventListener('click', () => {
                const val = li.dataset.value;
                valueEl.textContent = val;
                hiddenInput.value = val;
                wrapper.classList.remove('open');
            });
        });
    });

    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select.open').forEach(el => el.classList.remove('open'));
    });
}

/** Icon lịch bên cạnh ô ngày sinh — mở date picker */
function initDatePickerIcon() {
    const dateInput = document.getElementById('ut-ngaysinh');
    const btn = document.getElementById('btn-open-date');
    if (!dateInput || !btn) return;

    btn.addEventListener('click', () => {
        if (typeof dateInput.showPicker === 'function') {
            dateInput.showPicker();
        } else {
            dateInput.focus();
            dateInput.click();
        }
    });
}

/** Hiển thị tên file đã chọn */
function initFileDisplay() {
    const fileInput = document.getElementById('ut-file');
    const display = document.getElementById('file-name-display');
    if (!fileInput || !display) return;

    fileInput.addEventListener('change', () => {
        display.textContent = fileInput.files?.[0]?.name || 'Chưa chọn file';
    });
}

/** Đọc file thành base64 để gửi kèm JSON */
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/** Gửi form Ứng tuyển */
function initRecruitmentForm() {
    const form = document.getElementById('form-ung-tuyen');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const ten = document.getElementById('ut-ten').value.trim();
        const ngaySinh = document.getElementById('ut-ngaysinh').value;
        const email = document.getElementById('ut-email').value.trim();
        const viTri = document.getElementById('ut-vi-tri').value;
        const fileInput = document.getElementById('ut-file');
        const submitBtn = form.querySelector('.btn-submit');

        if (!ten || !ngaySinh || !email || !viTri) {
            alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
            return;
        }

        const payload = { ten, ngaySinh, email, viTri };
        const file = fileInput.files?.[0];
        if (file) {
            payload.fileName = file.name;
            payload.fileType = file.type;
            try {
                payload.fileData = await readFileAsBase64(file);
            } catch {
                alert('Không đọc được file đính kèm!');
                return;
            }
        }

        submitBtn.disabled = true;
        try {
            const res = await fetch('/api/contact/recruitment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();

            if (res.ok && result.success) {
                alert(result.message || 'Gửi hồ sơ ứng tuyển thành công!');
                form.reset();
                document.getElementById('file-name-display').textContent = 'Chưa chọn file';
                document.querySelector('#select-vi-tri .select-value').textContent = 'Chọn vị trí';
                document.getElementById('ut-vi-tri').value = '';
            } else {
                alert(result.message || 'Gửi hồ sơ thất bại!');
            }
        } catch (err) {
            console.error(err);
            alert('Không kết nối được máy chủ. Vui lòng chạy npm run dev.');
        } finally {
            submitBtn.disabled = false;
        }
    });
}

/** Gửi form CSKH */
function initSupportForm() {
    const form = document.getElementById('form-cskh');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const ten = document.getElementById('cskh-ten').value.trim();
        const email = document.getElementById('cskh-email').value.trim();
        const sdt = document.getElementById('cskh-sdt').value.trim();
        const hoTro = document.getElementById('cskh-hotro').value;
        const maHoaDon = document.getElementById('cskh-mahoadon').value.trim();
        const noiDung = document.getElementById('cskh-noidung').value.trim();
        const submitBtn = form.querySelector('.btn-submit');

        if (!ten || !email || !sdt || !hoTro || !noiDung) {
            alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
            return;
        }

        submitBtn.disabled = true;
        try {
            const res = await fetch('/api/contact/support', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ten, email, sdt, hoTro, maHoaDon, noiDung })
            });
            const result = await res.json();

            if (res.ok && result.success) {
                alert(result.message || 'Gửi yêu cầu hỗ trợ thành công!');
                form.reset();
                document.querySelector('#select-ho-tro .select-value').textContent = 'Chọn loại hỗ trợ';
                document.getElementById('cskh-hotro').value = '';
            } else {
                alert(result.message || 'Gửi yêu cầu thất bại!');
            }
        } catch (err) {
            console.error(err);
            alert('Không kết nối được máy chủ. Vui lòng chạy npm run dev.');
        } finally {
            submitBtn.disabled = false;
        }
    });
}
