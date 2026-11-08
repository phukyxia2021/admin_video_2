# 07 — Antigravity Master Prompt

Bạn là senior frontend developer. Hãy xây dựng một website admin quản lý video tên **Video Admin** theo đúng yêu cầu dưới đây.

## Mục tiêu
Tạo website admin chạy hoàn toàn ở phía trình duyệt. Chỉ sử dụng:
- HTML5
- CSS3
- Vanilla JavaScript ES6+
- SQLite chạy bằng sql.js (WebAssembly)
- Chart.js cho biểu đồ

**Không tạo backend, không Node.js server, không PHP, không Python server, không REST API.**

## Các trang bắt buộc
1. `index.html` — Dashboard
2. `videos.html` — List Video
3. `login.html`
4. `register.html`
5. `forgot-password.html`

## Dashboard
Hiển thị:
- Tổng số video.
- Tổng lượt xem.
- Dung lượng storage.
- Bar chart Top 10 video nhiều lượt xem nhất.
- Line chart lượt xem theo ngày/tháng, có toggle Daily/Monthly.

Dữ liệu phải đọc từ SQLite, không hard-code số liệu biểu đồ.

## List Video
Bảng gồm đúng các cột:
- ID
- Title
- Thumbnail
- Views
- Action: Edit, Delete

Có thêm Search, Add Video, Edit modal, Delete confirmation, category filter và pagination phía client.

## Authentication
- Login: email/password.
- Register: full name/email/password/confirm password.
- Forgot Password: giao diện nhập email và mô phỏng local. Phải ghi rõ không gửi email thật do không có backend.
- Đây chỉ là demo local, không tuyên bố là bảo mật production.

## Database
Tách các database:
- `users.db`
- `videos.db`
- `video_categories.db`
- `video_tags.db`
- `video_analytics.db`

Dùng sql.js để đọc/ghi SQLite trong trình duyệt. Do browser không thể tự ghi file `.db` vào thư mục dự án, hãy:
- Lưu binary database trong IndexedDB.
- Tự động persist sau thao tác ghi.
- Có chức năng Export từng database thành `.db`.
- Có chức năng Import database từ file `.db`.
- Khởi tạo schema nếu database chưa tồn tại.
- Seed dữ liệu demo nếu database video chưa có dữ liệu.

Tham khảo schema tại `03_DATABASE_SCHEMA.md`.

## UI/UX
- Light mode, nền trắng, hiện đại, gọn gàng.
- Sidebar bên trái, topbar, KPI cards, chart cards.
- Responsive desktop/tablet/mobile.
- Có empty state, loading state, toast, confirm dialog.
- Có focus state và label cho form.

## Cấu trúc source
```text
video-admin/
├── index.html
├── videos.html
├── login.html
├── register.html
├── forgot-password.html
├── assets/css/style.css
├── assets/js/app.js
├── assets/js/database.js
├── assets/js/auth.js
├── assets/js/dashboard.js
├── assets/js/videos.js
└── assets/images/
```

## Quy tắc code
- Không dùng React, Vue, Angular, jQuery hoặc Bootstrap.
- Không tạo backend.
- Tách logic database khỏi logic giao diện.
- Dùng prepared statements/parameter binding của sql.js khi truyền dữ liệu.
- Tránh SQL injection bằng cách không nối chuỗi input vào câu SQL.
- Có xử lý lỗi và thông báo cho người dùng.
- Không lặp code sidebar/header giữa các trang nếu có thể tạo hàm render dùng chung.
- Không dùng dữ liệu giả hard-code trong dashboard; chỉ seed vào SQLite một lần.
- Dùng comment cho phần khởi tạo sql.js, persistence IndexedDB, import/export và query chart.

## Hướng dẫn thực hiện
1. Đọc toàn bộ file `.md` trong thư mục docs.
2. Tạo source code theo cấu trúc trên.
3. Tạo dữ liệu mẫu đủ để biểu đồ có nội dung.
4. Kiểm tra tất cả link điều hướng.
5. Kiểm tra CRUD video.
6. Kiểm tra refresh trang vẫn giữ dữ liệu.
7. Kiểm tra import/export `.db`.
8. Viết `README.md` hướng dẫn chạy bằng Live Server.

## Điều kiện nghiệm thu
- Không có backend.
- Tất cả trang hoạt động.
- CRUD video hoạt động.
- Dashboard lấy dữ liệu từ SQLite.
- Có daily/monthly chart.
- Dữ liệu còn sau khi refresh.
- Có import/export database.
- UI light mode responsive.
- Có ghi chú rõ ràng về giới hạn bảo mật của authentication local.
