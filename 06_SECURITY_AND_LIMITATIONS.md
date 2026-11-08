# 06 — Security and Limitations

## 1. Cảnh báo kiến trúc
Website không backend và chạy trong trình duyệt nên **không phù hợp để quản lý tài khoản hoặc dữ liệu nhạy cảm trong môi trường production**.

Các giới hạn:
- Người dùng có thể xem/sửa dữ liệu và JavaScript bằng DevTools.
- Database phía client có thể bị xóa bởi người dùng hoặc trình duyệt.
- Không có xác thực server-side.
- Không có phân quyền thực sự.
- Không thể gửi email reset password nếu không có dịch vụ bên ngoài.
- Không có cơ chế đồng bộ dữ liệu giữa các máy.
- Nhiều người dùng dùng chung một bản deploy không có database dùng chung.

## 2. Mật khẩu
- Không lưu password dạng rõ.
- Có thể dùng Web Crypto API để tạo hash trong demo, nhưng hash client-side không biến ứng dụng thành hệ thống xác thực an toàn.
- Không tự thiết kế thuật toán hash.
- Nếu triển khai thực tế, dùng backend và thuật toán password hashing phù hợp như Argon2id/bcrypt ở server.

## 3. Forgot Password
Không thể gửi email thật chỉ bằng HTML/CSS/JavaScript và SQLite local. Bản demo nên:
- Hiển thị hướng dẫn reset demo; hoặc
- Cho phép reset local có xác nhận rõ ràng và chỉ dùng cho dữ liệu giả lập.

Không hiển thị rằng email đã được gửi nếu không có dịch vụ email thực sự.

## 4. File video và storage
- Không lưu file video lớn trực tiếp vào SQLite trong bản đầu tiên.
- `video_url` có thể là URL hoặc đường dẫn tham chiếu.
- `file_size_bytes` là dung lượng metadata do người dùng nhập hoặc lấy từ file được chọn.
- KPI Storage Used là tổng dung lượng khai báo, không nhất thiết là dung lượng thực tế của thư mục/ổ đĩa.
- Thumbnail ưu tiên URL ảnh nhỏ hoặc ảnh placeholder nhẹ.

## 5. Import/Export
- Kiểm tra loại file và kích thước trước khi import.
- Sao lưu database trước khi thay thế.
- Xác nhận tên database đích.
- Không tự động import file không rõ nguồn gốc.
