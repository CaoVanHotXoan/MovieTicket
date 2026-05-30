# 🧪 HƯỚNG DẪN TEST TÍNH NĂNG REAL-TIME BOOKING

## ✅ Server đã khởi động thành công!

```
Server running on http://localhost:3015
🔌 Socket.io đã kích hoạt - Real-time seat booking ready!
```

---

## 🔐 Tài Khoản Test

| Tài Khoản | Username | Password | Vai Trò |
|-----------|----------|----------|---------|
| Tài Khoản 1 | `admin` | `123456` | Admin |
| Tài Khoản 2 | `xoan` | `12345` | Khách Hàng |

---

## 🎮 HƯỚNG DẪN TEST (Step by Step)

### **Bước 1: Chuẩn Bị**

1. Đảm bảo server đang chạy (`npm run dev`)
2. Mở **2 tab trình duyệt** khác nhau (hoặc 2 trình duyệt khác nhau để tránh cache)

---

### **Bước 2: Đăng Nhập Tài Khoản 1 (Admin)**

**Tab 1:**
```
1. Truy cập: http://localhost:3015
2. Click "Đăng Nhập" → Nhập:
   - Username: admin
   - Password: 123456
3. Click "Đăng Nhập"
```

**Kết quả:**
- ✅ Admin đã đăng nhập
- Console sẽ hiển thị: `📝 Admin đã bắt đầu booking`

---

### **Bước 3: Đăng Nhập Tài Khoản 2 (Xoan)**

**Tab 2:**
```
1. Truy cập: http://localhost:3015 (link mới, không chia sẻ session)
2. Click "Đăng Nhập" → Nhập:
   - Username: xoan
   - Password: 12345
3. Click "Đăng Nhập"
```

**Kết quả:**
- ✅ Xoan đã đăng nhập
- Console sẽ hiển thị: `📝 Xoan đã bắt đầu booking`

---

### **Bước 4: Chọn Cùng Phim & Suất Chiếu**

#### **Tab 1 (Admin):**
```
1. Chọn một bộ phim (ví dụ: "Fast & Furious")
2. Chọn một suất chiếu (ví dụ: Thứ Tư, 15:15)
3. Vào màn hình "Chọn Ghế"
```

#### **Tab 2 (Xoan):**
```
1. Chọn CÙNG bộ phim (Fast & Furious)
2. Chọn CÙNG suất chiếu (Thứ Tư, 15:15)
3. Vào màn hình "Chọn Ghế"
```

**⚠️ QUAN TRỌNG:** Phải chọn **cùng phim** và **cùng suất chiếu** để thấy real-time!

---

### **Bước 5: Kiểm Tra Real-Time** ⚡

#### **Tại Tab 1 (Admin):**
```
1. Nhấn vào ghế A1
   → Ghế A1 chuyển thành TRẮNG (tức là đã được chọn)
```

#### **Tại Tab 2 (Xoan) - Quan sát ngay lập tức:**
```
✅ Ghế A1 chuyển thành ĐỎ với hiệu ứng NHẤP NHÁY
✅ Thông báo xuất hiện: "👤 Admin - Ghế A1"
✅ Xoan KHÔNG THỂ nhấn ghế A1 (sẽ có cảnh báo)
```

---

## 🎨 Hiệu Ứng Hiển Thị

### **Ghế Người Dùng Khác Đang Chọn:**
- 🔴 **Màu sắc:** Đỏ (`#ff6b6b`)
- ⚡ **Hiệu ứng:** Pulse (nhấp nháy mềm)
- 👤 **Thông báo:** Hiển thị tên người dùng + số ghế

### **Console Output:**

**Tab 1 (Admin) khi chọn A1:**
```
✅ Kết nối Socket.io thành công
📝 Admin đã bắt đầu booking
👤 Admin chọn ghế A1
```

**Tab 2 (Xoan) nhận được:**
```
✅ Kết nối Socket.io thành công
📝 Xoan đã bắt đầu booking
📋 Danh sách ghế hiện tại: {A1: {userName: "Admin", userId: 1}}
👤 Admin chọn ghế A1
```

---

## 🔄 Test Các Scenario Khác

### **Scenario 1: Hủy Chọn Ghế**

**Tab 1 (Admin):**
```
1. Nhấn lại ghế A1 để hủy chọn
   → Ghế A1 trở lại màu bình thường
```

**Tab 2 (Xoan):**
```
✅ Ghế A1 ngay lập tức trở lại màu bình thường
✅ Thông báo "👤 Admin - Ghế A1" mất đi
✅ Xoan giờ CÓ THỂ chọn ghế A1
```

---

### **Scenario 2: Xoan Chọn Ghế Khác**

**Tab 2 (Xoan):**
```
1. Nhấn vào ghế B5
   → Ghế B5 chuyển thành TRẮNG
```

**Tab 1 (Admin):**
```
✅ Ghế B5 chuyển thành ĐỎ với hiệu ứng nhấp nháy
✅ Thông báo xuất hiện: "👤 Xoan - Ghế B5"
✅ Admin KHÔNG THỂ nhấn ghế B5
```

---

### **Scenario 3: Chọn Cùng Lúc**

**Tab 1 & Tab 2 - Cùng lúc nhấn 2 ghế khác nhau (C1 & D1):**

```
✅ Mỗi người nhìn thấy ghế của người khác chuyển thành ĐỎ ngay lập tức
✅ Không có xung đột vì Socket.io xử lý real-time
✅ Thông báo hiển thị: "👤 Admin - Ghế C1" & "👤 Xoan - Ghế D1"
```

---

### **Scenario 4: Disconnect & Reconnect**

**Tab 1 (Admin):**
```
1. Chọn ghế A1 (ghế A1 đỏ trên Tab 2)
2. Mở DevTools (F12) → Network → Throttling → Offline
   → Ngắt kết nối Socket.io
```

**Tab 2 (Xoan):**
```
Sẽ thấy: "❌ Mất kết nối Socket.io"
Sau 1 giây, Admin tự động kết nối lại
```

---

## 📊 Kiểm Tra Console Logs

### **Mở DevTools (F12) → Tab Console**

### **Logs khi Login:**
```
✅ Kết nối Socket.io thành công
📝 Admin đã bắt đầu booking
📋 Danh sách ghế hiện tại: {}
```

### **Logs khi Chọn Ghế:**
```
✅ Kết nối Socket.io thành công
📝 Admin đã bắt đầu booking
👤 Admin chọn ghế A1        ← Chính mình chọn
👤 Admin chọn ghế A1        ← Nhận từ server (broadcast)
```

### **Logs khi Hủy Ghế:**
```
❌ Admin hủy chọn ghế A1
👤 Admin hủy chọn ghế A1    ← Broadcast
```

---

## 🐛 Troubleshooting

### **Vấn đề: Ghế không cập nhật real-time**

**Nguyên nhân có thể:**
1. ❌ Không chọn **cùng phim & cùng suất chiếu**
2. ❌ Socket.io **chưa kết nối** (kiểm tra Console)
3. ❌ Đổi tab rồi quay lại (làm mất Socket.io)

**Giải pháp:**
- F5 làm mới trang
- Kiểm tra Console xem có lỗi không
- Đảm bảo 2 tab đang ở cùng phim/suất chiếu

---

### **Vấn đề: Socket.io báo lỗi**

**Error: `Error: connect_error`**
```
→ Server không chạy hoặc port sai
→ Chạy: npm run dev
```

**Error: `Port 3015 is already in use`**
```
→ Có process khác dùng port 3015
→ Kill nó: netstat -ano | findstr :3015
```

---

### **Vấn đề: Login thất bại**

**Kiểm tra tài khoản:**
```
✅ Username: admin   / Password: 123456
✅ Username: xoan    / Password: 12345
```

Nếu vẫn không được → Kiểm tra database xem tài khoản còn không

---

## 🎯 Checklist Test

- [ ] Server chạy tại http://localhost:3015
- [ ] Socket.io hiển thị: `🔌 Socket.io đã kích hoạt`
- [ ] Admin đăng nhập thành công (user: admin / pass: 123456)
- [ ] Xoan đăng nhập thành công (user: xoan / pass: 12345)
- [ ] Cả 2 chọn cùng phim và cùng suất chiếu
- [ ] Admin chọn ghế → Ghế chuyển ĐỎ trên Tab Xoan
- [ ] Xoan không thể chọn ghế đó (có cảnh báo)
- [ ] Admin hủy ghế → Ghế quay lại bình thường trên Tab Xoan
- [ ] Console hiển thị logs của Socket.io
- [ ] Disconnect rồi reconnect - ghế vẫn cập nhật

---

## 📹 Demo Flow

```
[Tab 1: Admin]                    [Tab 2: Xoan]
     ↓                                 ↓
   Login                            Login
     ↓                                 ↓
  Fast & Furious                Fast & Furious
     ↓                                 ↓
  Thứ Tư, 15:15               Thứ Tư, 15:15
     ↓                                 ↓
  [Chọn Ghế A1]  ────────────→  [Ghế A1 đỏ]
     ↓                                 ↓
[Ghế A1 trắng]  ←──── Broadcast ─→ [Thông báo]
     ↓                                 ↓
[Hủy A1, Chọn B5]  ───────────→  [A1 trắng, B5 đỏ]
     ↓                                 ↓
  [Thanh Toán]                    [Chọn D3]
     ↓                                 ↓
 [Hoàn Tất]  ←────────────────→  [B5 trắng, D3 đỏ]
```

---

## ✨ Tính Năng Đạt Được

✅ **Real-time Seat Selection** - Ghế cập nhật ngay lập tức  
✅ **Live Notification** - Hiển thị ai đang chọn ghế nào  
✅ **Conflict Prevention** - Không cho chọn ghế đang bị chọn  
✅ **Visual Feedback** - Màu sắc + hiệu ứng pulse rõ ràng  
✅ **Auto Reconnect** - Tự động kết nối lại khi mất kết nối  
✅ **Clean Disconnect** - Xóa ghế khi user tắt/rời đi  

---

**🎉 Chúc mừng! Bạn đã thành công với tính năng Real-Time Booking!**

Liên hệ nếu có vấn đề: [Thông tin liên hệ]
