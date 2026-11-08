# 04 — UI/UX Guidelines

## 1. Visual direction
- Light mode.
- Nền tổng thể: `#F7F8FA`.
- Sidebar và card: `#FFFFFF`.
- Text chính: `#172033`.
- Text phụ: `#667085`.
- Border: `#E6EAF0`.
- Primary: `#4F46E5`.
- Success: `#16A34A`.
- Danger: `#DC2626`.
- Font: system font stack hoặc Google Font Inter nếu có internet.

## 2. Layout
Desktop:
- Sidebar cố định bên trái, rộng khoảng 240px.
- Main content chiếm phần còn lại.
- Header có breadcrumb, search hoặc user menu.
- Dashboard dùng grid card 3 cột; biểu đồ đặt dưới KPI.

Mobile:
- Sidebar chuyển thành drawer hoặc menu hamburger.
- KPI hiển thị 1 cột hoặc 2 cột tùy chiều rộng.
- Bảng video có thể cuộn ngang hoặc chuyển thành card list.

## 3. Components
- Sidebar navigation.
- Topbar.
- KPI card.
- Chart card.
- Data table.
- Search input.
- Select filter.
- Modal add/edit.
- Confirm delete dialog.
- Toast notification.
- Empty state.
- Loading state.
- Form field và validation message.

## 4. Accessibility
- Mọi input có label.
- Button có nội dung/aria-label rõ ràng.
- Có focus state nhìn thấy được.
- Không chỉ dùng màu để biểu thị trạng thái.
- Đảm bảo độ tương phản tốt.
- Có thể thao tác bằng bàn phím.

## 5. Charts
Dùng Chart.js qua CDN:
- Bar chart: Top 10 video.
- Line chart: lượt xem theo ngày/tháng.
- Responsive, tooltip, legend phù hợp.
- Không hard-code số liệu trong chart; lấy dữ liệu từ database.
