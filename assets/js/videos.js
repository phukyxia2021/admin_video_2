/**
 * Video Management Module (List, Search, Filter, Sort, Pagination, Add/Edit/Delete)
 * Specifications: 01_REQUIREMENTS.md, 03_DATABASE_SCHEMA.md, 05_PAGE_SPECIFICATIONS.md
 */

(function (window) {
  'use strict';

  let currentVideos = [];
  let categoriesMap = {};
  let currentPage = 1;
  let itemsPerPage = 10;
  let editingVideoId = null;

  // Search & Filter state
  let searchQuery = '';
  let selectedCategory = '';
  let selectedStatus = '';
  let selectedSort = 'views_desc';

  const Videos = {
    /**
     * Initialize Video management on videos.html
     */
    async init() {
      try {
        await window.DatabaseManager.initDatabases();
        this.loadCategories();
        this.bindEvents();
        this.loadVideos();
      } catch (err) {
        console.error('[Videos] Lỗi khởi tạo trang Videos:', err);
        window.App.showToast(`Lỗi nạp danh sách: ${err.message}`, 'error');
      }
    },

    /**
     * Load category options from video_categories.db
     */
    loadCategories() {
      try {
        const rows = window.DatabaseManager.runQuery(
          'video_categories.db',
          'SELECT id, name, slug FROM categories ORDER BY name ASC'
        );

        categoriesMap = {};
        const filterSelect = document.getElementById('categoryFilter');
        const modalCatSelect = document.getElementById('videoCategory');

        if (filterSelect) {
          filterSelect.innerHTML = '<option value="">Tất cả danh mục</option>';
        }
        if (modalCatSelect) {
          modalCatSelect.innerHTML = '<option value="">-- Chọn danh mục --</option>';
        }

        for (const cat of rows) {
          categoriesMap[cat.id] = cat.name;

          if (filterSelect) {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;
            filterSelect.appendChild(opt);
          }

          if (modalCatSelect) {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;
            modalCatSelect.appendChild(opt);
          }
        }
      } catch (err) {
        console.error('[Videos] Lỗi tải danh mục:', err);
      }
    },

    /**
     * Query all videos, apply in-memory filter, sort and pagination
     */
    loadVideos() {
      try {
        // Query from videos.db
        let sql = `
          SELECT id, title, description, thumbnail_url, video_url, category_id,
                 views, file_size_bytes, status, published_at, created_at
          FROM videos
        `;
        let params = [];
        let conditions = [];

        if (selectedStatus) {
          conditions.push('status = ?');
          params.push(selectedStatus);
        }

        if (selectedCategory) {
          conditions.push('category_id = ?');
          params.push(Number(selectedCategory));
        }

        if (searchQuery) {
          conditions.push('(title LIKE ? OR description LIKE ?)');
          params.push(`%${searchQuery}%`, `%${searchQuery}%`);
        }

        if (conditions.length > 0) {
          sql += ' WHERE ' + conditions.join(' AND ');
        }

        // Sorting
        switch (selectedSort) {
          case 'views_desc':
            sql += ' ORDER BY views DESC';
            break;
          case 'views_asc':
            sql += ' ORDER BY views ASC';
            break;
          case 'title_asc':
            sql += ' ORDER BY title ASC';
            break;
          case 'title_desc':
            sql += ' ORDER BY title DESC';
            break;
          case 'date_desc':
            sql += ' ORDER BY COALESCE(published_at, created_at) DESC';
            break;
          case 'date_asc':
            sql += ' ORDER BY COALESCE(published_at, created_at) ASC';
            break;
          default:
            sql += ' ORDER BY id DESC';
            break;
        }

        currentVideos = window.DatabaseManager.runQuery('videos.db', sql, params);

        // Adjust currentPage if out of bounds
        const maxPages = Math.ceil(currentVideos.length / itemsPerPage) || 1;
        if (currentPage > maxPages) currentPage = maxPages;

        this.renderTable();
        this.renderPagination();
      } catch (err) {
        console.error('[Videos] Lỗi load videos:', err);
        window.App.showToast('Lỗi khi nạp dữ liệu video từ SQLite.', 'error');
      }
    },

    /**
     * Render HTML table rows
     */
    renderTable() {
      const tbody = document.getElementById('videosTableBody');
      const emptyState = document.getElementById('tableEmptyState');
      const tableWrap = document.getElementById('videosTableWrap');
      if (!tbody) return;

      tbody.innerHTML = '';

      if (currentVideos.length === 0) {
        if (tableWrap) tableWrap.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
        return;
      }

      if (tableWrap) tableWrap.style.display = 'block';
      if (emptyState) emptyState.style.display = 'none';

      // Slice for pagination
      const startIdx = (currentPage - 1) * itemsPerPage;
      const endIdx = startIdx + itemsPerPage;
      const pagedVideos = currentVideos.slice(startIdx, endIdx);

      const placeholderThumb = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=60';

      for (const vid of pagedVideos) {
        const tr = document.createElement('tr');
        const categoryName = categoriesMap[vid.category_id] || 'Chung';
        const thumbUrl = vid.thumbnail_url || placeholderThumb;

        let statusBadgeClass = 'badge-published';
        let statusText = 'Công khai';
        if (vid.status === 'draft') {
          statusBadgeClass = 'badge-draft';
          statusText = 'Bản nháp';
        } else if (vid.status === 'archived') {
          statusBadgeClass = 'badge-archived';
          statusText = 'Lưu trữ';
        }

        tr.innerHTML = `
          <td style="font-weight: 600; color: var(--text-secondary); width: 60px;">#${vid.id}</td>
          <td class="video-thumbnail-cell">
            <img class="video-thumb-preview"
                 src="${thumbUrl}"
                 alt="${this.escapeHtml(vid.title)}"
                 onerror="this.onerror=null;this.src='${placeholderThumb}';" />
          </td>
          <td>
            <div class="video-title-wrap">
              <span class="video-title-text" title="${this.escapeHtml(vid.title)}">
                ${this.escapeHtml(vid.title)}
              </span>
              <div class="video-meta-sub">
                <span class="badge badge-category" style="font-size:0.7rem;">${this.escapeHtml(categoryName)}</span>
                <span class="badge ${statusBadgeClass}" style="font-size:0.7rem;">${statusText}</span>
                <span>• ${window.App.formatBytes(vid.file_size_bytes)}</span>
              </div>
            </div>
          </td>
          <td style="font-weight: 700; white-space: nowrap;">
            ${window.App.formatNumber(vid.views)}
          </td>
          <td>
            <div class="table-actions">
              <button class="btn btn-outline btn-sm btn-icon-only btn-edit-video" data-id="${vid.id}" title="Chỉnh sửa">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button class="btn btn-danger-outline btn-sm btn-icon-only btn-delete-video" data-id="${vid.id}" title="Xóa">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </td>
        `;

        tbody.appendChild(tr);
      }

      // Bind edit and delete triggers
      tbody.querySelectorAll('.btn-edit-video').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.getAttribute('data-id'));
          this.openEditModal(id);
        });
      });

      tbody.querySelectorAll('.btn-delete-video').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = Number(btn.getAttribute('data-id'));
          this.confirmDeleteVideo(id);
        });
      });
    },

    /**
     * Render pagination buttons
     */
    renderPagination() {
      const footer = document.getElementById('tablePaginationFooter');
      const info = document.getElementById('paginationInfo');
      const controls = document.getElementById('paginationControls');
      if (!footer || !info || !controls) return;

      const total = currentVideos.length;
      if (total === 0) {
        footer.style.display = 'none';
        return;
      }
      footer.style.display = 'flex';

      const maxPages = Math.ceil(total / itemsPerPage);
      const startEntry = (currentPage - 1) * itemsPerPage + 1;
      const endEntry = Math.min(currentPage * itemsPerPage, total);

      info.textContent = `Hiển thị ${startEntry} - ${endEntry} trên tổng số ${total} video`;
      controls.innerHTML = '';

      // Prev Button
      const prevBtn = document.createElement('button');
      prevBtn.className = 'page-btn';
      prevBtn.innerHTML = '&laquo;';
      prevBtn.disabled = (currentPage === 1);
      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          this.renderTable();
          this.renderPagination();
        }
      });
      controls.appendChild(prevBtn);

      // Page numbers (limit to at most 5 buttons around current)
      let startP = Math.max(1, currentPage - 2);
      let endP = Math.min(maxPages, startP + 4);
      if (endP - startP < 4) {
        startP = Math.max(1, endP - 4);
      }

      for (let p = startP; p <= endP; p++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-btn ${p === currentPage ? 'active' : ''}`;
        pageBtn.textContent = p;
        pageBtn.addEventListener('click', () => {
          currentPage = p;
          this.renderTable();
          this.renderPagination();
        });
        controls.appendChild(pageBtn);
      }

      // Next Button
      const nextBtn = document.createElement('button');
      nextBtn.className = 'page-btn';
      nextBtn.innerHTML = '&raquo;';
      nextBtn.disabled = (currentPage === maxPages);
      nextBtn.addEventListener('click', () => {
        if (currentPage < maxPages) {
          currentPage++;
          this.renderTable();
          this.renderPagination();
        }
      });
      controls.appendChild(nextBtn);
    },

    /**
     * Open Modal for Add
     */
    openAddModal() {
      editingVideoId = null;
      document.getElementById('videoModalTitle').textContent = 'Thêm Video Mới';
      document.getElementById('videoForm').reset();
      document.getElementById('videoViews').value = '0';
      document.getElementById('videoSizeMB').value = '500';
      document.getElementById('videoStatus').value = 'published';
      
      const now = new Date();
      const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      document.getElementById('videoPublishedAt').value = localIso;

      this.updateThumbPreview();
      document.getElementById('videoModal').classList.add('active');
    },

    /**
     * Open Modal for Edit
     */
    openEditModal(videoId) {
      editingVideoId = videoId;
      const vid = currentVideos.find(v => v.id === videoId);
      if (!vid) {
        window.App.showToast('Không tìm thấy video cần sửa.', 'error');
        return;
      }

      document.getElementById('videoModalTitle').textContent = `Chỉnh sửa Video #${vid.id}`;
      document.getElementById('videoTitle').value = vid.title || '';
      document.getElementById('videoDescription').value = vid.description || '';
      document.getElementById('videoCategory').value = vid.category_id || '';
      document.getElementById('videoThumbnail').value = vid.thumbnail_url || '';
      document.getElementById('videoUrl').value = vid.video_url || '';
      document.getElementById('videoViews').value = vid.views || 0;
      
      // Convert bytes to MB
      const mbSize = Math.round((vid.file_size_bytes || 0) / (1024 * 1024));
      document.getElementById('videoSizeMB').value = mbSize;

      document.getElementById('videoStatus').value = vid.status || 'published';

      if (vid.published_at) {
        const d = new Date(vid.published_at);
        if (!isNaN(d.getTime())) {
          const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          document.getElementById('videoPublishedAt').value = localIso;
        } else {
          document.getElementById('videoPublishedAt').value = '';
        }
      } else {
        document.getElementById('videoPublishedAt').value = '';
      }

      this.updateThumbPreview();
      document.getElementById('videoModal').classList.add('active');
    },

    /**
     * Save (Add or Update) Video
     */
    async saveVideo() {
      const title = document.getElementById('videoTitle').value.trim();
      const description = document.getElementById('videoDescription').value.trim();
      const categoryId = document.getElementById('videoCategory').value ? Number(document.getElementById('videoCategory').value) : null;
      const thumbUrl = document.getElementById('videoThumbnail').value.trim();
      const videoUrl = document.getElementById('videoUrl').value.trim();
      const views = parseInt(document.getElementById('videoViews').value, 10) || 0;
      const sizeMB = parseFloat(document.getElementById('videoSizeMB').value) || 0;
      const fileSizeBytes = Math.round(sizeMB * 1024 * 1024);
      const status = document.getElementById('videoStatus').value;
      const pubDateVal = document.getElementById('videoPublishedAt').value;
      const publishedAt = pubDateVal ? new Date(pubDateVal).toISOString() : null;

      if (!title) {
        window.App.showToast('Vui lòng nhập tiêu đề video.', 'warning');
        document.getElementById('videoTitle').focus();
        return;
      }

      try {
        if (editingVideoId) {
          // Update
          window.DatabaseManager.runStatement(
            'videos.db',
            `UPDATE videos
             SET title = ?, description = ?, thumbnail_url = ?, video_url = ?,
                 category_id = ?, views = ?, file_size_bytes = ?, status = ?,
                 published_at = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [title, description, thumbUrl, videoUrl, categoryId, views, fileSizeBytes, status, publishedAt, editingVideoId]
          );

          window.App.showToast('Cập nhật video thành công!', 'success');
        } else {
          // Insert
          const result = window.DatabaseManager.runStatement(
            'videos.db',
            `INSERT INTO videos
             (title, description, thumbnail_url, video_url, category_id, views, file_size_bytes, status, published_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [title, description, thumbUrl, videoUrl, categoryId, views, fileSizeBytes, status, publishedAt]
          );

          // If new video has views, record an initial analytics point
          if (views > 0 && result.lastInsertRowid) {
            const today = new Date().toISOString().split('T')[0];
            window.DatabaseManager.runStatement(
              'video_analytics.db',
              'INSERT OR REPLACE INTO video_views_daily (video_id, view_date, views) VALUES (?, ?, ?)',
              [result.lastInsertRowid, today, Math.min(views, 500)]
            );
          }

          window.App.showToast('Thêm video mới thành công!', 'success');
        }

        document.getElementById('videoModal').classList.remove('active');
        this.loadVideos();
      } catch (err) {
        console.error('[Videos] Lỗi lưu video:', err);
        window.App.showToast(`Lỗi lưu video: ${err.message}`, 'error');
      }
    },

    /**
     * Confirm and Delete video
     */
    confirmDeleteVideo(videoId) {
      const vid = currentVideos.find(v => v.id === videoId);
      const videoTitle = vid ? vid.title : `#${videoId}`;

      window.App.showConfirmModal({
        title: 'Xóa Video',
        message: `Bạn có chắc chắn muốn xóa video "${videoTitle}"? Hành động này sẽ đồng thời xóa liên kết tag và lịch sử analytics của video trong SQLite.`,
        confirmText: 'Xóa vĩnh viễn',
        confirmClass: 'btn-danger',
        onConfirm: () => {
          try {
            // Delete video
            window.DatabaseManager.runStatement('videos.db', 'DELETE FROM videos WHERE id = ?', [videoId]);
            
            // Cleanup relations
            window.DatabaseManager.runStatement('video_tags.db', 'DELETE FROM video_tag_map WHERE video_id = ?', [videoId]);
            window.DatabaseManager.runStatement('video_analytics.db', 'DELETE FROM video_views_daily WHERE video_id = ?', [videoId]);

            window.App.showToast('Đã xóa video thành công!', 'success');
            this.loadVideos();
          } catch (err) {
            console.error('[Videos] Lỗi xóa video:', err);
            window.App.showToast(`Lỗi xóa video: ${err.message}`, 'error');
          }
        }
      });
    },

    /**
     * Preview thumbnail in modal
     */
    updateThumbPreview() {
      const urlInput = document.getElementById('videoThumbnail');
      const previewImg = document.getElementById('modalThumbPreview');
      if (!urlInput || !previewImg) return;

      const url = urlInput.value.trim();
      if (url) {
        previewImg.src = url;
        previewImg.style.display = 'block';
      } else {
        previewImg.style.display = 'none';
      }
    },

    /**
     * Bind search, filter, and modal triggers
     */
    bindEvents() {
      // Search input with debounce
      const searchInput = document.getElementById('videoSearchInput');
      let searchTimeout = null;
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          clearTimeout(searchTimeout);
          searchTimeout = setTimeout(() => {
            searchQuery = e.target.value.trim();
            currentPage = 1;
            this.loadVideos();
          }, 250);
        });
      }

      // Category filter
      const catFilter = document.getElementById('categoryFilter');
      if (catFilter) {
        catFilter.addEventListener('change', (e) => {
          selectedCategory = e.target.value;
          currentPage = 1;
          this.loadVideos();
        });
      }

      // Status filter
      const statusFilter = document.getElementById('statusFilter');
      if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
          selectedStatus = e.target.value;
          currentPage = 1;
          this.loadVideos();
        });
      }

      // Sort select
      const sortSelect = document.getElementById('sortSelect');
      if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
          selectedSort = e.target.value;
          this.loadVideos();
        });
      }

      // Add Video button triggers
      document.querySelectorAll('.btn-add-video-trigger').forEach(btn => {
        btn.addEventListener('click', () => this.openAddModal());
      });

      // Modal close & save
      const modal = document.getElementById('videoModal');
      const closeBtn = document.getElementById('videoModalClose');
      const cancelBtn = document.getElementById('videoModalCancel');
      const form = document.getElementById('videoForm');

      if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));
      if (cancelBtn) cancelBtn.addEventListener('click', () => modal.classList.remove('active'));
      
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          this.saveVideo();
        });
      }

      // Live thumbnail preview on input
      const thumbInput = document.getElementById('videoThumbnail');
      if (thumbInput) {
        thumbInput.addEventListener('input', () => this.updateThumbPreview());
      }
    },

    /**
     * Sanitize string for HTML insertion
     */
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

  window.Videos = Videos;

})(window);
