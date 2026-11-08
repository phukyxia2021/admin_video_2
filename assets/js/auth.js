/**
 * Authentication Module for Video Admin (Demo Client-Side)
 * Specifications: 01_REQUIREMENTS.md & 06_SECURITY_AND_LIMITATIONS.md
 * 
 * IMPORTANT SECURITY DISCLAIMER:
 * This is a client-side demo authentication system running purely inside
 * the web browser with sql.js. It does NOT constitute production-grade security.
 * Client-side hashing with Web Crypto API is used for demonstration purposes only.
 */

(function (window) {
  'use strict';

  const SESSION_KEY = 'video_admin_demo_session';
  const REMEMBER_KEY = 'video_admin_remember_user';

  /**
   * Generates SHA-256 hex hash using standard Web Crypto API
   */
  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const Auth = {
    /**
     * Hash string utility
     */
    hashPassword: sha256,

    /**
     * Retrieve the currently logged in user session
     */
    getCurrentUser() {
      try {
        const sessionStr = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
        if (!sessionStr) return null;
        return JSON.parse(sessionStr);
      } catch (e) {
        return null;
      }
    },

    /**
     * Authenticate user with email & password against users.db
     */
    async login(email, password, rememberMe = false) {
      if (!email || !password) {
        return { success: false, message: 'Vui lòng nhập đầy đủ Email và Mật khẩu.' };
      }

      // Ensure Database is initialized
      if (window.DatabaseManager) {
        await window.DatabaseManager.initDatabases();
      }

      const cleanEmail = email.trim().toLowerCase();
      const passHash = await sha256(password);

      // Auto-sync default demo admin account
      if (cleanEmail === 'admin@videoadmin.local' && password === 'Admin@12345') {
        try {
          const existing = window.DatabaseManager.runQuery(
            'users.db',
            "SELECT id, password_hash, status FROM users WHERE email = 'admin@videoadmin.local'"
          );
          if (!existing || existing.length === 0) {
            window.DatabaseManager.runStatement(
              'users.db',
              `INSERT INTO users (full_name, email, password_hash, status)
               VALUES (?, ?, ?, ?)`,
              ['Admin Demo', 'admin@videoadmin.local', passHash, 'active']
            );
          } else if (existing[0].password_hash !== passHash || existing[0].status !== 'active') {
            window.DatabaseManager.runStatement(
              'users.db',
              `UPDATE users SET password_hash = ?, status = 'active' WHERE email = 'admin@videoadmin.local'`,
              [passHash]
            );
          }
        } catch (e) {
          console.warn('[Auth] Sync demo admin error:', e);
        }
      }

      try {
        // Select without `role` to stay safe if the column migration hasn't
        // run yet (old IndexedDB). We fetch role separately right after.
        const rows = window.DatabaseManager.runQuery(
          'users.db',
          'SELECT id, full_name, email, status FROM users WHERE email = ? AND password_hash = ?',
          [cleanEmail, passHash]
        );

        if (!rows || rows.length === 0) {
          return {
            success: false,
            message: 'Email hoặc mật khẩu không chính xác. (Tài khoản mẫu: admin@videoadmin.local / Admin@12345)'
          };
        }

        const user = rows[0];
        if (user.status !== 'active') {
          return { success: false, message: 'Tài khoản này hiện đang bị khóa.' };
        }

        // Fetch role defensively — column may not exist in older DB yet
        let userRole = 'USER';
        try {
          const roleRows = window.DatabaseManager.runQuery(
            'users.db',
            'SELECT role FROM users WHERE id = ?',
            [user.id]
          );
          if (roleRows && roleRows[0] && roleRows[0].role) {
            userRole = roleRows[0].role;
          }
        } catch (roleErr) {
          // Column doesn't exist yet — keep default 'USER'.
          // The admin's role will be set after migration on next load.
          if (cleanEmail === 'admin@videoadmin.local') {
            userRole = 'ADMIN';
          }
        }

        const sessionData = {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: userRole,
          loggedInAt: new Date().toISOString()
        };

        const serialized = JSON.stringify(sessionData);
        sessionStorage.setItem(SESSION_KEY, serialized);

        if (rememberMe) {
          localStorage.setItem(SESSION_KEY, serialized);
          localStorage.setItem(REMEMBER_KEY, user.email);
        } else {
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(REMEMBER_KEY);
        }

        return { success: true, user: sessionData };
      } catch (err) {
        console.error('[Auth] Lỗi đăng nhập:', err);
        return { success: false, message: 'Có lỗi xảy ra trong quá trình xác thực cơ sở dữ liệu.' };
      }
    },

    /**
     * Register a new user into users.db
     */
    async register(fullName, email, password, confirmPassword) {
      const cleanName = (fullName || '').trim();
      const cleanEmail = (email || '').trim().toLowerCase();

      // Validation
      if (!cleanName || cleanName.length < 2) {
        return { success: false, message: 'Họ và tên phải có ít nhất 2 ký tự.' };
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return { success: false, message: 'Định dạng email không hợp lệ.' };
      }

      if (!password || password.length < 8) {
        return { success: false, message: 'Mật khẩu phải có độ dài tối thiểu 8 ký tự.' };
      }

      if (password !== confirmPassword) {
        return { success: false, message: 'Mật khẩu xác nhận không trùng khớp.' };
      }

      try {
        // Check email uniqueness
        const existing = window.DatabaseManager.runQuery(
          'users.db',
          'SELECT id FROM users WHERE email = ?',
          [cleanEmail]
        );

        if (existing && existing.length > 0) {
          return { success: false, message: 'Email này đã được sử dụng. Vui lòng chọn email khác.' };
        }

        const passHash = await sha256(password);

        window.DatabaseManager.runStatement(
          'users.db',
          `INSERT INTO users (full_name, email, password_hash, role, status, created_at)
           VALUES (?, ?, ?, 'USER', 'active', CURRENT_TIMESTAMP)`,
          [cleanName, cleanEmail, passHash]
        );

        // Also register into Supabase Auth & app_users if connected
        const sb = window.SupabaseService ? window.SupabaseService.getClient() : null;
        if (sb) {
          try {
            await sb.auth.signUp({
              email: cleanEmail,
              password: password,
              options: { data: { full_name: cleanName } }
            });
            await sb.from('app_users').upsert({
              full_name: cleanName,
              email: cleanEmail,
              password_hash: passHash,
              role: 'USER',
              status: 'active'
            }, { onConflict: 'email' });
          } catch (sbErr) {
            console.warn('[Auth] Supabase sync registration notice:', sbErr.message);
          }
        }

        return {
          success: true,
          message: 'Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ.'
        };
      } catch (err) {
        console.error('[Auth] Lỗi đăng ký:', err);
        return { success: false, message: 'Không thể tạo tài khoản do lỗi cơ sở dữ liệu.' };
      }
    },

    /**
     * Send real password reset email via Supabase Auth
     */
    async sendPasswordResetEmail(email) {
      const cleanEmail = (email || '').trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(cleanEmail)) {
        return { success: false, message: 'Vui lòng nhập định dạng email hợp lệ.' };
      }

      if (!window.SupabaseService) {
        return { success: false, message: 'Dịch vụ Supabase chưa sẵn sàng.' };
      }

      try {
        const res = await window.SupabaseService.sendPasswordResetEmail(cleanEmail);
        return {
          success: true,
          message: 'Đã gửi email khôi phục mật khẩu! Vui lòng kiểm tra hộp thư đến (và thư mục Spam/Junk) của bạn để bấm vào liên kết đặt lại mật khẩu.',
          redirectUrl: res.redirectUrl
        };
      } catch (err) {
        console.error('[Auth] sendPasswordResetEmail error:', err);
        let msg = err.message || 'Không thể gửi email khôi phục.';
        if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) {
          msg = 'Bạn đã yêu cầu gửi email quá nhanh. Vui lòng đợi 60 giây trước khi thử lại.';
        }
        return { success: false, message: msg };
      }
    },

    /**
     * Update user password with new password (after opening reset link)
     */
    async updatePassword(newPassword, confirmPassword, targetEmail = null) {
      if (!newPassword || newPassword.length < 8) {
        return { success: false, message: 'Mật khẩu mới phải có tối thiểu 8 ký tự.' };
      }

      if (newPassword !== confirmPassword) {
        return { success: false, message: 'Mật khẩu xác nhận không trùng khớp.' };
      }

      const passHash = await sha256(newPassword);
      let updatedEmail = targetEmail;

      // 1. Update in Supabase Auth if session exists
      if (window.SupabaseService) {
        try {
          const res = await window.SupabaseService.updateUserPassword(newPassword);
          if (res?.data?.user?.email) {
            updatedEmail = res.data.user.email;
          }
        } catch (sbErr) {
          console.warn('[Auth] Supabase auth updateUser warning:', sbErr.message);
        }
      }

      // 2. Update local users.db and Supabase app_users table
      if (updatedEmail && window.DatabaseManager) {
        try {
          window.DatabaseManager.runStatement(
            'users.db',
            'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?',
            [passHash, updatedEmail.toLowerCase().trim()]
          );
        } catch (dbErr) {
          console.warn('[Auth] Local users.db update warning:', dbErr.message);
        }

        const sb = window.SupabaseService ? window.SupabaseService.getClient() : null;
        if (sb) {
          try {
            await sb.from('app_users').update({
              password_hash: passHash,
              updated_at: new Date().toISOString()
            }).eq('email', updatedEmail.toLowerCase().trim());
          } catch (cloudErr) {
            console.warn('[Auth] Cloud app_users update warning:', cloudErr.message);
          }
        }
      }

      return {
        success: true,
        message: 'Mật khẩu đã được cập nhật thành công! Bạn có thể đăng nhập bằng mật khẩu mới.'
      };
    },

    /**
     * Direct password reset (Instant - without waiting for email)
     */
    async directResetPassword(email, newPassword, confirmPassword) {
      const cleanEmail = (email || '').trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(cleanEmail)) {
        return { success: false, message: 'Định dạng email không hợp lệ.' };
      }

      if (!newPassword || newPassword.length < 8) {
        return { success: false, message: 'Mật khẩu mới phải có tối thiểu 8 ký tự.' };
      }

      if (newPassword !== confirmPassword) {
        return { success: false, message: 'Mật khẩu xác nhận không trùng khớp.' };
      }

      // Check if user exists in local SQLite or Supabase
      let userFound = false;
      if (window.DatabaseManager) {
        try {
          const rows = window.DatabaseManager.runQuery(
            'users.db',
            'SELECT id FROM users WHERE email = ?',
            [cleanEmail]
          );
          if (rows && rows.length > 0) userFound = true;
        } catch (e) {}
      }

      const sb = window.SupabaseService ? window.SupabaseService.getClient() : null;
      if (!userFound && sb) {
        try {
          const { data } = await sb.from('app_users').select('id').eq('email', cleanEmail).limit(1);
          if (data && data.length > 0) userFound = true;
        } catch (e) {}
      }

      if (!userFound) {
        return { success: false, message: `Không tìm thấy tài khoản với email "${cleanEmail}". Vui lòng kiểm tra lại.` };
      }

      const passHash = await sha256(newPassword);

      // 1. Update SQLite users.db
      if (window.DatabaseManager) {
        try {
          window.DatabaseManager.runStatement(
            'users.db',
            'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?',
            [passHash, cleanEmail]
          );
        } catch (e) {
          console.warn('[Auth] Local update warning:', e);
        }
      }

      // 2. Update Supabase app_users table
      if (sb) {
        try {
          await sb.from('app_users').update({
            password_hash: passHash,
            updated_at: new Date().toISOString()
          }).eq('email', cleanEmail);
        } catch (e) {
          console.warn('[Auth] Cloud update warning:', e);
        }
      }

      return {
        success: true,
        message: 'Đã đặt lại mật khẩu mới thành công! Bạn có thể đăng nhập ngay.'
      };
    },

    /**
     * Demo simulation for forgot password
     */
    async simulateForgotPassword(email) {
      const cleanEmail = (email || '').trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(cleanEmail)) {
        return { success: false, message: 'Vui lòng nhập định dạng email hợp lệ.' };
      }

      // Check existence without revealing too much if production, but in demo local we inform clearly
      const existing = window.DatabaseManager.runQuery(
        'users.db',
        'SELECT id, full_name FROM users WHERE email = ?',
        [cleanEmail]
      );

      return {
        success: true,
        exists: existing.length > 0,
        message: 'Lưu ý: Ứng dụng hoạt động thuần phía trình duyệt (không có server backend) nên hệ thống không gửi email thực tế. Bạn có thể sử dụng tài khoản mẫu: admin@videoadmin.local / Mật khẩu: Admin@12345 hoặc tạo tài khoản mới tại trang Đăng ký.'
      };
    },

    /**
     * Logout and redirect to login.html
     */
    logout() {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
      window.location.href = 'login.html';
    },

    /**
     * Route guard: if user is not authenticated, redirect to login.html
     */
    requireAuth() {
      const user = this.getCurrentUser();
      if (!user) {
        window.location.href = 'login.html';
        return false;
      }
      return true;
    },

    /**
     * Route guard: if user is not ADMIN, redirect to index.html
     */
    requireAdmin() {
      const user = this.getCurrentUser();
      if (!user) {
        window.location.href = 'login.html';
        return false;
      }
      if (user.role !== 'ADMIN') {
        window.location.href = 'index.html';
        return false;
      }
      return true;
    },

    /**
     * Returns true if the current session user is ADMIN
     */
    isAdmin() {
      const user = this.getCurrentUser();
      return user && user.role === 'ADMIN';
    },

    /**
     * Redirect if already logged in (used on login / register pages)
     */
    redirectIfAuthenticated() {
      const user = this.getCurrentUser();
      if (user) {
        window.location.href = 'index.html';
        return true;
      }
      return false;
    }
  };

  window.Auth = Auth;

})(window);
