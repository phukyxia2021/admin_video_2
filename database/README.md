# Thư mục Database — Video Admin

Ứng dụng chạy hoàn toàn trên trình duyệt sử dụng thư viện **sql.js (WebAssembly)** và lưu trữ nhị phân bền vững qua **IndexedDB**.

## Các database được tách riêng:
1. `users.db`: Tài khoản quản trị và bảng hash mật khẩu demo.
2. `videos.db`: Danh sách video, tiêu đề, thumbnail URL, views, dung lượng và trạng thái.
3. `video_categories.db`: Bảng danh mục chủ đề (`categories`).
4. `video_tags.db`: Bảng thẻ tag (`tags`) và bảng liên kết `video_tag_map`.
5. `video_analytics.db`: Bảng thống kê lượt xem theo ngày (`video_views_daily`).

## Cách sao lưu & nạp dữ liệu:
- Nhấn nút **"Export / Backup DB"** hoặc **"Quản lý Database"** trên thanh menu của ứng dụng để tải về trực tiếp từng file `.db` hoặc tải toàn bộ 5 file `.db`.
- Khi cần nạp lại dữ liệu từ file `.db` trên máy, sử dụng chức năng **Import .db** trong hộp thoại Quản lý Database.
