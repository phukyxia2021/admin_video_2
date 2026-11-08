# 05 — Page Specifications

## 1. Dashboard — index.html
### Header
- Tiêu đề `Dashboard`.
- Subtitle ngắn: tổng quan hiệu suất nội dung.
- Nút Export Database.

### KPI cards
1. Total Videos
2. Total Views
3. Storage Used

### Charts
- `topVideosChart`: bar chart top 10.
- `viewsTrendChart`: line chart lượt xem theo ngày/tháng.
- Bộ chọn `Daily` / `Monthly`.

### Hành vi
- Đọc dữ liệu từ database khi load trang.
- Refresh chart sau khi database thay đổi.
- Nếu không có dữ liệu, hiển thị empty state và CTA Add Video.

## 2. List Video — videos.html
### Header
- Title `Videos`.
- Nút `Add Video`.
- Search box.
- Category filter.

### Table columns
| Column | Nội dung |
|---|---|
| ID | ID video |
| Title | Tiêu đề |
| Thumbnail | Ảnh thumbnail |
| Views | Định dạng số có dấu phân cách |
| Action | Edit, Delete |

### Add/Edit modal
Fields:
- Title (required)
- Description
- Thumbnail URL
- Video URL
- Category
- Views
- File size (bytes hoặc MB; chuẩn hóa thành bytes)
- Status
- Published date

### Delete
- Mở confirm dialog.
- Chỉ xóa sau khi người dùng xác nhận.
- Cập nhật bảng và dashboard sau khi xóa.

## 3. Login — login.html
Fields:
- Email
- Password
- Show password checkbox/button
- Remember session (optional)
- Link Forgot Password
- Link Register

## 4. Register — register.html
Fields:
- Full name
- Email
- Password
- Confirm password
- Link Login

## 5. Forgot Password — forgot-password.html
Fields:
- Email
- Submit
- Back to Login

Thông báo cần nói rõ: bản demo không gửi email thật. Nếu muốn reset password local, chỉ cho phép thực hiện trong môi trường demo và xác nhận rõ đây không phải quy trình bảo mật.

## 6. Navigation
- Sidebar: Dashboard, Videos.
- User menu: Profile (optional), Export DB, Logout.
- Authentication pages có layout đơn giản, tập trung vào form.
