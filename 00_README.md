# Video Admin Dashboard — Tài liệu dự án Vibe Coding

## 1. Mục tiêu
Xây dựng website admin quản lý video chạy hoàn toàn ở phía trình duyệt, dùng **HTML, CSS và JavaScript thuần**. Giao diện Light Mode, nền trắng, responsive.

Các trang:
- Dashboard
- List Video
- Login
- Register
- Forgot Password

## 2. Công nghệ và giới hạn kiến trúc
- HTML5, CSS3, Vanilla JavaScript (ES6+).
- SQLite chạy trong trình duyệt bằng thư viện **sql.js (SQLite compiled to WebAssembly)**.
- Không có backend, không có API server, không dùng Node.js/PHP/Python làm server.
- Có thể dùng thư viện giao diện/biểu đồ qua CDN: Chart.js và sql.js.
- Chạy bằng static web server hoặc Live Server trong lúc phát triển. Không nên mở trực tiếp `file://` vì trình duyệt có thể chặn tải WebAssembly và module.

> Lưu ý quan trọng: Trình duyệt không tự mở và ghi trực tiếp các file `users.db`, `videos.db` trên ổ đĩa như ứng dụng desktop. Dự án dùng sql.js để nạp SQLite vào bộ nhớ trình duyệt, lưu bản làm việc trong IndexedDB/localStorage phù hợp, và cung cấp chức năng **Export/Import .db** để người dùng tải hoặc nạp lại file. Đây là mô hình demo/local-first, không phải hệ thống đa người dùng.

## 3. Cấu trúc file đề xuất
```text
video-admin/
├── index.html
├── login.html
├── register.html
├── forgot-password.html
├── videos.html
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── app.js
│   │   ├── database.js
│   │   ├── auth.js
│   │   ├── dashboard.js
│   │   └── videos.js
│   └── images/
├── database/
│   ├── users.db
│   ├── videos.db
│   ├── video_categories.db
│   └── video_tags.db
└── docs/
```

## 4. Cách dùng tài liệu
Đọc lần lượt:
1. `01_REQUIREMENTS.md`
2. `02_ARCHITECTURE.md`
3. `03_DATABASE_SCHEMA.md`
4. `04_UI_UX_GUIDELINES.md`
5. `05_PAGE_SPECIFICATIONS.md`
6. `06_SECURITY_AND_LIMITATIONS.md`
7. `07_ANTIGRAVITY_MASTER_PROMPT.md`
8. `08_IMPLEMENTATION_PLAN.md`

## 5. Tiêu chí hoàn thành
- Các trang liên kết và điều hướng được.
- Có dữ liệu mẫu để Dashboard và biểu đồ hiển thị.
- CRUD video hoạt động với SQLite trong trình duyệt.
- Login/Register/Forgot Password hoạt động ở mức demo local và có cảnh báo giới hạn bảo mật.
- Import/Export được các database `.db`.
- Không có backend hoặc API server.
