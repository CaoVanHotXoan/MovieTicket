/**
 * Tiện ích Admin: thông báo toast, loading, xử lý lỗi API, validate form
 * (Tiêu chí 2 & 4)
 */

let toastSeq = 0;

/** Hiển thị thông báo toast (success | error | info | warning) */
export function showToast(message, type = 'info', duration = 4000) {
    const root = document.getElementById('admin-toast-root');
    if (!root) return;

    const id = `toast-${++toastSeq}`;
    const styles = {
        success: 'bg-emerald-600 border-emerald-400',
        error: 'bg-red-600 border-red-400',
        info: 'bg-slate-800 border-slate-600',
        warning: 'bg-amber-600 border-amber-400'
    };
    const icons = {
        success: '✓',
        error: '!',
        info: 'i',
        warning: '⚠'
    };

    const el = document.createElement('div');
    el.id = id;
    el.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-semibold shadow-lg border ${styles[type] || styles.info} animate-[slideIn_0.3s_ease-out] max-w-sm`;
    el.innerHTML = `
        <span class="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-black shrink-0">${icons[type] || icons.info}</span>
        <span class="flex-1">${escapeHtml(String(message))}</span>
        <button type="button" class="opacity-70 hover:opacity-100 text-lg leading-none" aria-label="Đóng">&times;</button>
    `;
    el.querySelector('button')?.addEventListener('click', () => el.remove());
    root.appendChild(el);

    if (duration > 0) {
        setTimeout(() => el.remove(), duration);
    }
}

function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c] || c)
    );
}

/** Skeleton loading khi chuyển trang */
export function showPageLoading(container) {
    if (!container) return;
    container.innerHTML = `
        <div class="space-y-6 animate-pulse" role="status" aria-label="Đang tải dữ liệu">
            <div class="h-10 bg-gray-200 rounded-lg w-1/3"></div>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                ${[1, 2, 3, 4].map(() => `<div class="h-24 bg-gray-200 rounded-xl"></div>`).join('')}
            </div>
            <div class="h-64 bg-gray-200 rounded-xl"></div>
            <div class="h-48 bg-gray-200 rounded-xl"></div>
            <span class="sr-only">Đang tải...</span>
        </div>
    `;
}

/** Trang lỗi thân thiện — không hiện stack/code thô */
export function showErrorState(container, message, onRetry) {
    if (!container) return;
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-[320px] p-8 text-center">
            <div class="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-2xl font-bold mb-4">!</div>
            <h3 class="text-lg font-bold text-gray-800 mb-2">Không thể tải dữ liệu</h3>
            <p class="text-gray-500 text-sm max-w-md mb-6">${escapeHtml(message || 'Đã xảy ra lỗi. Vui lòng thử lại sau.')}</p>
            ${onRetry ? `<button type="button" id="admin-retry-btn" class="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors">Thử lại</button>` : ''}
        </div>
    `;
    document.getElementById('admin-retry-btn')?.addEventListener('click', onRetry);
}

/** Validate các trường bắt buộc trong form (tiêu chí UX) */
export function validateForm(form, rules = {}) {
    const errors = [];
    const data = Object.fromEntries(new FormData(form).entries());

    for (const [name, rule] of Object.entries(rules)) {
        const value = (data[name] ?? '').toString().trim();
        if (rule.required && !value) {
            errors.push(rule.message || `Vui lòng nhập ${name}.`);
        }
        if (rule.minLength && value.length < rule.minLength) {
            errors.push(rule.message || `${name} phải có ít nhất ${rule.minLength} ký tự.`);
        }
        if (rule.pattern && value && !rule.pattern.test(value)) {
            errors.push(rule.message || `${name} không hợp lệ.`);
        }
        if (rule.min != null && value !== '' && Number(value) < rule.min) {
            errors.push(rule.message || `${name} phải >= ${rule.min}.`);
        }
    }

    form.querySelectorAll('[data-field-error]').forEach(el => el.remove());
    if (errors.length) {
        const firstInput = form.querySelector(`[name="${Object.keys(rules)[0]}"]`);
        if (firstInput) {
            const hint = document.createElement('p');
            hint.className = 'text-red-500 text-xs mt-1 data-field-error';
            hint.textContent = errors[0];
            firstInput.classList.add('border-red-500', 'ring-1', 'ring-red-200');
            firstInput.parentElement?.appendChild(hint);
            firstInput.focus();
        }
        showToast(errors[0], 'warning');
        return null;
    }

    form.querySelectorAll('input, textarea, select').forEach(el => {
        el.classList.remove('border-red-500', 'ring-1', 'ring-red-200');
    });
    return data;
}

/** Gọi API qua axios — bắt lỗi và hiển thị thông báo thân thiện */
export async function apiRequest(requestFn, options = {}) {
    const { successMessage, silent } = options;
    try {
        const result = await requestFn();
        if (successMessage) showToast(successMessage, 'success');
        return result;
    } catch (err) {
        const msg = err.response?.data?.error
            || err.response?.data?.message
            || (err.message?.includes('Network') ? 'Mất kết nối máy chủ. Kiểm tra mạng hoặc chạy npm run dev.' : null)
            || 'Yêu cầu không thành công. Vui lòng thử lại.';
        if (!silent) showToast(msg, 'error');
        throw new Error(msg);
    }
}

/** Cấu hình axios interceptor cho toàn bộ admin */
export function setupAdminApi(axiosInstance) {
    axiosInstance.interceptors.response.use(
        res => res,
        err => {
            if (err.config?.headers?.['X-Skip-Toast']) {
                return Promise.reject(err);
            }
            return Promise.reject(err);
        }
    );
}
