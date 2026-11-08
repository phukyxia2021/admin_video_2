# 03 — Database Schema

## 1. Nguyên tắc
- Dùng SQLite.
- Khai báo primary key, foreign key và index.
- Dùng ISO-8601 cho ngày giờ, ví dụ `2026-11-08T10:30:00Z`.
- Lượt xem và dung lượng lưu dưới dạng số nguyên.
- Dữ liệu demo có thể seed bằng JavaScript khi khởi tạo.

## 2. users.db
```sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disabled'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

`password_hash` chỉ dùng để minh họa trong ứng dụng local. Không xem đây là xác thực an toàn production. Không lưu password dạng rõ.

## 3. videos.db
```sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  video_url TEXT,
  category_id INTEGER,
  views INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
  file_size_bytes INTEGER NOT NULL DEFAULT 0 CHECK (file_size_bytes >= 0),
  status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'published', 'archived')),
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_videos_title ON videos(title);
CREATE INDEX IF NOT EXISTS idx_videos_views ON videos(views DESC);
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category_id);
```

Do database được tách riêng, SQLite không đảm bảo foreign key giữa các file database. `category_id` được kiểm tra ở tầng JavaScript với `video_categories.db`.

## 4. video_categories.db
```sql
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## 5. video_tags.db
```sql
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS video_tag_map (
  video_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (video_id, tag_id)
);
```

## 6. video_analytics.db
```sql
CREATE TABLE IF NOT EXISTS video_views_daily (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id INTEGER NOT NULL,
  view_date TEXT NOT NULL, -- YYYY-MM-DD
  views INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
  UNIQUE(video_id, view_date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_date
  ON video_views_daily(view_date);

CREATE INDEX IF NOT EXISTS idx_analytics_video
  ON video_views_daily(video_id);
```

## 7. Query mẫu cho Dashboard

### Tổng số video
```sql
SELECT COUNT(*) AS total_videos
FROM videos
WHERE status != 'archived';
```

### Tổng lượt xem
```sql
SELECT COALESCE(SUM(views), 0) AS total_views
FROM videos
WHERE status = 'published';
```

### Tổng dung lượng
```sql
SELECT COALESCE(SUM(file_size_bytes), 0) AS total_storage_bytes
FROM videos
WHERE status != 'archived';
```

### Top 10 video
```sql
SELECT id, title, views, thumbnail_url
FROM videos
WHERE status = 'published'
ORDER BY views DESC
LIMIT 10;
```

### Lượt xem theo ngày
```sql
SELECT view_date, SUM(views) AS total_views
FROM video_views_daily
GROUP BY view_date
ORDER BY view_date ASC;
```

### Lượt xem theo tháng
```sql
SELECT substr(view_date, 1, 7) AS month,
       SUM(views) AS total_views
FROM video_views_daily
GROUP BY substr(view_date, 1, 7)
ORDER BY month ASC;
```

## 8. Quy tắc nhất quán dữ liệu
- Khi xóa video, xóa các dòng liên quan trong `video_tag_map` và `video_views_daily`.
- Khi xóa category đang được sử dụng, yêu cầu chuyển video sang category khác hoặc đặt `category_id = NULL`.
- Nếu import database riêng lẻ, kiểm tra schema version và dữ liệu tham chiếu.
- Thêm bảng `schema_meta` hoặc `PRAGMA user_version` để quản lý phiên bản schema.
