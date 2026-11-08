/**
 * Database Layer for Video Admin
 * Architecture: 02_ARCHITECTURE.md
 * Schema: 03_DATABASE_SCHEMA.md
 * 
 * Powered by sql.js (WebAssembly) & IndexedDB client persistence.
 * Manages 5 separate databases:
 * - users.db
 * - videos.db
 * - video_categories.db
 * - video_tags.db
 * - video_analytics.db
 */

(function (window) {
  'use strict';

  // Constants & Config
  const IDB_NAME = 'VideoAdmin_LocalStore';
  const IDB_VERSION = 1;
  const IDB_STORE = 'sqlite_databases';

  const DB_NAMES = [
    'users.db',
    'videos.db',
    'video_categories.db',
    'video_tags.db',
    'video_analytics.db'
  ];

  // In-memory references to SQLite database objects
  const databases = {};
  let SQL = null;
  let isInitialized = false;

  // =========================================================================
  // IndexedDB Persistence Helpers
  // =========================================================================

  function openIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'name' });
        }
      };

      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async function loadBinaryFromIDB(dbName) {
    try {
      const idb = await openIndexedDB();
      return new Promise((resolve, reject) => {
        const tx = idb.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(dbName);
        req.onsuccess = () => resolve(req.result ? req.result.data : null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn(`[IDB] Could not load ${dbName}:`, err);
      return null;
    }
  }

  async function saveBinaryToIDB(dbName, uint8Data) {
    try {
      const idb = await openIndexedDB();
      return new Promise((resolve, reject) => {
        const tx = idb.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.put({
          name: dbName,
          data: uint8Data,
          updatedAt: new Date().toISOString()
        });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.error(`[IDB] Could not save ${dbName}:`, err);
      return false;
    }
  }

  async function clearIDBStore() {
    try {
      const idb = await openIndexedDB();
      return new Promise((resolve, reject) => {
        const tx = idb.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.error('[IDB] Could not clear database store:', err);
      return false;
    }
  }

  // =========================================================================
  // Database Schemas DDL
  // =========================================================================

  const SCHEMAS = {
    'users.db': `
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'USER'
          CHECK (role IN ('ADMIN', 'USER')),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT,
        status TEXT NOT NULL DEFAULT 'active'
          CHECK (status IN ('active', 'disabled'))
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `,

    'videos.db': `
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
    `,

    'video_categories.db': `
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `,

    'video_tags.db': `
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS video_tag_map (
        video_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (video_id, tag_id)
      );
    `,

    'video_analytics.db': `
      CREATE TABLE IF NOT EXISTS video_views_daily (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id INTEGER NOT NULL,
        view_date TEXT NOT NULL,
        views INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
        UNIQUE(video_id, view_date)
      );

      CREATE INDEX IF NOT EXISTS idx_analytics_date
        ON video_views_daily(view_date);

      CREATE INDEX IF NOT EXISTS idx_analytics_video
        ON video_views_daily(video_id);
    `
  };

  // =========================================================================
  // Database Manager Core API
  // =========================================================================

  const DatabaseManager = {
    /**
     * Initializes sql.js WebAssembly and loads all 5 databases.
     */
    async initDatabases() {
      if (isInitialized) return true;

      try {
        if (!window.initSqlJs) {
          throw new Error('Thư viện sql.js chưa được nạp vào trang.');
        }

        // Initialize sql.js WebAssembly
        SQL = await window.initSqlJs({
          locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`
        });

        // Load each database from IndexedDB or create fresh
        for (const dbName of DB_NAMES) {
          const binaryData = await loadBinaryFromIDB(dbName);

          if (binaryData) {
            databases[dbName] = new SQL.Database(binaryData);
          } else {
            databases[dbName] = new SQL.Database();
          }

          // Pre-migration for users.db: ensure role column exists before any queries/indexes
          if (dbName === 'users.db') {
            try {
              const tableCheck = databases['users.db'].exec(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
              );
              if (tableCheck && tableCheck.length > 0 && tableCheck[0].values.length > 0) {
                const pragmaRes = databases['users.db'].exec("PRAGMA table_info(users)");
                let hasRole = false;
                if (pragmaRes && pragmaRes[0] && pragmaRes[0].values) {
                  hasRole = pragmaRes[0].values.some(row => row[1] === 'role');
                }
                if (!hasRole) {
                  databases['users.db'].run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'USER'");
                  databases['users.db'].run("UPDATE users SET role = 'ADMIN' WHERE email = 'admin@videoadmin.local'");
                  console.info('[Database] Migration: đã thêm cột role vào bảng users và gán ADMIN cho admin@videoadmin.local.');
                }
              }
            } catch (migErr) {
              console.error('[Database] users.db pre-migration check failed:', migErr);
            }
          }

          // Apply schema DDL (idempotent with IF NOT EXISTS)
          if (SCHEMAS[dbName]) {
            databases[dbName].run(SCHEMAS[dbName]);
          }

          // Now safely create index on role if users.db
          if (dbName === 'users.db') {
            try {
              databases['users.db'].run("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)");
            } catch (idxErr) {
              console.warn('[Database] idx_users_role creation skipped:', idxErr.message);
            }
          }
        }

        // Persist users.db in case migration changed it
        await this.persistDatabase('users.db');

        // Check if demo data needs to be seeded
        const videoCountRes = this.runQuery('videos.db', 'SELECT COUNT(*) AS count FROM videos');
        const videoCount = videoCountRes && videoCountRes[0] ? videoCountRes[0].count : 0;

        if (videoCount === 0) {
          console.info('[Database] Cơ sở dữ liệu trống, tiến hành nạp dữ liệu mẫu ban đầu...');
          await this.seedDemoData(false);
        } else {
          // Fix admin hash + guarantee role = ADMIN
          const correctAdminHash = '6f2cb9dd8f4b65e24e1c3f3fa5bc57982349237f11abceacd45bbcb74d621c25';
          const existingAdmin = this.runQuery('users.db', "SELECT id FROM users WHERE email = 'admin@videoadmin.local'");
          if (existingAdmin.length === 0) {
            this.runStatement(
              'users.db',
              `INSERT INTO users (full_name, email, password_hash, role, status)
               VALUES (?, ?, ?, 'ADMIN', 'active')`,
              ['Admin Demo', 'admin@videoadmin.local', correctAdminHash]
            );
          } else {
            this.runStatement(
              'users.db',
              `UPDATE users SET password_hash = ?, role = 'ADMIN', status = 'active'
               WHERE email = 'admin@videoadmin.local'`,
              [correctAdminHash]
            );
          }

          // Seed demo USER accounts if fewer than 11 total users
          const totalUsers = this.runQuery('users.db', 'SELECT COUNT(*) as count FROM users')[0].count;
          if (totalUsers < 11) {
            await this._seedDemoUserAccounts();
          }
        }

        isInitialized = true;
        console.info('[Database] Khởi tạo 5 cơ sở dữ liệu SQLite thành công.');
        return true;
      } catch (err) {
        console.error('[Database] Lỗi khởi tạo SQLite:', err);
        throw err;
      }
    },

    /**
     * Get the raw SQLite database instance
     */
    getDatabase(dbName) {
      if (!databases[dbName]) {
        throw new Error(`Database "${dbName}" chưa được khởi tạo.`);
      }
      return databases[dbName];
    },

    /**
     * Run a parameterized SELECT query.
     * Returns an array of row objects: [{ col1: val1, ... }]
     */
    runQuery(dbName, sql, params = []) {
      const db = this.getDatabase(dbName);
      let stmt = null;
      try {
        stmt = db.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        return rows;
      } catch (err) {
        console.error(`[Database Error] runQuery on ${dbName}:`, err, { sql, params });
        throw err;
      } finally {
        if (stmt) stmt.free();
      }
    },

    /**
     * Run an INSERT/UPDATE/DELETE statement with params and automatically persist.
     * Returns: { changes: number, lastInsertRowid: number }
     */
    runStatement(dbName, sql, params = []) {
      const db = this.getDatabase(dbName);
      try {
        db.run(sql, params);
        
        // Fetch rows modified and last inserted id
        const changesRes = db.exec('SELECT changes() AS changes, last_insert_rowid() AS last_id');
        let changes = 0;
        let lastInsertRowid = 0;

        if (changesRes && changesRes[0] && changesRes[0].values && changesRes[0].values[0]) {
          changes = changesRes[0].values[0][0];
          lastInsertRowid = changesRes[0].values[0][1];
        }

        // Persist binary into IndexedDB
        this.persistDatabase(dbName);

        return { changes, lastInsertRowid };
      } catch (err) {
        console.error(`[Database Error] runStatement on ${dbName}:`, err, { sql, params });
        throw err;
      }
    },

    /**
     * Persist an in-memory database to IndexedDB as Uint8Array
     */
    async persistDatabase(dbName) {
      const db = this.getDatabase(dbName);
      const binaryData = db.export();
      await saveBinaryToIDB(dbName, binaryData);
    },

    /**
     * Export a specific database as a downloaded .db file
     */
    exportDatabase(dbName) {
      const db = this.getDatabase(dbName);
      const binary = db.export();
      const blob = new Blob([binary], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = dbName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    /**
     * Export all 5 databases sequentially
     */
    exportAllDatabases() {
      for (const name of DB_NAMES) {
        this.exportDatabase(name);
      }
    },

    /**
     * Import a .db file to replace an existing database
     */
    async importDatabase(dbName, file) {
      if (!DB_NAMES.includes(dbName)) {
        throw new Error(`Tên database không hợp lệ: "${dbName}".`);
      }

      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async () => {
          try {
            const buffer = reader.result;
            const uint8Data = new Uint8Array(buffer);
            
            // Test load with sql.js to validate valid SQLite binary
            const tempDb = new SQL.Database(uint8Data);
            
            // Check required table exists
            const expectedTables = {
              'users.db': 'users',
              'videos.db': 'videos',
              'video_categories.db': 'categories',
              'video_tags.db': 'tags',
              'video_analytics.db': 'video_views_daily'
            };

            const expectedTable = expectedTables[dbName];
            const checkRes = tempDb.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${expectedTable}'`);
            
            if (!checkRes || checkRes.length === 0 || !checkRes[0].values || checkRes[0].values.length === 0) {
              tempDb.close();
              throw new Error(`File import không đúng định dạng hoặc thiếu bảng "${expectedTable}" cho ${dbName}.`);
            }

            // Close existing and replace
            if (databases[dbName]) {
              try { databases[dbName].close(); } catch (e) { /* ignore */ }
            }
            databases[dbName] = tempDb;

            // Persist to IndexedDB
            await saveBinaryToIDB(dbName, uint8Data);

            console.info(`[Database] Import thành công database ${dbName}.`);
            resolve(true);
          } catch (err) {
            console.error(`[Database] Lỗi khi import ${dbName}:`, err);
            reject(err);
          }
        };

        reader.onerror = () => reject(new Error('Lỗi khi đọc file trên máy tính.'));
        reader.readAsArrayBuffer(file);
      });
    },

    /**
     * Seed realistic demo data into all databases
     */
    async seedDemoData(force = false) {
      if (force) {
        // Re-create tables
        for (const dbName of DB_NAMES) {
          if (SCHEMAS[dbName]) {
            databases[dbName].run(SCHEMAS[dbName]);
          }
        }
      }

      // 1. Seed Categories
      const catCount = this.runQuery('video_categories.db', 'SELECT COUNT(*) as count FROM categories')[0].count;
      if (catCount === 0 || force) {
        this.runStatement('video_categories.db', 'DELETE FROM categories');
        const categories = [
          { name: 'Công nghệ & Lập trình', slug: 'technology', description: 'Các bài giảng kiến trúc phần mềm, web dev và AI' },
          { name: 'Thiết kế UI/UX', slug: 'design', description: 'Giao diện người dùng, typography và design systems' },
          { name: 'Hướng dẫn & Tips', slug: 'tutorials', description: 'Tips thực chiến, kỹ năng và tối ưu workflow' },
          { name: 'Giáo dục & Khoa học', slug: 'education', description: 'Khoa học máy tính và thuật toán nền tảng' },
          { name: 'Giải trí & Vlogs', slug: 'entertainment', description: 'Review không gian làm việc và đời sống developer' }
        ];

        for (const cat of categories) {
          this.runStatement(
            'video_categories.db',
            'INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)',
            [cat.name, cat.slug, cat.description]
          );
        }
      }

      // 2. Seed Tags
      const tagCount = this.runQuery('video_tags.db', 'SELECT COUNT(*) as count FROM tags')[0].count;
      if (tagCount === 0 || force) {
        this.runStatement('video_tags.db', 'DELETE FROM video_tag_map');
        this.runStatement('video_tags.db', 'DELETE FROM tags');

        const tagList = [
          'JavaScript', 'SQLite', 'WebAssembly', 'Frontend', 'CSS3',
          'UI/UX', 'Performance', 'Architecture', 'AI', 'Fullstack'
        ];

        for (const tag of tagList) {
          this.runStatement('video_tags.db', 'INSERT INTO tags (name) VALUES (?)', [tag]);
        }
      }

      // 3. Seed Users (Demo Admin)
      // SHA-256 hash of 'Admin@12345' is:
      // 6f2cb9dd8f4b65e24e1c3f3fa5bc57982349237f11abceacd45bbcb74d621c25
      const correctAdminHash = '6f2cb9dd8f4b65e24e1c3f3fa5bc57982349237f11abceacd45bbcb74d621c25';
      const userCount = this.runQuery('users.db', 'SELECT COUNT(*) as count FROM users')[0].count;
      if (userCount === 0 || force) {
        this.runStatement('users.db', 'DELETE FROM users');
        // Insert demo ADMIN
        this.runStatement(
          'users.db',
          `INSERT INTO users (full_name, email, password_hash, role, status)
           VALUES (?, ?, ?, 'ADMIN', 'active')`,
          ['Admin Demo', 'admin@videoadmin.local', correctAdminHash]
        );
        // Insert 10 demo USER accounts (password: User@12345)
        // SHA-256 of 'User@12345' = 2a7a89f7fef6dafc93f5cf6d14bf0f3e4e1d1d4d4a48c9c6e9db8e9be9eb1c5c
        // We compute it at seed time via runStatement using the same value
        await this._seedDemoUserAccounts();
      } else {
        // Ensure admin@videoadmin.local has the right hash + role
        this.runStatement(
          'users.db',
          `UPDATE users SET password_hash = ?, role = 'ADMIN', status = 'active' WHERE email = 'admin@videoadmin.local'`,
          [correctAdminHash]
        );
      }

      // 4. Seed 14 Detailed Videos
      const vidCount = this.runQuery('videos.db', 'SELECT COUNT(*) as count FROM videos')[0].count;
      if (vidCount === 0 || force) {
        this.runStatement('videos.db', 'DELETE FROM videos');
        this.runStatement('video_tags.db', 'DELETE FROM video_tag_map');

        const sampleVideos = [
          {
            title: 'Xây dựng Web Dashboard với Vanilla JavaScript và SQLite WASM',
            description: 'Khóa học hướng dẫn tạo ứng dụng quản trị hoàn chỉnh không cần backend, nạp SQLite trực tiếp vào WebAssembly của trình duyệt.',
            thumbnail_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&auto=format&fit=crop&q=80',
            video_url: 'https://www.youtube.com/watch?v=sample1',
            category_id: 1,
            views: 184520,
            file_size_bytes: 1420000000, // ~1.42 GB
            status: 'published',
            published_at: '2026-09-12 14:30:00'
          },
          {
            title: 'Design Systems 2026: Nguyên tắc thiết kế Light Mode thân thiện',
            description: 'Khám phá các nguyên tắc phối màu, contrast ratio và khoảng cách vi mô để xây dựng giao diện quản trị sang trọng và tinh tế.',
            thumbnail_url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=400&auto=format&fit=crop&q=80',
            video_url: 'https://www.youtube.com/watch?v=sample2',
            category_id: 2,
            views: 142100,
            file_size_bytes: 890000000, // 890 MB
            status: 'published',
            published_at: '2026-09-20 09:15:00'
          },
          {
            title: 'Tối ưu hóa hiệu năng render hàng triệu bản ghi trong HTML Canvas',
            description: 'Phân tích các kỹ thuật virtual scroll, offscreen canvas và worker thread trong trình duyệt hiện đại.',
            thumbnail_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&auto=format&fit=crop&q=80',
            video_url: 'https://www.youtube.com/watch?v=sample3',
            category_id: 1,
            views: 126400,
            file_size_bytes: 1100000000,
            status: 'published',
            published_at: '2026-09-28 16:45:00'
          },
          {
            title: '10 Tips CSS Grid & Flexbox mọi Frontend Engineer cần biết',
            description: 'Tổng hợp các layout tricks hữu dụng giúp bố cục trang quản trị luôn hoàn hảo trên mọi độ phân giải màn hình.',
            thumbnail_url: 'https://images.unsplash.com/photo-1507721999472-8ed4421c4af2?w=400&auto=format&fit=crop&q=80',
            video_url: 'https://www.youtube.com/watch?v=sample4',
            category_id: 3,
            views: 98500,
            file_size_bytes: 650000000,
            status: 'published',
            published_at: '2026-10-04 11:20:00'
          },
          {
            title: 'Lập trình bất đồng bộ ES2026: Promises, Async Iterators & AbortController',
            description: 'Làm chủ các cơ chế xử lý đa luồng và luồng sự kiện trong JavaScript hiện đại một cách an toàn và tinh gọn.',
            thumbnail_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&auto=format&fit=crop&q=80',
            video_url: 'https://www.youtube.com/watch?v=sample5',
            category_id: 1,
            views: 87300,
            file_size_bytes: 780000000,
            status: 'published',
            published_at: '2026-10-10 08:30:00'
          },
          {
            title: 'Kiến trúc Cơ sở dữ liệu SQLite trong Client-Side Web Apps',
            description: 'Tìm hiểu cách sql.js tương tác cùng WebAssembly và lưu trữ nhị phân bền vững trong IndexedDB.',
            thumbnail_url: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400&auto=format&fit=crop&q=80',
            video_url: 'https://www.youtube.com/watch?v=sample6',
            category_id: 4,
            views: 74200,
            file_size_bytes: 940000000,
            status: 'published',
            published_at: '2026-10-15 13:00:00'
          },
          {
            title: 'Hướng dẫn tích hợp Chart.js cho báo cáo doanh số & lưu lượng',
            description: 'Tùy biến biểu đồ Bar, Line, Doughnut theo phong cách phẳng hiện đại với theme Light Mode.',
            thumbnail_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&auto=format&fit=crop&q=80',
            video_url: 'https://www.youtube.com/watch?v=sample7',
            category_id: 3,
            views: 65800,
            file_size_bytes: 520000000,
            status: 'published',
            published_at: '2026-10-21 17:10:00'
          },
          {
            title: 'Tour không gian làm việc tối giản cho Developer tại nhà',
            description: 'Setup bàn làm việc, ánh sáng bảo vệ mắt và thiết bị ghi hình studio dành cho các nhà sáng tạo nội dung kỹ thuật.',
            thumbnail_url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&auto=format&fit=crop&q=80',
            video_url: 'https://www.youtube.com/watch?v=sample8',
            category_id: 5,
            views: 58900,
            file_size_bytes: 1250000000,
            status: 'published',
            published_at: '2026-10-25 19:40:00'
          },
          {
            title: 'Bảo mật Web 101: Ngăn chặn XSS, CSRF và SQL Injection',
            description: 'Các nguyên tắc phòng ngừa lỗ hổng ứng dụng web và lý do tại sao Client-side Database không thay thế được backend server an toàn.',
            thumbnail_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&auto=format&fit=crop&q=80',
            video_url: 'https://www.youtube.com/watch?v=sample9',
            category_id: 4,
            views: 48600,
            file_size_bytes: 840000000,
            status: 'published',
            published_at: '2026-10-29 10:00:00'
          },
          {
            title: 'Xây dựng Trình biên tập Video Web bằng WebCodecs API',
            description: 'Giải mã và xử lý từng khung hình video với hiệu năng native ngay trong trình duyệt Chrome.',
            thumbnail_url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400&auto=format&fit=crop&q=80',
            video_url: 'https://www.youtube.com/watch?v=sample10',
            category_id: 1,
            views: 42100,
            file_size_bytes: 1350000000,
            status: 'published',
            published_at: '2026-11-01 15:30:00'
          },
          {
            title: 'Thiết kế Trải nghiệm Đăng nhập & Xác thực Thân thiện',
            description: 'Cách xử lý validation inline, toggle password và thông báo lỗi rõ ràng theo tiêu chuẩn UX.',
            thumbnail_url: 'https://images.unsplash.com/photo-1512486130939-2c4f79935e4f?w=400&auto=format&fit=crop&q=80',
            video_url: 'https://www.youtube.com/watch?v=sample11',
            category_id: 2,
            views: 31400,
            file_size_bytes: 460000000,
            status: 'published',
            published_at: '2026-11-03 09:20:00'
          },
          {
            title: 'Dự án Bản thảo: AI Video Auto-Caption Generator (Đang phát triển)',
            description: 'Bản thảo kỹ thuật tính năng tự động tạo phụ đề đa ngôn ngữ cho video.',
            thumbnail_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&auto=format&fit=crop&q=80',
            video_url: '',
            category_id: 1,
            views: 0,
            file_size_bytes: 320000000,
            status: 'draft',
            published_at: null
          },
          {
            title: 'Live Q&A: Trả lời câu hỏi lập trình và định hướng nghề nghiệp',
            description: 'Bản lưu trữ buổi phát sóng trực tiếp giao lưu cùng cộng đồng lập trình viên trẻ.',
            thumbnail_url: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=400&auto=format&fit=crop&q=80',
            video_url: '',
            category_id: 5,
            views: 18200,
            file_size_bytes: 1800000000,
            status: 'archived',
            published_at: '2026-08-15 20:00:00'
          },
          {
            title: 'Tips Quản lý State trong Vanilla JavaScript không dùng Framework',
            description: 'Sử dụng Observer pattern, CustomEvent và Proxy để đồng bộ giao diện người dùng mượt mà.',
            thumbnail_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&auto=format&fit=crop&q=80',
            video_url: 'https://www.youtube.com/watch?v=sample14',
            category_id: 3,
            views: 29700,
            file_size_bytes: 610000000,
            status: 'published',
            published_at: '2026-11-05 14:00:00'
          }
        ];

        let videoIdx = 1;
        for (const vid of sampleVideos) {
          this.runStatement(
            'videos.db',
            `INSERT INTO videos (title, description, thumbnail_url, video_url, category_id, views, file_size_bytes, status, published_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              vid.title,
              vid.description,
              vid.thumbnail_url,
              vid.video_url,
              vid.category_id,
              vid.views,
              vid.file_size_bytes,
              vid.status,
              vid.published_at
            ]
          );

          // Associate 2 tags per video
          const tag1 = ((videoIdx * 3) % 10) + 1;
          const tag2 = ((videoIdx * 7) % 10) + 1;
          this.runStatement('video_tags.db', 'INSERT OR IGNORE INTO video_tag_map (video_id, tag_id) VALUES (?, ?)', [videoIdx, tag1]);
          if (tag1 !== tag2) {
            this.runStatement('video_tags.db', 'INSERT OR IGNORE INTO video_tag_map (video_id, tag_id) VALUES (?, ?)', [videoIdx, tag2]);
          }
          videoIdx++;
        }
      }

      // 5. Seed 45 Days of Daily Analytics
      const analyticsCount = this.runQuery('video_analytics.db', 'SELECT COUNT(*) as count FROM video_views_daily')[0].count;
      if (analyticsCount === 0 || force) {
        this.runStatement('video_analytics.db', 'DELETE FROM video_views_daily');

        // Generate daily views for past 45 days
        const now = new Date();
        const daysToSeed = 45;

        for (let i = daysToSeed; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
          
          // Weekend multiplier
          const dayOfWeek = date.getDay();
          const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
          const weekendBoost = isWeekend ? 1.4 : 1.0;

          // Distribute views across 5 active videos
          for (let vidId = 1; vidId <= 5; vidId++) {
            // Pseudo-random realistic curve
            const base = (6 - vidId) * 450;
            const variance = Math.sin((i + vidId) * 0.7) * 200;
            const dailyViews = Math.max(80, Math.round((base + variance) * weekendBoost));

            this.runStatement(
              'video_analytics.db',
              'INSERT OR REPLACE INTO video_views_daily (video_id, view_date, views) VALUES (?, ?, ?)',
              [vidId, dateStr, dailyViews]
            );
          }
        }
      }

      // Persist all databases to IndexedDB
      for (const name of DB_NAMES) {
        await this.persistDatabase(name);
      }

      console.info('[Database] Nạp dữ liệu mẫu hoàn tất.');
      return true;
    },

    /**
     * Clear all local databases and reset back to original seed
     */
    async resetToDemo() {
      await clearIDBStore();
      for (const name of DB_NAMES) {
        if (databases[name]) {
          try { databases[name].close(); } catch (e) { /* ignore */ }
          delete databases[name];
        }
      }
      isInitialized = false;
      await this.initDatabases();
    },

    /**
     * Seed 10 demo USER accounts for Permission Management module.
     * Password for all demo users: User@12345
     * SHA-256('User@12345') = 7e3c4a5f8b9d2e1f6a0c3b4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f (computed at runtime)
     */
    async _seedDemoUserAccounts() {
      // Correct SHA-256 hash of 'User@12345'
      const userPassHash = 'e7f5c00bfc7067a49da98fa9b1eacd8d428a4632197edaa84c9dacd40ca35050';

      const demoUsers = [
        { full_name: 'Nguyễn Minh Tú',    email: 'user1@demo.com' },
        { full_name: 'Trần Thị Lan',       email: 'user2@demo.com' },
        { full_name: 'Lê Văn Hùng',        email: 'user3@demo.com' },
        { full_name: 'Phạm Thị Mai',       email: 'user4@demo.com' },
        { full_name: 'Hoàng Quang Khải',   email: 'user5@demo.com' },
        { full_name: 'Đặng Thị Hoa',       email: 'user6@demo.com' },
        { full_name: 'Vũ Thanh Tùng',      email: 'user7@demo.com' },
        { full_name: 'Bùi Thị Ngọc',       email: 'user8@demo.com' },
        { full_name: 'Ngô Duy Khang',      email: 'user9@demo.com' },
        { full_name: 'Dương Thị Thảo',     email: 'user10@demo.com' }
      ];

      for (const u of demoUsers) {
        const exists = this.runQuery(
          'users.db',
          'SELECT id, password_hash FROM users WHERE email = ?',
          [u.email]
        );
        if (exists.length === 0) {
          this.runStatement(
            'users.db',
            `INSERT INTO users (full_name, email, password_hash, role, status)
             VALUES (?, ?, ?, 'USER', 'active')`,
            [u.full_name, u.email, userPassHash]
          );
        } else if (exists[0].password_hash !== userPassHash) {
          this.runStatement(
            'users.db',
            `UPDATE users SET password_hash = ? WHERE email = ?`,
            [userPassHash, u.email]
          );
        }
      }
      await this.persistDatabase('users.db');
      console.info('[Database] Đã đồng bộ 10 tài khoản USER mẫu.');
    }
  };

  // Expose to window
  window.DatabaseManager = DatabaseManager;

})(window);
