/**
 * Common Application Utilities & UI Components
 * Layout, Sidebar, Topbar, Modals, Toasts, Formatters
 */

(function (window) {
  'use strict';

  const App = {
    /**
     * Format numbers with commas (e.g. 1,234,567)
     */
    formatNumber(num) {
      if (num === null || num === undefined || isNaN(num)) return '0';
      return Number(num).toLocaleString('vi-VN');
    },

    /**
     * Format bytes into human-readable B, KB, MB, GB
     */
    formatBytes(bytes, decimals = 2) {
      if (!bytes || bytes === 0) return '0 MB';
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    /**
     * Format date string to local display
     */
    formatDate(dateStr) {
      if (!dateStr) return '—';
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      } catch (e) {
        return dateStr;
      }
    },

    /**
     * Format datetime
     */
    formatDateTime(dateStr) {
      if (!dateStr) return '—';
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleString('vi-VN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (e) {
        return dateStr;
      }
    },

    /**
     * Display a floating Toast notification
     * Types: 'success', 'error', 'info', 'warning'
     */
    showToast(message, type = 'info', title = '') {
      let container = document.getElementById('toastContainer');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;

      const icons = {
        success: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`,
        error: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`,
        warning: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
        info: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
      };

      const defaultTitles = {
        success: 'Thành công',
        error: 'Lỗi',
        warning: 'Cảnh báo',
        info: 'Thông báo'
      };

      toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">
          <div class="toast-title">${title || defaultTitles[type]}</div>
          <div class="toast-message">${message}</div>
        </div>
      `;

      container.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('toast-fade-out');
        setTimeout(() => {
          if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
      }, 3500);
    },

    /**
     * Show Confirmation Dialog Modal
     */
    showConfirmModal({ title, message, confirmText = 'Xác nhận xóa', confirmClass = 'btn-danger', onConfirm }) {
      let modal = document.getElementById('confirmModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirmModal';
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
          <div class="modal-container" style="max-width: 440px;">
            <div class="modal-header">
              <h3 class="modal-title" id="confirmModalTitle">Xác nhận</h3>
              <button type="button" class="modal-close-btn" id="confirmModalClose">&times;</button>
            </div>
            <div class="modal-body" id="confirmModalBody" style="font-size: 0.95rem; color: var(--text-secondary);">
              Bạn có chắc chắn muốn thực hiện hành động này?
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" id="confirmModalCancel">Hủy bỏ</button>
              <button type="button" class="btn" id="confirmModalAction">Đồng ý</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('confirmModalClose').addEventListener('click', () => modal.classList.remove('active'));
        document.getElementById('confirmModalCancel').addEventListener('click', () => modal.classList.remove('active'));
      }

      document.getElementById('confirmModalTitle').textContent = title || 'Xác nhận hành động';
      document.getElementById('confirmModalBody').textContent = message || 'Hành động này không thể hoàn tác.';
      
      const actionBtn = document.getElementById('confirmModalAction');
      actionBtn.textContent = confirmText;
      actionBtn.className = `btn ${confirmClass}`;

      // Clone button to remove previous listeners
      const newActionBtn = actionBtn.cloneNode(true);
      actionBtn.parentNode.replaceChild(newActionBtn, actionBtn);

      newActionBtn.addEventListener('click', async () => {
        modal.classList.remove('active');
        if (typeof onConfirm === 'function') {
          await onConfirm();
        }
      });

      modal.classList.add('active');
    },

    /**
     * Render the Database Manager Modal (Import & Export for all 5 SQLite databases)
     */
    openDatabaseManagerModal() {
      let modal = document.getElementById('dbManagerModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'dbManagerModal';
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
          <div class="modal-container" style="max-width: 640px;">
            <div class="modal-header">
              <div>
                <h3 class="modal-title">Quản lý Cơ sở dữ liệu SQLite</h3>
                <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">
                  Export và Import các file .db cục bộ (IndexedDB persistence)
                </p>
              </div>
              <button type="button" class="modal-close-btn" id="dbModalClose">&times;</button>
            </div>
            <div class="modal-body" style="display: flex; flex-direction: column; gap: 18px;">
              <!-- Supabase Cloud Connection Box -->
              <div style="background: linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%); border: 1px solid #A7F3D0; border-radius: var(--radius-md); padding: 14px 16px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="status-dot" id="sbModalStatusDot" style="background-color: #10B981;"></span>
                    <strong style="color: #065F46; font-size: 0.92rem;">Supabase Cloud Database</strong>
                  </div>
                  <span class="badge" id="sbModalStatusBadge" style="background: #D1FAE5; color: #065F46; font-size: 0.72rem;">Đang kết nối</span>
                </div>
                <div style="font-size: 0.78rem; color: #047857; margin-bottom: 10px; word-break: break-all;">
                  <strong>Endpoint:</strong> <code>https://rgddiapkfdyrkyzldjve.supabase.co</code>
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  <button type="button" class="btn btn-sm btn-outline" id="btnTestSupabaseConn" style="background: #FFFFFF; font-size: 0.75rem;">
                    Kiểm tra kết nối
                  </button>
                  <button type="button" class="btn btn-sm btn-primary" id="btnSyncToSupabase" style="font-size: 0.75rem; background: #059669; border-color: #059669;">
                    Đẩy dữ liệu lên Cloud
                  </button>
                  <button type="button" class="btn btn-sm btn-outline" id="btnSyncFromSupabase" style="background: #FFFFFF; font-size: 0.75rem;">
                    Tải dữ liệu từ Cloud về
                  </button>
                </div>
              </div>

              <div class="auth-notice-banner" style="margin-bottom: 0;">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span>Dữ liệu local được lưu trong IndexedDB. Bạn có thể xuất/nhập file .db hoặc đồng bộ trực tiếp với Supabase Cloud.</span>
              </div>

              <div style="display: flex; flex-direction: column; gap: 10px;">
                <h4 style="font-size: 0.9rem; font-weight: 700;">Danh sách Database:</h4>

                <div class="db-item-row" data-db="videos.db">
                  <div>
                    <strong>videos.db</strong>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">Chứa danh sách video, views, metadata và trạng thái</div>
                  </div>
                  <div style="display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-outline btn-export-single" data-db="videos.db">Export .db</button>
                    <label class="btn btn-sm btn-outline" style="margin-bottom:0; cursor:pointer;">
                      Import .db
                      <input type="file" accept=".db,.sqlite,.sqlite3" style="display:none;" class="input-import-single" data-db="videos.db">
                    </label>
                  </div>
                </div>

                <div class="db-item-row" data-db="video_analytics.db">
                  <div>
                    <strong>video_analytics.db</strong>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">Chứa lịch sử lượt xem hàng ngày theo từng video</div>
                  </div>
                  <div style="display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-outline btn-export-single" data-db="video_analytics.db">Export .db</button>
                    <label class="btn btn-sm btn-outline" style="margin-bottom:0; cursor:pointer;">
                      Import .db
                      <input type="file" accept=".db,.sqlite,.sqlite3" style="display:none;" class="input-import-single" data-db="video_analytics.db">
                    </label>
                  </div>
                </div>

                <div class="db-item-row" data-db="video_categories.db">
                  <div>
                    <strong>video_categories.db</strong>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">Chứa danh mục video (Công nghệ, Thiết kế, Hướng dẫn...)</div>
                  </div>
                  <div style="display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-outline btn-export-single" data-db="video_categories.db">Export .db</button>
                    <label class="btn btn-sm btn-outline" style="margin-bottom:0; cursor:pointer;">
                      Import .db
                      <input type="file" accept=".db,.sqlite,.sqlite3" style="display:none;" class="input-import-single" data-db="video_categories.db">
                    </label>
                  </div>
                </div>

                <div class="db-item-row" data-db="video_tags.db">
                  <div>
                    <strong>video_tags.db</strong>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">Chứa thẻ tag và bảng quan hệ video_tag_map</div>
                  </div>
                  <div style="display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-outline btn-export-single" data-db="video_tags.db">Export .db</button>
                    <label class="btn btn-sm btn-outline" style="margin-bottom:0; cursor:pointer;">
                      Import .db
                      <input type="file" accept=".db,.sqlite,.sqlite3" style="display:none;" class="input-import-single" data-db="video_tags.db">
                    </label>
                  </div>
                </div>

                <div class="db-item-row" data-db="users.db">
                  <div>
                    <strong>users.db</strong>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">Chứa tài khoản admin local và mật khẩu mã hóa demo</div>
                  </div>
                  <div style="display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-outline btn-export-single" data-db="users.db">Export .db</button>
                    <label class="btn btn-sm btn-outline" style="margin-bottom:0; cursor:pointer;">
                      Import .db
                      <input type="file" accept=".db,.sqlite,.sqlite3" style="display:none;" class="input-import-single" data-db="users.db">
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer" style="justify-content: space-between;">
              <button type="button" class="btn btn-danger-outline btn-sm" id="btnResetDemoData">
                Khôi phục dữ liệu mẫu ban đầu
              </button>
              <div style="display: flex; gap: 8px;">
                <button type="button" class="btn btn-primary btn-sm" id="btnExportAllDB">
                  Export tất cả (5 file .db)
                </button>
                <button type="button" class="btn btn-outline btn-sm" id="btnDbModalDone">Đóng</button>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        // Styling for DB items
        const style = document.createElement('style');
        style.textContent = `
          .db-item-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 14px;
            background: var(--bg-surface);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            gap: 12px;
            flex-wrap: wrap;
          }
        `;
        document.head.appendChild(style);

        // Bind events
        document.getElementById('dbModalClose').addEventListener('click', () => modal.classList.remove('active'));
        document.getElementById('btnDbModalDone').addEventListener('click', () => modal.classList.remove('active'));

        // Export individual
        modal.querySelectorAll('.btn-export-single').forEach(btn => {
          btn.addEventListener('click', () => {
            const dbName = btn.getAttribute('data-db');
            window.DatabaseManager.exportDatabase(dbName);
            App.showToast(`Đã xuất file ${dbName} về máy.`, 'success');
          });
        });

        // Import individual
        modal.querySelectorAll('.input-import-single').forEach(input => {
          input.addEventListener('change', async (e) => {
            const dbName = input.getAttribute('data-db');
            const file = e.target.files[0];
            if (!file) return;

            App.showConfirmModal({
              title: `Xác nhận Import ${dbName}`,
              message: `Hành động này sẽ ghi đè toàn bộ dữ liệu hiện có trong ${dbName} bằng nội dung từ file "${file.name}". Bạn có muốn tiếp tục?`,
              confirmText: 'Ghi đè & Import',
              confirmClass: 'btn-primary',
              onConfirm: async () => {
                try {
                  await window.DatabaseManager.importDatabase(dbName, file);
                  App.showToast(`Import thành công ${dbName}! Đang tải lại dữ liệu...`, 'success');
                  setTimeout(() => window.location.reload(), 1000);
                } catch (err) {
                  App.showToast(`Lỗi import: ${err.message}`, 'error');
                }
              }
            });
            input.value = '';
          });
        });

        // Export all
        document.getElementById('btnExportAllDB').addEventListener('click', () => {
          window.DatabaseManager.exportAllDatabases();
          App.showToast('Đang tải xuống 5 file database SQLite...', 'success');
        });

        // Supabase Test Connection
        const btnTestSb = document.getElementById('btnTestSupabaseConn');
        if (btnTestSb && window.SupabaseService) {
          btnTestSb.addEventListener('click', async () => {
            btnTestSb.disabled = true;
            btnTestSb.textContent = 'Đang kiểm tra...';
            const res = await window.SupabaseService.checkConnection();
            btnTestSb.disabled = false;
            btnTestSb.textContent = 'Kiểm tra kết nối';

            const dot = document.getElementById('sbModalStatusDot');
            const badge = document.getElementById('sbModalStatusBadge');

            if (res.success) {
              if (dot) dot.style.backgroundColor = '#10B981';
              if (badge) {
                badge.style.background = '#D1FAE5';
                badge.style.color = '#065F46';
                badge.textContent = res.needsSchema ? 'Cần chạy SQL Schema' : 'Đã kết nối';
              }
              App.showToast(res.message, res.needsSchema ? 'warning' : 'success');
            } else {
              if (dot) dot.style.backgroundColor = '#EF4444';
              if (badge) {
                badge.style.background = '#FEE2E2';
                badge.style.color = '#991B1B';
                badge.textContent = 'Lỗi kết nối';
              }
              App.showToast('Lỗi Supabase: ' + res.message, 'error');
            }
          });
        }

        // Supabase Sync Up (Local to Cloud)
        const btnSyncUp = document.getElementById('btnSyncToSupabase');
        if (btnSyncUp && window.SupabaseService) {
          btnSyncUp.addEventListener('click', async () => {
            btnSyncUp.disabled = true;
            btnSyncUp.textContent = 'Đang đẩy dữ liệu...';
            try {
              const res = await window.SupabaseService.syncLocalToCloud();
              App.showToast(`Đã đồng bộ lên Supabase: ${res.videos} video, ${res.categories} danh mục, ${res.users} tài khoản!`, 'success');
            } catch (err) {
              App.showToast('Lỗi đẩy dữ liệu: ' + err.message, 'error');
            } finally {
              btnSyncUp.disabled = false;
              btnSyncUp.textContent = 'Đẩy dữ liệu lên Cloud';
            }
          });
        }

        // Supabase Sync Down (Cloud to Local)
        const btnSyncDown = document.getElementById('btnSyncFromSupabase');
        if (btnSyncDown && window.SupabaseService) {
          btnSyncDown.addEventListener('click', async () => {
            btnSyncDown.disabled = true;
            btnSyncDown.textContent = 'Đang tải dữ liệu...';
            try {
              const pulled = await window.SupabaseService.syncCloudToLocal();
              App.showToast(`Đã nạp từ Supabase: ${pulled.videos} video, ${pulled.categories} danh mục, ${pulled.users} tài khoản! Trang sẽ tự làm mới.`, 'success');
              setTimeout(() => window.location.reload(), 1000);
            } catch (err) {
              App.showToast('Lỗi tải dữ liệu: ' + err.message, 'error');
              btnSyncDown.disabled = false;
              btnSyncDown.textContent = 'Tải dữ liệu từ Cloud về';
            }
          });
        }

        // Reset demo
        document.getElementById('btnResetDemoData').addEventListener('click', () => {
          App.showConfirmModal({
            title: 'Khôi phục Dữ liệu mẫu ban đầu',
            message: 'Tất cả thay đổi video, analytics và tài khoản tạo thêm sẽ được xóa và đặt lại về 14 video mẫu mặc định. Bạn có chắc không?',
            confirmText: 'Khôi phục mẫu',
            confirmClass: 'btn-danger',
            onConfirm: async () => {
              try {
                await window.DatabaseManager.resetToDemo();
                App.showToast('Đã khôi phục dữ liệu mẫu! Trang sẽ tự làm mới.', 'success');
                setTimeout(() => window.location.reload(), 800);
              } catch (err) {
                App.showToast(`Lỗi: ${err.message}`, 'error');
              }
            }
          });
        });
      }

      modal.classList.add('active');
    },

    /**
     * Initializes Common Layout Interactions (Mobile drawer, Logout, DB Modal triggers)
     */
    initCommonLayout(activePage = 'dashboard') {
      // Setup mobile hamburger menu toggle
      const mobileBtn = document.getElementById('mobileMenuToggle');
      const sidebar = document.getElementById('appSidebar');
      const overlay = document.getElementById('sidebarOverlay');
      const closeBtn = document.getElementById('sidebarCloseBtn');

      function openSidebar() {
        if (sidebar) sidebar.classList.add('open');
        if (overlay) overlay.classList.add('open');
      }

      function closeSidebar() {
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
      }

      if (mobileBtn) mobileBtn.addEventListener('click', openSidebar);
      if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
      if (overlay) overlay.addEventListener('click', closeSidebar);

      // Setup user session info in header
      const currentUser = window.Auth ? window.Auth.getCurrentUser() : null;
      if (currentUser) {
        const userNameElem = document.getElementById('headerUserName');
        const userAvatarElem = document.getElementById('headerUserAvatar');
        if (userNameElem) userNameElem.textContent = currentUser.full_name || 'Admin User';
        if (userAvatarElem) {
          const initials = (currentUser.full_name || 'AU')
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
          userAvatarElem.textContent = initials;
        }

        // Show "Phân Quyền" link only for ADMIN users
        const navPerm = document.getElementById('navPermissions');
        if (navPerm) {
          navPerm.style.display = (currentUser.role === 'ADMIN') ? 'flex' : 'none';
        }
      }

      // Logout buttons
      document.querySelectorAll('.btn-logout-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          App.showConfirmModal({
            title: 'Đăng xuất',
            message: 'Bạn có chắc chắn muốn đăng xuất khỏi phiên làm việc hiện tại?',
            confirmText: 'Đăng xuất',
            confirmClass: 'btn-danger',
            onConfirm: () => {
              window.Auth.logout();
            }
          });
        });
      });

      // DB Manager modal triggers
      document.querySelectorAll('.btn-open-db-manager').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          App.openDatabaseManagerModal();
        });
      });

      // Update live Supabase UI badge
      if (window.SupabaseService) {
        window.SupabaseService.updateUIBadge();
      }
    }
  };

  window.App = App;

})(window);
