# 02 — Architecture

## 1. Kiến trúc tổng thể
Ứng dụng là **static client-side application**. Mọi logic chạy trong trình duyệt.

```text
HTML Pages
   |
Vanilla JavaScript
   |----------------------|
   |                      |
UI / Charts           Data Access Layer
Chart.js                  |
                      sql.js (WASM)
                          |
                 SQLite DB in browser memory
                          |
                 IndexedDB persistence
                          |
                  Import / Export .db
```

## 2. SQLite trong trình duyệt
Sử dụng `sql.js`:
- Load thư viện và file WebAssembly từ CDN.
- Khởi tạo database bằng `initSqlJs`.
- Nạp file database nếu đã tồn tại trong IndexedDB.
- Nếu chưa có, tạo database mới và chạy schema.
- Sau mỗi transaction ghi dữ liệu, export binary và lưu vào IndexedDB.
- Cho phép Export từng database thành file `.db`.
- Cho phép Import file `.db` tương ứng.

Không truy cập trực tiếp đường dẫn `database/users.db` để ghi file. Thư mục `database/` trong source có thể chứa file khởi tạo/mẫu; trình duyệt không thể tự ghi ngược vào thư mục này.

## 3. Tách database
Dùng các database riêng:
- `users.db`: tài khoản local.
- `videos.db`: thông tin video.
- `video_categories.db`: danh mục.
- `video_tags.db`: tag và quan hệ video-tag.
- `video_analytics.db`: dữ liệu lượt xem theo ngày.

Mỗi database cần có hàm khởi tạo, nạp, lưu, import và export riêng.

## 4. Data access layer
Tạo `assets/js/database.js` để cung cấp API thống nhất:
- `initDatabases()`
- `getDatabase(dbName)`
- `runQuery(dbName, sql, params)`
- `runStatement(dbName, sql, params)`
- `persistDatabase(dbName)`
- `exportDatabase(dbName)`
- `importDatabase(dbName, file)`
- `seedDemoData()`

Không để các trang HTML tự viết SQL rải rác. Tạo các hàm nghiệp vụ trong `videos.js`, `auth.js` và `dashboard.js`.

## 5. Lưu trữ
Ưu tiên IndexedDB để lưu binary SQLite giữa các lần mở trình duyệt. Có thể dùng localStorage cho một số thiết lập nhỏ như sidebar state, nhưng không dùng localStorage để lưu video binary lớn hoặc mật khẩu dạng rõ.

## 6. Điều hướng
- `index.html`: Dashboard.
- `videos.html`: List Video.
- `login.html`, `register.html`, `forgot-password.html`: Authentication.
- Khi chưa có session demo, trang dashboard và videos chuyển về login.
- Session demo có thể dùng sessionStorage. Đây không phải cơ chế bảo mật thật.
