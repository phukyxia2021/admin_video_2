/**
 * Supabase Integration Service — Video Admin
 * Connects the web application to Supabase Cloud Database & Storage.
 *
 * Config source: supabase.txt
 */

(function (window) {
  'use strict';

  // Config from supabase.txt
  const SUPABASE_URL = 'https://rgddiapkfdyrkyzldjve.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_AFKSTK_Ms_usyYn4mYUaug_AUEaYyCX';

  let client = null;
  let connectionStatus = 'checking'; // 'connected' | 'error' | 'unreachable'

  /**
   * Initialize Supabase client if @supabase/supabase-js is loaded
   */
  function initClient() {
    if (client) return client;

    if (window.supabase && typeof window.supabase.createClient === 'function') {
      try {
        client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true
          }
        });
        window.supabaseClient = client;
        console.info('[Supabase] Khởi tạo Supabase client thành công với endpoint:', SUPABASE_URL);
      } catch (err) {
        console.error('[Supabase] Lỗi khi tạo Supabase client:', err);
      }
    } else {
      console.warn('[Supabase] Thư viện @supabase/supabase-js chưa sẵn sàng.');
    }
    return client;
  }

  const SupabaseService = {
    url: SUPABASE_URL,
    key: SUPABASE_KEY,

    /**
     * Get the active Supabase client instance
     */
    getClient() {
      if (!client) initClient();
      return client;
    },

    /**
     * Test live connection to Supabase
     */
    async checkConnection() {
      const sb = this.getClient();
      if (!sb) {
        connectionStatus = 'unreachable';
        return { success: false, message: 'Thư viện Supabase SDK chưa tải xong.' };
      }

      try {
        // Attempt a lightweight query to verify connectivity and API key validity
        const { data, error } = await sb.from('categories').select('id').limit(1);

        if (error) {
          // If table doesn't exist yet, endpoint still answered (valid connection)
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            connectionStatus = 'needs_schema';
            return {
              success: true,
              needsSchema: true,
              message: 'Kết nối Supabase thành công! Cần khởi tạo bảng qua file supabase_schema.sql.'
            };
          }

          connectionStatus = 'error';
          return { success: false, message: error.message, error };
        }

        connectionStatus = 'connected';
        return { success: true, message: 'Kết nối Supabase Cloud hoạt động hoàn hảo!' };
      } catch (err) {
        connectionStatus = 'error';
        return { success: false, message: err.message };
      }
    },

    /**
     * Upload local SQLite data to Supabase Cloud
     */
    async syncLocalToCloud() {
      const sb = this.getClient();
      if (!sb) throw new Error('Supabase client chưa được khởi tạo.');

      const results = { categories: 0, videos: 0, users: 0 };

      // 1. Sync Categories
      try {
        const localCats = window.DatabaseManager.runQuery('video_categories.db', 'SELECT * FROM categories');
        if (localCats.length > 0) {
          const payload = localCats.map(c => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            description: c.description
          }));
          const { error } = await sb.from('categories').upsert(payload, { onConflict: 'id' });
          if (error) throw error;
          results.categories = localCats.length;
        }
      } catch (e) {
        console.warn('[Supabase Sync] Lỗi đồng bộ Categories:', e.message);
      }

      // 2. Sync Videos
      try {
        const localVids = window.DatabaseManager.runQuery('videos.db', 'SELECT * FROM videos');
        if (localVids.length > 0) {
          const payload = localVids.map(v => ({
            id: v.id,
            title: v.title,
            description: v.description,
            thumbnail_url: v.thumbnail_url,
            video_url: v.video_url,
            category_id: v.category_id,
            views: v.views,
            file_size_bytes: v.file_size_bytes,
            status: v.status,
            published_at: v.published_at ? new Date(v.published_at).toISOString() : null
          }));
          const { error } = await sb.from('videos').upsert(payload, { onConflict: 'id' });
          if (error) throw error;
          results.videos = localVids.length;
        }
      } catch (e) {
        console.warn('[Supabase Sync] Lỗi đồng bộ Videos:', e.message);
      }

      // 3. Sync Users
      try {
        const localUsers = window.DatabaseManager.runQuery('users.db', 'SELECT * FROM users');
        if (localUsers.length > 0) {
          const payload = localUsers.map(u => ({
            id: u.id,
            full_name: u.full_name,
            email: u.email,
            password_hash: u.password_hash,
            role: u.role || 'USER',
            status: u.status || 'active'
          }));
          const { error } = await sb.from('app_users').upsert(payload, { onConflict: 'id' });
          if (error) throw error;
          results.users = localUsers.length;
        }
      } catch (e) {
        console.warn('[Supabase Sync] Lỗi đồng bộ Users:', e.message);
      }

      return results;
    },

    /**
     * Download Supabase data into local SQLite
     */
    async syncCloudToLocal() {
      const sb = this.getClient();
      if (!sb) throw new Error('Supabase client chưa được khởi tạo.');

      let pulled = { categories: 0, videos: 0, users: 0 };

      // Pull Categories
      const { data: catData } = await sb.from('categories').select('*');
      if (catData && catData.length > 0) {
        for (const c of catData) {
          window.DatabaseManager.runStatement(
            'video_categories.db',
            'INSERT OR REPLACE INTO categories (id, name, slug, description) VALUES (?, ?, ?, ?)',
            [c.id, c.name, c.slug, c.description]
          );
        }
        pulled.categories = catData.length;
      }

      // Pull Videos
      const { data: vidData } = await sb.from('videos').select('*');
      if (vidData && vidData.length > 0) {
        for (const v of vidData) {
          window.DatabaseManager.runStatement(
            'videos.db',
            `INSERT OR REPLACE INTO videos (id, title, description, thumbnail_url, video_url, category_id, views, file_size_bytes, status, published_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [v.id, v.title, v.description, v.thumbnail_url, v.video_url, v.category_id, v.views, v.file_size_bytes, v.status, v.published_at]
          );
        }
        pulled.videos = vidData.length;
      }

      // Pull Users
      const { data: userData } = await sb.from('app_users').select('*');
      if (userData && userData.length > 0) {
        for (const u of userData) {
          window.DatabaseManager.runStatement(
            'users.db',
            `INSERT OR REPLACE INTO users (id, full_name, email, password_hash, role, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [u.id, u.full_name, u.email, u.password_hash, u.role || 'USER', u.status || 'active']
          );
        }
        pulled.users = userData.length;
      }

      return pulled;
    },

    /**
     * Send real password reset email via Supabase Auth
     */
    async sendPasswordResetEmail(email) {
      const sb = this.getClient();
      if (!sb) throw new Error('Supabase client chưa được khởi tạo.');

      // Compute redirect URL to reset-password.html dynamically
      const redirectUrl = window.location.origin + window.location.pathname.replace(/[^/]*$/, 'reset-password.html');

      const { data, error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });

      if (error) {
        console.error('[Supabase Auth] resetPasswordForEmail error:', error);
        throw error;
      }

      return { success: true, data, redirectUrl };
    },

    /**
     * Update user password in Supabase Auth recovery session
     */
    async updateUserPassword(newPassword) {
      const sb = this.getClient();
      if (!sb) throw new Error('Supabase client chưa được khởi tạo.');

      const { data, error } = await sb.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('[Supabase Auth] updateUser error:', error);
        throw error;
      }

      return { success: true, data };
    },

    /**
     * Update UI indicator status badge in sidebar & topbar
     */
    updateUIBadge() {
      const badges = document.querySelectorAll('.supabase-status-badge');
      if (badges.length === 0) return;

      this.checkConnection().then(res => {
        badges.forEach(badge => {
          if (res.success) {
            badge.innerHTML = `
              <span class="status-dot" style="background-color: #10B981; box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);"></span>
              <span>Supabase Cloud Connected</span>
            `;
            badge.title = 'Đã kết nối với dự án rgddiapkfdyrkyzldjve.supabase.co';
          } else {
            badge.innerHTML = `
              <span class="status-dot" style="background-color: #F59E0B; box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.25);"></span>
              <span>Supabase Cloud Configured</span>
            `;
            badge.title = res.message;
          }
        });
      });
    }
  };

  // Auto-init on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initClient());
  } else {
    initClient();
  }

  window.SupabaseService = SupabaseService;

})(window);
