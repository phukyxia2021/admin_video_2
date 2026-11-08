/**
 * Permission Management Module — Video Admin
 * Module: Phân Quyền (Role Management)
 *
 * Features:
 *  - Hiển thị danh sách tất cả tài khoản với role hiện tại
 *  - ADMIN có thể thay đổi role (ADMIN ↔ USER) của tài khoản khác
 *  - Không thể thay đổi role của chính mình
 *  - Không thể hạ cấp admin cuối cùng (phải có ít nhất 1 ADMIN)
 *  - Tìm kiếm tài khoản theo tên, email
 *  - Lọc theo role
 *  - Cập nhật session nếu tài khoản bị thay đổi đúng user đang đăng nhập
 */

(function (window) {
  'use strict';

  let allUsers = [];
  let searchQuery = '';
  let filterRole = '';

  const Permissions = {
    async init() {
      try {
        await window.DatabaseManager.initDatabases();

        // Ensure demo user accounts exist
        await window.DatabaseManager._seedDemoUserAccounts();

        this.bindEvents();
        this.loadUsers();
      } catch (err) {
        console.error('[Permissions] Init error:', err);
        window.App.showToast('Lỗi khởi tạo module Phân Quyền: ' + err.message, 'error');
      }
    },

    // ──────────────────────────────────────────────
    // Data
    // ──────────────────────────────────────────────

    loadUsers() {
      try {
        allUsers = window.DatabaseManager.runQuery(
          'users.db',
          `SELECT id, full_name, email, role, status, created_at
           FROM users
           ORDER BY
             CASE role WHEN 'ADMIN' THEN 0 ELSE 1 END,
             full_name ASC`
        );
        this.renderTable();
        this.renderStats();
      } catch (err) {
        console.error('[Permissions] loadUsers error:', err);
        window.App.showToast('Lỗi tải danh sách tài khoản.', 'error');
      }
    },

    // ──────────────────────────────────────────────
    // Render
    // ──────────────────────────────────────────────

    renderStats() {
      const totalAdmins = allUsers.filter(u => u.role === 'ADMIN').length;
      const totalUsers  = allUsers.filter(u => u.role === 'USER').length;
      const totalActive = allUsers.filter(u => u.status === 'active').length;

      const elTotal  = document.getElementById('statTotalAccounts');
      const elAdmins = document.getElementById('statAdmins');
      const elUsers  = document.getElementById('statUsers');
      const elActive = document.getElementById('statActive');

      if (elTotal)  elTotal.textContent  = allUsers.length;
      if (elAdmins) elAdmins.textContent = totalAdmins;
      if (elUsers)  elUsers.textContent  = totalUsers;
      if (elActive) elActive.textContent = totalActive;
    },

    renderTable() {
      const tbody    = document.getElementById('permTableBody');
      const emptyEl  = document.getElementById('permEmptyState');
      const tableWrap = document.getElementById('permTableWrap');
      if (!tbody) return;

      const currentUser = window.Auth.getCurrentUser();

      // Apply search + filter
      let filtered = allUsers;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(u =>
          u.full_name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
        );
      }
      if (filterRole) {
        filtered = filtered.filter(u => u.role === filterRole);
      }

      tbody.innerHTML = '';

      if (filtered.length === 0) {
        if (tableWrap) tableWrap.style.display = 'none';
        if (emptyEl)   emptyEl.style.display   = 'flex';
        return;
      }

      if (tableWrap) tableWrap.style.display = 'block';
      if (emptyEl)   emptyEl.style.display   = 'none';

      const isSelf = id => currentUser && currentUser.id == id;
      const adminCount = allUsers.filter(u => u.role === 'ADMIN').length;

      for (const user of filtered) {
        const tr = document.createElement('tr');
        const isMe = isSelf(user.id);

        // Avatar initials
        const initials = user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const avatarColor = user.role === 'ADMIN' ? 'var(--primary)' : '#0284C7';

        // Role badge
        const roleBadge = user.role === 'ADMIN'
          ? `<span class="badge badge-perm-admin">
               <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
               ADMIN
             </span>`
          : `<span class="badge badge-perm-user">
               <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
               USER
             </span>`;

        // Status badge
        const statusBadge = user.status === 'active'
          ? `<span class="badge badge-perm-active">Hoạt động</span>`
          : `<span class="badge badge-perm-disabled">Vô hiệu</span>`;

        // Self tag
        const selfTag = isMe
          ? `<span class="perm-self-tag">Bạn</span>`
          : '';

        // Action: role toggle or locked
        let actionCell = '';
        if (isMe) {
          actionCell = `
            <div class="perm-action-wrap">
              <span class="perm-locked-hint">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                Không thể sửa tài khoản của chính bạn
              </span>
            </div>`;
        } else if (user.role === 'ADMIN' && adminCount <= 1) {
          actionCell = `
            <div class="perm-action-wrap">
              <span class="perm-locked-hint">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                ADMIN cuối cùng, không thể hạ cấp
              </span>
            </div>`;
        } else {
          const targetRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
          const targetLabel = user.role === 'ADMIN'
            ? '<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg> Hạ xuống USER'
            : '<svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg> Nâng lên ADMIN';
          const btnClass = user.role === 'ADMIN' ? 'btn-perm-demote' : 'btn-perm-promote';

          actionCell = `
            <div class="perm-action-wrap">
              <button class="btn btn-sm ${btnClass} btn-change-role"
                      data-user-id="${user.id}"
                      data-user-name="${this.escapeHtml(user.full_name)}"
                      data-current-role="${user.role}"
                      data-target-role="${targetRole}">
                ${targetLabel}
              </button>
            </div>`;
        }

        tr.innerHTML = `
          <td style="width:60px; color:var(--text-secondary); font-weight:600;">#${user.id}</td>
          <td>
            <div class="perm-user-cell">
              <div class="perm-avatar" style="background:${avatarColor};">${initials}</div>
              <div class="perm-user-info">
                <span class="perm-user-name">${this.escapeHtml(user.full_name)} ${selfTag}</span>
                <span class="perm-user-email">${this.escapeHtml(user.email)}</span>
              </div>
            </div>
          </td>
          <td>${roleBadge}</td>
          <td>${statusBadge}</td>
          <td style="font-size:0.8rem; color:var(--text-secondary);">
            ${window.App.formatDate(user.created_at)}
          </td>
          <td>${actionCell}</td>
        `;

        tbody.appendChild(tr);
      }

      // Bind role-change buttons
      tbody.querySelectorAll('.btn-change-role').forEach(btn => {
        btn.addEventListener('click', () => {
          const userId      = Number(btn.getAttribute('data-user-id'));
          const userName    = btn.getAttribute('data-user-name');
          const currentRole = btn.getAttribute('data-current-role');
          const targetRole  = btn.getAttribute('data-target-role');
          this.confirmChangeRole(userId, userName, currentRole, targetRole);
        });
      });
    },

    // ──────────────────────────────────────────────
    // Role Change Logic
    // ──────────────────────────────────────────────

    confirmChangeRole(userId, userName, currentRole, targetRole) {
      const isPromote = targetRole === 'ADMIN';
      window.App.showConfirmModal({
        title: isPromote ? `Nâng lên ADMIN` : `Hạ xuống USER`,
        message: isPromote
          ? `Bạn có chắc chắn muốn nâng quyền tài khoản "${userName}" lên ADMIN? Tài khoản này sẽ có toàn quyền quản trị hệ thống.`
          : `Bạn có chắc chắn muốn hạ quyền tài khoản "${userName}" xuống USER? Tài khoản này sẽ mất quyền truy cập vào các trang quản trị.`,
        confirmText: isPromote ? 'Nâng lên ADMIN' : 'Hạ xuống USER',
        confirmClass: isPromote ? 'btn-primary' : 'btn-danger',
        onConfirm: () => this.applyRoleChange(userId, targetRole)
      });
    },

    applyRoleChange(userId, newRole) {
      try {
        // Safety: check last admin rule
        if (newRole === 'USER') {
          const adminCount = window.DatabaseManager.runQuery(
            'users.db',
            "SELECT COUNT(*) as count FROM users WHERE role = 'ADMIN'"
          )[0].count;
          if (adminCount <= 1) {
            window.App.showToast('Không thể hạ cấp: đây là tài khoản ADMIN cuối cùng trong hệ thống.', 'error');
            return;
          }
        }

        window.DatabaseManager.runStatement(
          'users.db',
          `UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [newRole, userId]
        );

        const label = newRole === 'ADMIN' ? 'nâng lên ADMIN' : 'hạ xuống USER';
        window.App.showToast(`Đã ${label} thành công!`, 'success');

        this.loadUsers();
      } catch (err) {
        console.error('[Permissions] applyRoleChange error:', err);
        window.App.showToast('Lỗi khi thay đổi quyền: ' + err.message, 'error');
      }
    },

    // ──────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────

    bindEvents() {
      // Live search with debounce
      const searchInput = document.getElementById('permSearchInput');
      let timer = null;
      if (searchInput) {
        searchInput.addEventListener('input', e => {
          clearTimeout(timer);
          timer = setTimeout(() => {
            searchQuery = e.target.value.trim();
            this.renderTable();
          }, 220);
        });
      }

      // Role filter
      const roleFilter = document.getElementById('permRoleFilter');
      if (roleFilter) {
        roleFilter.addEventListener('change', e => {
          filterRole = e.target.value;
          this.renderTable();
        });
      }

      // Refresh button
      const refreshBtn = document.getElementById('btnRefreshUsers');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
          this.loadUsers();
          window.App.showToast('Đã làm mới danh sách tài khoản.', 'info');
        });
      }
    },

    // ──────────────────────────────────────────────
    // Utility
    // ──────────────────────────────────────────────

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  };

  window.Permissions = Permissions;

})(window);
