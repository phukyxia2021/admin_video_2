# 01 — Project Requirements

## 1. Tổng quan
Tên dự án: **Video Admin**  
Mục đích: Website quản trị video dành cho một người dùng trên một trình duyệt/thiết bị.

## 2. Phạm vi chức năng

### 2.1 Dashboard
Hiển thị các thẻ thống kê:
- Tổng số video: đếm video chưa bị xóa.
- Tổng lượt xem: tổng `views` của tất cả video.
- Dung lượng storage: tổng dung lượng file video đã khai báo trong database, hiển thị MB/GB.
- Có thể bổ sung tổng số danh mục và video đang hoạt động.

Biểu đồ:
- Bar chart: Top 10 video có lượt xem cao nhất, sắp xếp giảm dần.
- Line chart: lượt xem theo ngày hoặc tháng.
- Có bộ chọn khoảng thời gian hoặc chế độ `Ngày` / `Tháng`.
- Nếu chưa có dữ liệu, hiển thị empty state thay vì biểu đồ trống khó hiểu.

### 2.2 List Video
Bảng dữ liệu gồm:
- ID
- Title
- Thumbnail
- Views
- Action: Edit, Delete

Bổ sung hữu ích:
- Search theo title.
- Lọc theo category.
- Sắp xếp theo views, title hoặc ngày tạo.
- Phân trang phía client.
- Nút Add Video.
- Xác nhận trước khi Delete.
- Form Add/Edit gồm title, description, thumbnail URL, category, views, file size, status và ngày đăng.
- Validate trường bắt buộc và URL thumbnail.

### 2.3 Login
- Email và password.
- Validate dữ liệu.
- Hiển thị/ẩn password.
- Thông báo lỗi thân thiện.
- Đăng nhập bằng tài khoản local đã đăng ký.

### 2.4 Register
- Name, email, password, confirm password.
- Kiểm tra email hợp lệ và không trùng.
- Kiểm tra password tối thiểu 8 ký tự.
- Kiểm tra password và confirm password trùng nhau.
- Sau khi đăng ký, chuyển đến Login hoặc tự đăng nhập theo lựa chọn triển khai.

### 2.5 Forgot Password
- Nhập email.
- Trong bản không backend, không gửi email thật.
- Mô phỏng quy trình reset local hoặc hiển thị hướng dẫn demo rõ ràng.
- Không tiết lộ email có tồn tại hay không trong thông báo giao diện.

## 3. Phi chức năng
- Light mode, nền trắng, typography rõ ràng.
- Responsive desktop/tablet/mobile.
- Sidebar desktop, menu thu gọn trên màn hình nhỏ.
- Không dùng framework frontend.
- Không có backend.
- Code chia file theo chức năng, đặt tên dễ hiểu.
- Có comment tại các phần xử lý database và biểu đồ.
- Dữ liệu mẫu tối thiểu 12 video và 30 ngày lịch sử lượt xem.

## 4. Ngoài phạm vi
- Upload video lên cloud.
- Streaming video.
- Đồng bộ dữ liệu giữa nhiều người dùng/thiết bị.
- Xác thực an toàn production.
- Gửi email reset password.
- Phân quyền admin nhiều cấp.
