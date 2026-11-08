# Video Admin Dashboard

Website quản trị video chạy hoàn toàn ở phía client (trình duyệt web), xây dựng bằng **HTML5, CSS3 và Vanilla JavaScript thuần (ES6+)**. Ứng dụng tích hợp cơ sở dữ liệu quan hệ **SQLite thông qua WebAssembly (sql.js)**, đồng bộ lưu trữ nhị phân vào **IndexedDB**, và trực quan hóa dữ liệu bằng **Chart.js**.

---

## 🚀 Tính năng nổi bật

1. **Dashboard Phân tích Tổng quan:**
   - 4 thẻ KPI: Tổng số video đang hoạt động, Tổng lượt xem tích lũy, Dung lượng Storage đã khai báo, và Số danh mục chủ đề.
   - **Top 10 Video Lượt xem cao nhất:** Biểu đồ Bar Chart trực quan với tooltip và format số liệu chuẩn.
   - **Xu hướng Lượt xem (Views Trend):** Biểu đồ Line Chart với đường cong mềm mượt, hỗ trợ chuyển đổi linh hoạt giữa chế độ **Ngày (Daily 30 ngày)** và **Tháng (Monthly)**.
   - Trạng thái Empty State thân thiện khi cơ sở dữ liệu trống.

2. **Quản lý Video Toàn diện (CRUD):**
   - Bảng dữ liệu chuẩn 5 cột: `ID`, `Thumbnail`, `Title`, `Views`, `Action` (Edit, Delete).
   - Tìm kiếm trực tiếp (live search) theo tiêu đề và mô tả.
   - Lọc theo Danh mục chủ đề và Trạng thái (`Công khai`, `Bản nháp`, `Lưu trữ`).
   - Sắp xếp đa dạng: Lượt xem cao/thấp, Ngày xuất bản mới/cũ, Tiêu đề A-Z/Z-A.
   - Phân trang phía client mượt mà.
   - Modal Thêm/Chỉnh sửa video với bản xem trước thumbnail ảnh tự động.
   - Hộp thoại Modal xác nhận xóa video vĩnh viễn (tự động xóa cascade các tag và analytics liên quan).

3. **Cơ sở dữ liệu SQLite trong trình duyệt (sql.js) & Supabase Cloud:**
   - Tách biệt thành 5 database riêng biệt: `users.db`, `videos.db`, `video_categories.db`, `video_tags.db`, `video_analytics.db`.
   - Cơ chế tự động sao lưu dữ liệu nhị phân (Uint8Array) vào IndexedDB sau mỗi thao tác ghi (INSERT/UPDATE/DELETE). Dữ liệu được giữ nguyên vẹn sau khi reload hoặc đóng trình duyệt.
   - **Tích hợp Supabase Cloud:** Kết nối trực tiếp với Supabase project qua `@supabase/supabase-js`, hỗ trợ đẩy dữ liệu lên đám mây (Push) hoặc tải dữ liệu về máy (Pull).
   - **Hộp thoại Quản lý Database:** Hỗ trợ **Export** từng file `.db` hoặc tải trọn bộ 5 file `.db` về máy tính; hỗ trợ **Import** nạp file `.db` có kiểm tra định dạng bảng hợp lệ.
   - Hỗ trợ **Khôi phục dữ liệu mẫu ban đầu (Seed Demo Data)** với 14 video, 5 danh mục, 10 thẻ tag, 45 ngày lịch sử analytics và tài khoản quản trị mẫu.

4. **Xác thực Demo & Bảo mật minh bạch:**
   - Hỗ trợ Đăng nhập, Đăng ký và Mô phỏng Quên mật khẩu.
   - Băm mật khẩu minh họa bằng Web Crypto API (SHA-256).
   - Route Guard bảo vệ các trang Dashboard và Videos: tự động chuyển hướng về `login.html` nếu chưa đăng nhập.
   - Hiển thị rõ ràng thông báo kiến trúc client-side không có server backend.

---

## 📁 Cấu trúc thư mục

```text
Admin_Video/
├── index.html                   # Trang Dashboard thống kê & biểu đồ
├── videos.html                  # Trang Quản lý danh sách Video (CRUD)
├── permissions.html             # Trang Phân quyền tài khoản (ADMIN/USER)
├── login.html                   # Trang Đăng nhập demo
├── register.html                # Trang Đăng ký tài khoản demo
├── forgot-password.html         # Trang Khôi phục mật khẩu (Gửi email Supabase Auth)
├── reset-password.html          # Trang Đặt lại mật khẩu mới khi bấm link từ Email
├── supabase_schema.sql          # File SQL tạo bảng & RLS cho Supabase
├── supabase.txt                 # Cấu hình Project URL & API Key của Supabase
├── README.md                    # Hướng dẫn chạy và tài liệu dự án
├── assets/
│   ├── css/
│   │   └── style.css            # Toàn bộ stylesheet Light Mode, Responsive
│   └── js/
│       ├── app.js               # Common layout, formatters, toast, dialogs, DB modal
│       ├── database.js          # SQLite WebAssembly, IndexedDB persistence, CRUD SQL
│       ├── supabaseClient.js    # Client kết nối & đồng bộ dữ liệu Supabase Cloud
│       ├── auth.js              # Quản lý phiên, xác thực, Web Crypto SHA-256
│       ├── permissions.js       # Logic module phân quyền tài khoản (ADMIN/USER)
│       ├── dashboard.js         # Thống kê KPI và vẽ biểu đồ Chart.js
│       └── videos.js            # Logic bảng dữ liệu, lọc, tìm kiếm, phân trang & modal
└── database/
    └── README.md                # Ghi chú về kiến trúc SQLite IndexedDB & sao lưu
```

---

## 🛠️ Hướng dẫn cài đặt và chạy dự án

Do ứng dụng sử dụng WebAssembly (`sql-wasm.wasm`) từ CDN và IndexedDB, **không nên mở file trực tiếp bằng giao thức `file://`** vì chính sách CORS/WASM của trình duyệt có thể ngăn cản nạp module. Hãy sử dụng một HTTP server tĩnh cục bộ:

### Cách 1: Sử dụng VS Code Live Server (Khuyên dùng)
1. Cài đặt tiện ích mở rộng **Live Server** (của tác giả Ritwick Dey) trong VS Code.
2. Nhấp chuột phải vào file `index.html` hoặc `login.html`.
3. Chọn **"Open with Live Server"** (hoặc phím tắt `Alt + L, Alt + O`).
4. Trình duyệt sẽ tự động mở tại địa chỉ `http://127.0.0.1:5500/login.html`.

### Cách 2: Sử dụng Python
Nếu máy tính đã cài đặt Python:
```bash
# Mở terminal tại thư mục dự án Admin_Video
python -m http.server 8000
```
Sau đó truy cập: [http://localhost:8000/login.html](http://localhost:8000/login.html)

### Cách 3: Sử dụng Node.js (npx serve)
```bash
npx serve .
```

---

## 🔑 Tài khoản Quản trị Mẫu (Demo)

Hệ thống đã tự động nạp sẵn tài khoản quản trị ban đầu vào file `users.db`:
- **Email:** `admin@videoadmin.local`
- **Mật khẩu:** `Admin@12345`

*(Tại trang `login.html`, bạn có thể bấm nút **"Tự động điền"** để điền nhanh thông tin này).*

---

## ⚠️ Giới hạn bảo mật & Kiến trúc

- Website được xây dựng hoàn toàn ở phía client, không sử dụng backend server (không Node.js, không PHP, không Python server, không REST API).
- Dữ liệu cơ sở dữ liệu được lưu cục bộ trong trình duyệt của người dùng thông qua **IndexedDB**. Trình duyệt khác hoặc thiết bị khác sẽ không chia sẻ dữ liệu với nhau.
- Cơ chế mã hóa SHA-256 bằng Web Crypto API và lưu phiên đăng nhập `sessionStorage` chỉ nhằm mục đích minh họa trải nghiệm người dùng trong môi trường cục bộ. Không triển khai hệ thống này trong môi trường sản xuất có dữ liệu người dùng thực tế nhạy cảm khi chưa có server xác thực an toàn.
