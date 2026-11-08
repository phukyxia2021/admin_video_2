# 08 — Implementation Plan

## Phase 1: Project setup
- Tạo cấu trúc thư mục.
- Tạo HTML cho 5 trang.
- Tạo CSS nền tảng, layout, sidebar và responsive.
- Thêm CDN cho sql.js và Chart.js.

## Phase 2: Database layer
- Khởi tạo sql.js.
- Tạo helper quản lý nhiều database.
- Tạo schema cho users, videos, categories, tags, analytics.
- Tạo IndexedDB persistence.
- Tạo import/export `.db`.
- Seed dữ liệu demo.

## Phase 3: Authentication demo
- Register với validate.
- Login với kiểm tra tài khoản local.
- Logout.
- Guard các trang admin bằng sessionStorage.
- Forgot Password hiển thị rõ giới hạn demo.

## Phase 4: Video management
- Render danh sách video.
- Search/filter/sort/pagination.
- Add video.
- Edit video.
- Delete video có xác nhận.
- Persist database sau mỗi thao tác.

## Phase 5: Dashboard
- Query KPI.
- Query Top 10 videos.
- Query analytics daily/monthly.
- Render Chart.js.
- Toggle Daily/Monthly.
- Refresh dashboard sau khi dữ liệu thay đổi.

## Phase 6: Quality check
- Test form validation.
- Test dữ liệu rỗng.
- Test dữ liệu nhiều trang.
- Test import file sai định dạng.
- Test refresh browser.
- Test responsive.
- Test lỗi CDN/WASM.
- Kiểm tra console không có lỗi.

## Checklist nghiệm thu
- [ ] Dashboard hiển thị 3 KPI.
- [ ] Top 10 bar chart hoạt động.
- [ ] Daily/Monthly line chart hoạt động.
- [ ] Video table có ID, title, thumbnail, views, actions.
- [ ] Add/Edit/Delete hoạt động.
- [ ] Register/Login/Logout hoạt động ở mức demo.
- [ ] Forgot Password có thông báo đúng sự thật.
- [ ] SQLite được lưu giữa các lần refresh bằng IndexedDB.
- [ ] Import/Export từng file `.db` hoạt động.
- [ ] Không có backend.
- [ ] Giao diện light mode responsive.
