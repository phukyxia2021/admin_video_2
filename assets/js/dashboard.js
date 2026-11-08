/**
 * Dashboard Logic & Chart.js Integration
 * Specifications: 01_REQUIREMENTS.md, 03_DATABASE_SCHEMA.md, 05_PAGE_SPECIFICATIONS.md
 */

(function (window) {
  'use strict';

  let topVideosChartInstance = null;
  let viewsTrendChartInstance = null;
  let currentTrendMode = 'daily'; // 'daily' or 'monthly'

  const Dashboard = {
    /**
     * Main init function for index.html
     */
    async init() {
      try {
        // Initialize databases
        await window.DatabaseManager.initDatabases();

        // Render KPI metrics
        this.renderKPIs();

        // Render Charts
        this.renderTopVideosChart();
        this.renderViewsTrendChart(currentTrendMode);

        // Bind Trend Mode Toggle
        this.bindEvents();
      } catch (err) {
        console.error('[Dashboard] Lỗi tải dashboard:', err);
        window.App.showToast(`Lỗi khởi động dashboard: ${err.message}`, 'error');
      }
    },

    /**
     * Compute and display KPI cards from SQLite queries
     */
    renderKPIs() {
      try {
        // 1. Total Videos (excluding archived)
        const totalVideosRes = window.DatabaseManager.runQuery(
          'videos.db',
          "SELECT COUNT(*) AS total_videos FROM videos WHERE status != 'archived'"
        );
        const totalVideos = totalVideosRes[0]?.total_videos || 0;

        // 2. Total Views (published only)
        const totalViewsRes = window.DatabaseManager.runQuery(
          'videos.db',
          "SELECT COALESCE(SUM(views), 0) AS total_views FROM videos WHERE status = 'published'"
        );
        const totalViews = totalViewsRes[0]?.total_views || 0;

        // 3. Storage Used (excluding archived)
        const totalStorageRes = window.DatabaseManager.runQuery(
          'videos.db',
          "SELECT COALESCE(SUM(file_size_bytes), 0) AS total_storage_bytes FROM videos WHERE status != 'archived'"
        );
        const totalStorageBytes = totalStorageRes[0]?.total_storage_bytes || 0;

        // 4. Total Categories
        const catRes = window.DatabaseManager.runQuery(
          'video_categories.db',
          "SELECT COUNT(*) AS total_categories FROM categories"
        );
        const totalCategories = catRes[0]?.total_categories || 0;

        // Update DOM elements
        const elemVideos = document.getElementById('kpiTotalVideos');
        const elemViews = document.getElementById('kpiTotalViews');
        const elemStorage = document.getElementById('kpiTotalStorage');
        const elemCategories = document.getElementById('kpiTotalCategories');

        if (elemVideos) elemVideos.textContent = window.App.formatNumber(totalVideos);
        if (elemViews) elemViews.textContent = window.App.formatNumber(totalViews);
        if (elemStorage) elemStorage.textContent = window.App.formatBytes(totalStorageBytes);
        if (elemCategories) elemCategories.textContent = window.App.formatNumber(totalCategories);

        // Empty state check
        const emptyState = document.getElementById('dashboardEmptyState');
        const contentSection = document.getElementById('dashboardMainContent');
        if (totalVideos === 0) {
          if (emptyState) emptyState.style.display = 'flex';
          if (contentSection) contentSection.style.display = 'none';
        } else {
          if (emptyState) emptyState.style.display = 'none';
          if (contentSection) contentSection.style.display = 'block';
        }
      } catch (err) {
        console.error('[Dashboard] Lỗi tính KPI:', err);
      }
    },

    /**
     * Render Bar Chart for Top 10 Videos by Views
     */
    renderTopVideosChart() {
      const canvas = document.getElementById('topVideosChart');
      if (!canvas) return;

      try {
        const query = `
          SELECT id, title, views, thumbnail_url
          FROM videos
          WHERE status = 'published'
          ORDER BY views DESC
          LIMIT 10;
        `;
        const rows = window.DatabaseManager.runQuery('videos.db', query);

        if (!rows || rows.length === 0) {
          // If no rows, destroy chart if exists
          if (topVideosChartInstance) topVideosChartInstance.destroy();
          return;
        }

        // Truncate labels for cleaner display
        const labels = rows.map(r => {
          return r.title.length > 28 ? r.title.substring(0, 26) + '...' : r.title;
        });
        const data = rows.map(r => r.views);

        if (topVideosChartInstance) {
          topVideosChartInstance.destroy();
        }

        const ctx = canvas.getContext('2d');
        topVideosChartInstance = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: 'Lượt xem',
              data: data,
              backgroundColor: 'rgba(79, 70, 229, 0.85)',
              hoverBackgroundColor: 'rgba(67, 56, 202, 1)',
              borderRadius: 6,
              borderSkipped: false,
              barPercentage: 0.65
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                backgroundColor: '#172033',
                titleColor: '#FFFFFF',
                bodyColor: '#E6EAF0',
                padding: 12,
                cornerRadius: 8,
                callbacks: {
                  title: (items) => {
                    const idx = items[0].dataIndex;
                    return rows[idx].title;
                  },
                  label: (item) => {
                    return ` Lượt xem: ${window.App.formatNumber(item.raw)}`;
                  }
                }
              }
            },
            scales: {
              x: {
                grid: {
                  display: false
                },
                ticks: {
                  font: {
                    size: 11
                  },
                  color: '#667085',
                  maxRotation: 45,
                  minRotation: 30
                }
              },
              y: {
                beginAtZero: true,
                grid: {
                  color: '#F1F4F9'
                },
                ticks: {
                  font: {
                    size: 11
                  },
                  color: '#667085',
                  callback: (val) => {
                    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
                    if (val >= 1000) return (val / 1000).toFixed(0) + 'K';
                    return val;
                  }
                }
              }
            }
          }
        });
      } catch (err) {
        console.error('[Dashboard] Lỗi render Top Videos Chart:', err);
      }
    },

    /**
     * Render Line Chart for Views Trend (Daily or Monthly)
     */
    renderViewsTrendChart(mode = 'daily') {
      const canvas = document.getElementById('viewsTrendChart');
      if (!canvas) return;

      try {
        let rows = [];
        let labels = [];
        let data = [];

        if (mode === 'daily') {
          const query = `
            SELECT view_date, SUM(views) AS total_views
            FROM video_views_daily
            GROUP BY view_date
            ORDER BY view_date ASC
            LIMIT 30;
          `;
          rows = window.DatabaseManager.runQuery('video_analytics.db', query);

          labels = rows.map(r => {
            // Convert YYYY-MM-DD to DD/MM
            const parts = r.view_date.split('-');
            return `${parts[2]}/${parts[1]}`;
          });
          data = rows.map(r => r.total_views);
        } else {
          // Monthly aggregation
          const query = `
            SELECT substr(view_date, 1, 7) AS month,
                   SUM(views) AS total_views
            FROM video_views_daily
            GROUP BY substr(view_date, 1, 7)
            ORDER BY month ASC;
          `;
          rows = window.DatabaseManager.runQuery('video_analytics.db', query);

          labels = rows.map(r => {
            // YYYY-MM -> MM/YYYY
            const parts = r.month.split('-');
            return `T${parts[1]}/${parts[0]}`;
          });
          data = rows.map(r => r.total_views);
        }

        if (viewsTrendChartInstance) {
          viewsTrendChartInstance.destroy();
        }

        const ctx = canvas.getContext('2d');

        // Create gradient fill
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(79, 70, 229, 0.25)');
        gradient.addColorStop(1, 'rgba(79, 70, 229, 0.01)');

        viewsTrendChartInstance = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: mode === 'daily' ? 'Lượt xem theo ngày' : 'Lượt xem theo tháng',
              data: data,
              borderColor: '#4F46E5',
              borderWidth: 2.5,
              backgroundColor: gradient,
              fill: true,
              tension: 0.35,
              pointBackgroundColor: '#FFFFFF',
              pointBorderColor: '#4F46E5',
              pointBorderWidth: 2,
              pointRadius: rows.length > 20 ? 2 : 4,
              pointHoverRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                backgroundColor: '#172033',
                titleColor: '#FFFFFF',
                bodyColor: '#E6EAF0',
                padding: 12,
                cornerRadius: 8,
                callbacks: {
                  label: (item) => {
                    return ` Tổng lượt xem: ${window.App.formatNumber(item.raw)}`;
                  }
                }
              }
            },
            scales: {
              x: {
                grid: {
                  display: false
                },
                ticks: {
                  font: {
                    size: 11
                  },
                  color: '#667085'
                }
              },
              y: {
                beginAtZero: true,
                grid: {
                  color: '#F1F4F9'
                },
                ticks: {
                  font: {
                    size: 11
                  },
                  color: '#667085',
                  callback: (val) => {
                    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
                    if (val >= 1000) return (val / 1000).toFixed(0) + 'K';
                    return val;
                  }
                }
              }
            }
          }
        });
      } catch (err) {
        console.error('[Dashboard] Lỗi render Views Trend Chart:', err);
      }
    },

    /**
     * Bind UI event listeners (Toggle daily/monthly, refresh, etc.)
     */
    bindEvents() {
      const toggleDaily = document.getElementById('toggleDailyTrend');
      const toggleMonthly = document.getElementById('toggleMonthlyTrend');

      if (toggleDaily && toggleMonthly) {
        toggleDaily.addEventListener('click', () => {
          if (currentTrendMode !== 'daily') {
            currentTrendMode = 'daily';
            toggleDaily.classList.add('active');
            toggleMonthly.classList.remove('active');
            this.renderViewsTrendChart('daily');
          }
        });

        toggleMonthly.addEventListener('click', () => {
          if (currentTrendMode !== 'monthly') {
            currentTrendMode = 'monthly';
            toggleMonthly.classList.add('active');
            toggleDaily.classList.remove('active');
            this.renderViewsTrendChart('monthly');
          }
        });
      }
    }
  };

  window.Dashboard = Dashboard;

})(window);
