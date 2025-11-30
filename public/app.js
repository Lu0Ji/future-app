
(() => {
  'use strict';

  // =========================
  // 0) KÜÇÜK YARDIMCILAR
  // =========================

  const escapeHtml = (s) =>
    String(s ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');

  const fmtDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toISOString().split('T')[0];
  };

  async function handleLikeToggle(buttonEl) {
  if (!buttonEl) return;
  if (!authToken) {
    alert('Beğenmek için önce giriş yapmalısınız.');
    return;
  }

  // Buton üzerinde data-id yoksa, en yakın feed-item'dan al
  let id = buttonEl.dataset.id;
  if (!id) {
    const item = buttonEl.closest('.feed-item');
    if (item && item.dataset.id) {
      id = item.dataset.id;
    }
  }
  if (!id) return;

  try {
    const res = await api.post(
      `/api/predictions/${encodeURIComponent(id)}/like`,
      {},
      authToken
    );

    const liked = !!res.liked;
    const count = res.likesCount ?? 0;

    // Görsel güncelleme
    buttonEl.classList.toggle('liked', liked);
    const countSpan = buttonEl.querySelector('.like-count');
    if (countSpan) {
      countSpan.textContent = count;
    }
  } catch (err) {
    console.error('like toggle error:', err);
    alert('Beğeni işlemi sırasında bir hata oluştu.');
  }
}


  function prefillPredictionFormFromComment(comment) {
  if (!predictionTitleEl || !predictionContentEl) return;

  // Başlık boşsa default bir şey ver
  if (!predictionTitleEl.value) {
    predictionTitleEl.value = 'Yorumdan üretilen tahmin';
  }

  predictionContentEl.value = comment.content || '';

  activeSourceCommentId = comment.id;

  if (predictionFromCommentHintEl) {
    const created = fmtDate(comment.createdAt);
    predictionFromCommentHintEl.textContent =
      `Bu tahmin, ${created || 'bu'} tarihli yorumundan oluşturulacak.`;
  }

  if (predictionMessageEl) {
    predictionMessageEl.textContent = '';
    predictionMessageEl.className = 'message';
  }

  // Kullanıcıyı form alanına odakla (opsiyonel)
  predictionTitleEl.focus();
}


  // Basit fetch helper’ları:
  const api = {
    async get(url, token) {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
      return data;
    },
    async post(url, body, token) {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
      return data;
    },
    async patch(url, body, token) {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
      return data;
    },
    async del(url, token) {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
      return data;
    },
  };

  function prefillPredictionFormFromComment(comment) {
  if (!predictionTitleEl || !predictionContentEl) return;

  // Başlık boşsa varsayılan bir başlık ver
  if (!predictionTitleEl.value) {
    predictionTitleEl.value = 'Yorumdan üretilen tahmin';
  }

  predictionContentEl.value = comment.content || '';
  activeSourceCommentId = comment.id;

  if (predictionFromCommentHintEl) {
    const created = fmtDate(comment.createdAt);
    predictionFromCommentHintEl.textContent =
      `Bu tahmin, ${created || 'bu'} tarihli yorumundan oluşturulacak.`;
  }

  if (predictionMessageEl) {
    predictionMessageEl.textContent = '';
    predictionMessageEl.className = 'message';
  }

  predictionTitleEl.focus();
}


  // =========================
  // 1) GLOBAL DURUM
  // =========================

  let authToken = localStorage.getItem('token') || '';
  let currentUser = null; // {id, username} dolacak
  let selectedPredictionId = null; // Detayda seçili tahmin
  let activeSourceCommentId = null; // Yorumdan tahmin üretirken kullanacağız
  let currentComments = []; // Son yüklenen yorum listesi



  // =========================
  // 2) DOM ELEMANLARI (önce hepsini topla)
  // =========================

  // Auth
  const registerForm = document.getElementById('register-form');
  const loginForm = document.getElementById('login-form');
  const logoutButton = document.getElementById('logout-button');
  const userInfoEl = document.getElementById('user-info');

  // Tahmin oluşturma
  const predictionSection = document.getElementById('prediction-section');
  const predictionForm = document.getElementById('prediction-form');
  const predictionTitleEl = document.getElementById('prediction-title');
  const predictionContentEl = document.getElementById('prediction-content');
  const predictionDateEl = document.getElementById('prediction-date');
  const categorySelectEl = document.getElementById('prediction-category');
  const predictionMessageEl = document.getElementById('prediction-message');
  const predictionFromCommentHintEl = document.getElementById('prediction-from-comment-hint');
  const predictionSubmitBtn =
    predictionForm?.querySelector('button[type="submit"]');



  // Feed
  const feedListEl = document.getElementById('feed-list');

   // Benim tahminlerim + filtreler
  const myPredictionsListEl = document.getElementById('my-predictions-list');
  const myPredictionsFilterCategoryEl = document.getElementById('my-predictions-filter-category');
  const myPredictionsFilterStatusEl = document.getElementById('my-predictions-filter-status');
  const myPredictionsClearFiltersBtn = document.getElementById('my-predictions-clear-filters');
  const myPredictionsSummaryEl = document.getElementById('my-predictions-summary');
  const myStatsEl = document.getElementById('my-stats');

    // Liderlik ve profil istatistikleri
  const leaderboardCardEl = document.getElementById('leaderboard-card');
  const leaderboardCategoryEl = document.getElementById('leaderboard-category');
  const leaderboardMinResolvedEl = document.getElementById('leaderboard-min-resolved');
  const leaderboardRefreshBtn = document.getElementById('leaderboard-refresh');
  const leaderboardBodyEl = document.getElementById('leaderboard-body');


  // Detay paneli
  const predictionDetailEl = document.getElementById('prediction-detail');

  // Yorumlar
  const commentsListEl = document.getElementById('comments-list');
  const commentForm = document.getElementById('comment-form');
  const commentContentEl = document.getElementById('comment-content');
  const commentMessageEl = document.getElementById('comment-message');
  const commentSubmitBtn =
    commentForm?.querySelector('button[type="submit"]');

  // Profil / DM (varsa çalışır)
  const profileDetailsEl = document.getElementById('profile-details');
  const profileCategoryStatsEl = document.getElementById('profile-category-stats');
  const profilePredictionsEl = document.getElementById('profile-predictions');
  const followingListEl = document.getElementById('following-list');
  const exploreUsersEl = document.getElementById('explore-users');
  const dmSelectedUserEl = document.getElementById('dm-selected-user');
  const dmMessagesEl = document.getElementById('dm-messages');
  const dmForm = document.getElementById('dm-form');
  const dmMessageInputEl = document.getElementById('dm-message-input');
  const profileFollowBtn = document.getElementById('profile-follow-btn');
  if (profileFollowBtn) {
  profileFollowBtn.style.display = 'none';
  profileFollowBtn.dataset.userId = '';
  profileFollowBtn.dataset.following = '';
  }


  // =========================
  // 3) UI GÜNCELLEME / YARDIMCILAR
  // =========================

  function setToken(t) {
    authToken = t || '';
    if (authToken) localStorage.setItem('token', authToken);
    else localStorage.removeItem('token');
  }

  function setUserInfoText() {
    if (!userInfoEl) return;
    if (currentUser) {
      userInfoEl.textContent = `Merhaba, ${currentUser.username}`;
    } else {
      userInfoEl.textContent = 'Giriş yapmadınız';
    }
  }

    function resetDetailPanel() {
    selectedPredictionId = null;

    if (predictionDetailEl) {
      predictionDetailEl.innerHTML =
        '<p class="small">Bir tahmine tıklayarak detayını burada görebilirsiniz.</p>';
    }

    if (commentsListEl) {
      commentsListEl.innerHTML =
        '<p class="small">Bu tahmine henüz yorum yapılmamış.</p>';
    }
    if (commentMessageEl) {
      commentMessageEl.textContent = '';
      commentMessageEl.className = 'message';
    }
    if (commentContentEl) {
      commentContentEl.value = '';
    }
  }


  async function loadMeLight() {
    // Token varsa kullanıcı adını almak için hafif yol: /api/stats/me (projende var)
    try {
      const me = await api.get('/api/stats/me', authToken);
      // beklenen: { userId, username, categories: [...] }
      currentUser = { id: me.userId, username: me.username };
    } catch {
      currentUser = null;
    }
    setUserInfoText();
  }

  // =========================
  // 4) KATEGORİLER
  // =========================

  async function loadCategories() {
    try {
      const data = await api.get('/api/categories');
      const categories = data.data || data || [];

      // Tahmin formundaki select
      if (categorySelectEl) {
        categorySelectEl.innerHTML = '';
        categories.forEach((c) => {
          const opt = document.createElement('option');
          opt.value = c.key;
          opt.textContent = c.label;
          categorySelectEl.appendChild(opt);
        });
      }

      // Benim tahminlerim filtresi
      if (myPredictionsFilterCategoryEl) {
        myPredictionsFilterCategoryEl.innerHTML = '';
        const all = document.createElement('option');
        all.value = '';
        all.textContent = 'Tüm kategoriler';
        myPredictionsFilterCategoryEl.appendChild(all);

        categories.forEach((c) => {
          const opt = document.createElement('option');
          opt.value = c.key;
          opt.textContent = c.label;
          myPredictionsFilterCategoryEl.appendChild(opt);
        });
      }

      // Liderlik tablosu kategori seçimi
      if (leaderboardCategoryEl) {
        leaderboardCategoryEl.innerHTML = '';
        const all = document.createElement('option');
        all.value = '';
        all.textContent = 'Tüm kategoriler';
        leaderboardCategoryEl.appendChild(all);

        categories.forEach((c) => {
          const opt = document.createElement('option');
          opt.value = c.key;
          opt.textContent = c.label;
          leaderboardCategoryEl.appendChild(opt);
        });
      }

    } catch (err) {
      console.error('Kategori yükleme hatası:', err);
      if (categorySelectEl) {
        categorySelectEl.innerHTML = '';
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Yüklenemedi';
        categorySelectEl.appendChild(opt);
      }
    }
  }


  // =========================
  // 5) FEED
  // =========================

  async function loadFeed() {
  if (!feedListEl || !authToken) return;

  try {
    const data = await api.get('/api/feed', authToken);
    const items = data.items || data.data || [];

    if (!items.length) {
      feedListEl.innerHTML =
        '<p class="small subtle">Akış boş. Tahmin yap ya da birilerini takip et.</p>';
      return;
    }

    feedListEl.innerHTML = '';

    items.forEach((p) => {
      const div = document.createElement('div');
      div.className = 'feed-item';
      div.dataset.id = p.id;
      div.style.cursor = 'pointer';

      const userName = escapeHtml(p.user?.username || 'Bilinmiyor');
      const cat = escapeHtml(p.category || '');
      const tDate = fmtDate(p.targetDate);
      const created = fmtDate(p.createdAt);
      const title = p.isLocked
        ? 'Mühürlü tahmin'
        : escapeHtml(p.title || '(Başlık yok)');
      const contentHtml = p.isLocked
        ? '<span class="small subtle">İçerik hedef tarih gelene kadar gizli.</span>'
        : escapeHtml(p.content || '').replace(/\n/g, '<br/>');

      const likesCount = p.likesCount ?? 0;
      const liked = !!p.liked;

      div.innerHTML = `
        <div class="feed-header">
          <button
            class="user-link"
            data-user-id="${escapeHtml(p.user?.id || '')}"
            style="background:none;border:none;color:#8ab4f8;cursor:pointer;padding:0"
          >
            ${userName}
          </button>
          <span class="feed-category">${cat}</span>
          <span class="feed-date">${tDate}</span>
        </div>
        <div class="feed-content">
          <strong>${title}</strong>
          <div>${contentHtml}</div>
        </div>
        <div class="feed-footer">
          <span class="small subtle">
            ${created ? `Oluşturma: ${created}` : ''}
          </span>
          <button
            type="button"
            class="like-pill ${liked ? 'liked' : ''}"
            data-id="${p.id}"
          >
            <span class="like-icon">👍</span>
            <span class="like-count">${likesCount}</span>
          </button>
        </div>
      `;

      feedListEl.appendChild(div);
    });
  } catch (err) {
    console.error('loadFeed error:', err);
    feedListEl.innerHTML =
      '<p class="small">Akış yüklenirken bir hata oluştu.</p>';
  }
}



  // =========================
  // 6) BENİM TAHMİNLERİM + DETAY
  // =========================

  async function loadMyPredictions(filters = {}) {
  if (!myPredictionsListEl || !authToken) return;

  const categoryFilter = filters.category || '';
  const statusFilter = filters.status || '';

  const hasFilters = !!(categoryFilter || statusFilter);

  const statusText = statusFilter
    ? `Durum: ${
        statusFilter === 'correct'
          ? 'Doğru'
          : statusFilter === 'incorrect'
          ? 'Yanlış'
          : 'Beklemede'
      }`
    : 'Durum: Tümü';

  let categoryText = 'Kategori: Tümü';
  if (categoryFilter) {
    let label = categoryFilter;
    if (myPredictionsFilterCategoryEl) {
      const sel = myPredictionsFilterCategoryEl;
      const opt = sel.options[sel.selectedIndex];
      if (opt && opt.textContent) {
        label = opt.textContent;
      }
    }
    categoryText = `Kategori: ${label}`;
  }

  const params = new URLSearchParams();
  if (categoryFilter) params.set('category', categoryFilter);
  if (statusFilter) params.set('status', statusFilter);
  const qs = params.toString();
  const url = qs ? `/api/predictions/mine?${qs}` : '/api/predictions/mine';

  try {
    const data = await api.get(url, authToken);
    const items = data.items || data.data || [];

    const countText =
      items.length === 0
        ? 'Hiç tahmin bulunamadı.'
        : items.length === 1
        ? '1 tahmin listeleniyor.'
        : `${items.length} tahmin listeleniyor.`;

    if (myPredictionsSummaryEl) {
      myPredictionsSummaryEl.textContent = `${statusText} · ${categoryText} · ${countText}`;
    }

    if (!items.length) {
      myPredictionsListEl.innerHTML = hasFilters
        ? '<p class="small subtle">Bu filtrelere uyan tahminin yok.</p>'
        : '<p class="small subtle">Henüz tahmin yapmamışsın.</p>';
      return;
    }

    myPredictionsListEl.innerHTML = '';

    items.forEach((p) => {
      const div = document.createElement('div');
      div.className = 'feed-item';
      div.dataset.id = p.id;
      div.style.cursor = 'pointer';

      const cat = escapeHtml(p.category || '');
      const tDate = fmtDate(p.targetDate);
      const created = fmtDate(p.createdAt);

      const rawStatus = p.status || 'pending';
      const statusLabel =
        rawStatus === 'correct'
          ? 'Doğru'
          : rawStatus === 'incorrect'
          ? 'Yanlış'
          : 'Beklemede';

      const statusClass =
        rawStatus === 'correct'
          ? 'status-correct'
          : rawStatus === 'incorrect'
          ? 'status-incorrect'
          : 'status-pending';

      const isLocked = !!p.isLocked;

      const titleText = isLocked
        ? 'Mühürlü tahmin'
        : escapeHtml(p.title || '(Başlık yok)');
      const contentHtml = isLocked
        ? '<span class="small subtle">İçerik hedef tarih gelene kadar gizli.</span>'
        : escapeHtml(p.content || '').replace(/\n/g, '<br/>');

      const likesCount = p.likesCount ?? 0;
      const liked = !!p.liked;

      const metaText = created
        ? `Oluşturma: ${created} · Açılma: ${tDate}`
        : `Açılma: ${tDate}`;

      div.innerHTML = `
        <div class="feed-header">
          <span class="feed-category">${cat}</span>
          <span class="feed-date">${tDate}</span>
        </div>
        <div class="feed-content">
          <strong>${isLocked ? '🔒 ' : ''}${titleText}</strong>
          <div>${contentHtml}</div>
        </div>
        <div class="feed-footer">
          <span class="small subtle">
            ${metaText}
          </span>
          <div class="feed-footer-right">
            <span class="prediction-status-pill ${statusClass}">
              ${statusLabel}
            </span>
            <button
              type="button"
              class="like-pill ${liked ? 'liked' : ''}"
              data-id="${p.id}"
            >
              <span class="like-icon">👍</span>
              <span class="like-count">${likesCount}</span>
            </button>
          </div>
        </div>
      `;

      myPredictionsListEl.appendChild(div);
    });
  } catch (err) {
    console.error('loadMyPredictions error:', err);
    myPredictionsListEl.innerHTML =
      '<p class="small">Tahminler yüklenirken bir hata oluştu.</p>';
  }
}

async function loadMyStats() {
  if (!myStatsEl || !authToken) return;

  myStatsEl.innerHTML =
    '<p class="small subtle">Veriler yükleniyor...</p>';

  try {
    // Kendi tahminlerimizi çekiyoruz
    const data = await api.get('/api/predictions/mine', authToken);
    const items = data.items || data.data || [];

    if (!items.length) {
      myStatsEl.innerHTML =
        '<p class="small subtle">Henüz tahmin yapmadığın için istatistik yok.</p>';
      return;
    }

    const total = items.length;
    const pending = items.filter((p) => p.status === 'pending').length;
    const correct = items.filter((p) => p.status === 'correct').length;
    const incorrect = items.filter((p) => p.status === 'incorrect').length;

    const opened = items.filter((p) => !p.isLocked).length;
    const locked = total - opened;

    const successRate = total ? Math.round((correct / total) * 100) : 0;

    // Kategorilere göre dağılım
    const byCategory = {};
    items.forEach((p) => {
      const key = p.category || 'Diğer';
      byCategory[key] = (byCategory[key] || 0) + 1;
    });

    // Kategorileri en çoktan en aza sırala
    const categoryEntries = Object.entries(byCategory).sort(
      (a, b) => b[1] - a[1]
    );

    const categoryHtml = categoryEntries
      .map(([name, count]) => {
        const percent = Math.round((count / total) * 100);
        return `
          <div class="stat-bar-row">
            <div class="stat-row">
              <span>${escapeHtml(name)}</span>
              <span>${count} (${percent}%)</span>
            </div>
            <div class="stat-bar-track">
              <div class="stat-bar-fill" style="width: ${percent}%;"></div>
            </div>
          </div>
        `;
      })
      .join('');

    myStatsEl.innerHTML = `
      <div class="stat-card">
        <h3>Genel durum</h3>
        <div class="stat-row">
          <span>Toplam tahmin</span>
          <strong>${total}</strong>
        </div>
        <div class="stat-row">
          <span>Doğru</span>
          <strong>${correct}</strong>
        </div>
        <div class="stat-row">
          <span>Yanlış</span>
          <strong>${incorrect}</strong>
        </div>
        <div class="stat-row">
          <span>Bekleyen</span>
          <strong>${pending}</strong>
        </div>
        <div class="stat-row">
          <span>Başarı oranı</span>
          <strong>${successRate}%</strong>
        </div>
      </div>

      <div class="stat-card">
        <h3>Kilit durumu</h3>
        <div class="stat-row">
          <span>Açılmış tahminler</span>
          <strong>${opened}</strong>
        </div>
        <div class="stat-row">
          <span>Kilitli tahminler</span>
          <strong>${locked}</strong>
        </div>
        <div class="stat-bar-track" style="margin-top:6px;">
          <div
            class="stat-bar-fill"
            style="width: ${
              total ? Math.round((opened / total) * 100) : 0
            }%;"
          ></div>
        </div>
      </div>

      <div class="stat-card">
        <h3>Kategorilere göre dağılım</h3>
        ${categoryHtml}
      </div>
    `;
  } catch (err) {
    console.error('loadMyStats error:', err);
    myStatsEl.innerHTML =
      '<p class="small">İstatistikler yüklenirken bir hata oluştu.</p>';
  }
}


  // Benim istatistiklerim kartı
  async function loadMyStats() {
    if (!myStatsEl || !authToken) return;

    myStatsEl.innerHTML =
      '<p class="small subtle">İstatistikler yükleniyor...</p>';

    try {
      const data = await api.get('/api/stats/me', authToken);

      const total = data.total || 0;
      const resolved = data.resolved || 0;
      const correct = data.correct || 0;
      const incorrect = data.incorrect || 0;
      const accuracy =
        data.accuracy !== undefined && data.accuracy !== null
          ? data.accuracy
          : 0;
      const categories = data.categories || [];

      let html = `
        <div class="stats-overview">
          <div class="stat-card stat-card-primary">
            <div class="stat-label">Toplam tahmin</div>
            <div class="stat-value">${total}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Çözülen</div>
            <div class="stat-value">${resolved}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Doğru</div>
            <div class="stat-value">${correct}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Başarı oranı</div>
            <div class="stat-value">%${accuracy}</div>
          </div>
        </div>
      `;

      if (categories.length) {
        html += `
          <div class="stats-categories">
            <h3 class="small-heading">Kategorilere göre performans</h3>
            <table class="stats-category-table">
              <thead>
                <tr>
                  <th>Kategori</th>
                  <th>Toplam</th>
                  <th>Çözülen</th>
                  <th>Doğru</th>
                  <th>Yanlış</th>
                  <th>Başarı</th>
                </tr>
              </thead>
              <tbody>
        `;

        categories.forEach((c) => {
          html += `
            <tr>
              <td>${escapeHtml(c.label || c.key || '')}</td>
              <td>${c.total || 0}</td>
              <td>${c.resolved || 0}</td>
              <td>${c.correct || 0}</td>
              <td>${c.incorrect || 0}</td>
              <td>%${c.accuracy ?? 0}</td>
            </tr>
          `;
        });

        html += `
              </tbody>
            </table>
          </div>
        `;
      } else {
        html += `
          <p class="small subtle">
            Henüz istatistik oluşacak kadar tahmin yok.
          </p>
        `;
      }

      myStatsEl.innerHTML = html;
    } catch (err) {
      console.error('loadMyStats error:', err);
      myStatsEl.innerHTML =
        '<p class="small">İstatistikler yüklenirken bir hata oluştu.</p>';
    }
  }


async function loadLeaderboard() {
  if (!leaderboardBodyEl || !authToken) return;

  leaderboardBodyEl.innerHTML =
    '<p class="small subtle">Liderlik tablosu yükleniyor...</p>';

  try {
    const params = new URLSearchParams();
    if (leaderboardCategoryEl && leaderboardCategoryEl.value) {
      params.set('category', leaderboardCategoryEl.value);
    }
    if (leaderboardMinResolvedEl && leaderboardMinResolvedEl.value) {
      params.set('minResolved', String(leaderboardMinResolvedEl.value));
    }

    const qs = params.toString();
    const url = qs ? `/api/leaderboard?${qs}` : '/api/leaderboard';

    const data = await api.get(url, authToken);
    const items = data.data || data || [];

    if (!items.length) {
      leaderboardBodyEl.innerHTML =
        '<p class="small subtle">Bu kriterlerle eşleşen kullanıcı yok.</p>';
      return;
    }

    let html = `
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Kullanıcı</th>
            <th>Çözülen</th>
            <th>Doğru</th>
            <th>Başarı</th>
          </tr>
        </thead>
        <tbody>
    `;

    items.forEach((row, index) => {
      html += `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(row.username || '')}</td>
          <td style="text-align:right;">${row.resolvedCount || 0}</td>
          <td style="text-align:right;">${row.correctCount || 0}</td>
          <td style="text-align:right;">${row.accuracy ?? 0}%</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    leaderboardBodyEl.innerHTML = html;
  } catch (err) {
    console.error('loadLeaderboard error:', err);
    leaderboardBodyEl.innerHTML =
      '<p class="small">Liderlik tablosu yüklenirken bir hata oluştu.</p>';
  }
}
  if (leaderboardRefreshBtn) {
    leaderboardRefreshBtn.addEventListener('click', () => {
      loadLeaderboard();
    });
  }

async function loadCommentsForPrediction(predictionId) {
  if (!commentsListEl) return;

  if (!authToken || !predictionId) {
    commentsListEl.innerHTML =
      '<p class="small">Bu tahmine henüz yorum yapılmamış.</p>';
    currentComments = [];
    return;
  }

  try {
    const data = await api.get(
      `/api/predictions/${predictionId}/comments`,
      authToken
    );
    const items = data.items || [];
    currentComments = items;

    if (!items.length) {
      commentsListEl.innerHTML =
        '<p class="small">Bu tahmine henüz yorum yapılmamış.</p>';
      return;
    }

    const html = items
      .map((c) => {
        const userName = escapeHtml(c.user?.username || 'Bilinmiyor');
        const created = fmtDate(c.createdAt);
        const content = escapeHtml(c.content || '').replace(/\n/g, '<br/>');

        const cu = currentUser;
        const commentUserId =
          (c.user && (c.user.id || c.user.userId || c.user._id)) || null;
        const currentUserId =
          (cu && (cu.id || cu.userId || cu._id)) || null;

        const isMine =
          !!(commentUserId && currentUserId && commentUserId === currentUserId);
        const alreadyPromoted = !!c.childPredictionId;

        const promoteButton =
          isMine && !alreadyPromoted
            ? `<button class="comment-promote-btn" data-comment-id="${c.id}">Bu yorumdan tahmin oluştur</button>`
            : '';

        const badge = alreadyPromoted
          ? `<span class="comment-badge">Tahmine dönüştürüldü</span>`
          : '';

        return `
          <div class="comment-item">
            <div class="comment-header">
              <span class="comment-user">${userName}</span>
              ${created ? `<span class="comment-date">${created}</span>` : ''}
            </div>
            <div class="comment-content">${content}</div>
            <div class="comment-footer">
              ${badge}
              ${promoteButton}
            </div>
          </div>
        `;
      })
      .join('');

    commentsListEl.innerHTML = html;

    const buttons = commentsListEl.querySelectorAll('.comment-promote-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-comment-id');
        const comment = currentComments.find((c) => c.id === id);
        if (!comment) return;
        prefillPredictionFormFromComment(comment);
      });
    });
  } catch (err) {
    console.error('loadCommentsForPrediction error:', err);
    commentsListEl.innerHTML =
      '<p class="small">Yorumlar yüklenirken bir hata oluştu.</p>';
    currentComments = [];
  }
}

async function loadPredictionDetail(predictionId) {
  if (!predictionDetailEl) return;

  // Hangi tahminin seçili olduğunu globalde tut
  selectedPredictionId = predictionId;

  if (!authToken) {
    resetDetailPanel();
    return;
  }
  if (!predictionId) {
    resetDetailPanel();
    return;
  }

  try {
    const data = await api.get(
      `/api/predictions/${encodeURIComponent(predictionId)}`,
      authToken
    );

    if (!data || data.error) {
      predictionDetailEl.innerHTML =
        '<p class="small">Detay bulunamadı.</p>';
      if (commentsListEl) {
        commentsListEl.innerHTML =
          '<p class="small">Yorumlar yüklenemedi.</p>';
      }
      selectedPredictionId = null;
      return;
    }

    const rawStatus = data.status || 'pending';
    const statusLabel =
      rawStatus === 'correct'
        ? 'Doğru'
        : rawStatus === 'incorrect'
        ? 'Yanlış'
        : 'Beklemede';

    const statusClass =
      rawStatus === 'correct'
        ? 'status-correct'
        : rawStatus === 'incorrect'
        ? 'status-incorrect'
        : 'status-pending';

    const ownerName = escapeHtml(data.user?.username || 'Bilinmiyor');
    const cat = escapeHtml(data.category || '');
    const tDate = fmtDate(data.targetDate);
    const created = fmtDate(data.createdAt);
    const resolved = fmtDate(data.resolvedAt);

    const isLocked = !!data.isLocked;

    const titleText = isLocked
      ? 'Mühürlü tahmin'
      : escapeHtml(data.title || '(Başlık yok)');

    const bodyHtml = isLocked
      ? '<p class="prediction-lock-note small">İçerik hedef tarih gelene kadar tamamen gizli.</p>'
      : `<p class="prediction-body">${escapeHtml(data.content || '')
          .replace(/\n/g, '<br/>')}</p>`;

    const likesCount = data.likesCount ?? 0;
    const liked = !!data.liked;

    let statusInfo = '';
    if (rawStatus === 'correct') {
      statusInfo = resolved
        ? `Bu tahmin ${resolved} tarihinde <strong>Doğru</strong> olarak işaretlendi.`
        : 'Bu tahmin <strong>Doğru</strong> olarak işaretlendi.';
    } else if (rawStatus === 'incorrect') {
      statusInfo = resolved
        ? `Bu tahmin ${resolved} tarihinde <strong>Yanlış</strong> olarak işaretlendi.`
        : 'Bu tahmin <strong>Yanlış</strong> olarak işaretlendi.';
    } else {
      statusInfo = tDate
        ? `Bu tahmin ${tDate} tarihine kadar beklemede.`
        : 'Bu tahmin şu anda beklemede.';
    }

    predictionDetailEl.innerHTML = `
      <div class="prediction-detail-card feed-item" data-id="${data.id}">
        <div class="prediction-detail-header">
          <div class="prediction-user">
            <div class="avatar-circle">
              ${ownerName.charAt(0).toUpperCase()}
            </div>
            <div class="prediction-user-meta">
              <div class="prediction-username">${ownerName}</div>
              <div class="prediction-meta small">
                <span>${cat}</span>
                ${tDate ? `<span>· Açılma: ${tDate}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="prediction-status-pill ${statusClass}">
            ${statusLabel}
          </div>
        </div>

        <div class="prediction-detail-body">
          <h3 class="prediction-title">${titleText}</h3>
          ${bodyHtml}
        </div>

        <div class="prediction-meta-row small">
          ${created ? `<span>Oluşturma: ${created}</span>` : ''}
          ${resolved ? `<span>Çözülme: ${resolved}</span>` : ''}
        </div>

        <div class="prediction-detail-footer">
          <span class="small subtle">${statusInfo}</span>
          <button
            type="button"
            class="like-pill ${liked ? 'liked' : ''}"
            data-id="${data.id}"
          >
            <span class="like-icon">👍</span>
            <span class="like-count">${likesCount}</span>
          </button>
        </div>
      </div>
    `;

    // Detay geldiği anda ilgili tahminin yorumlarını da yükle
    if (typeof loadCommentsForPrediction === 'function') {
      await loadCommentsForPrediction(predictionId);
    }
  } catch (err) {
    console.error('Prediction detail error:', err);
    predictionDetailEl.innerHTML =
      '<p class="small">Detay yüklenirken bir hata oluştu.</p>';

    if (commentsListEl) {
      commentsListEl.innerHTML =
        '<p class="small">Yorumlar yüklenemedi.</p>';
    }
    selectedPredictionId = null;
  }
}


// Takip ettiklerim listesini yükler
  async function loadFollowing() {
  if (!followingListEl || !authToken) return;

  try {
    const data = await api.get('/api/follow/following', authToken);

    // Backend: { userId, username, count, following: [...] }
    const items = data.following || data.data || [];

    if (!items.length) {
      followingListEl.innerHTML =
        '<p class="small subtle">Henüz kimseyi takip etmiyorsunuz.</p>';
      return;
    }

    followingListEl.innerHTML = '';

    items.forEach((u) => {
      const li = document.createElement('div');
      li.className = 'feed-item';

      // Takip tarihi ya da varsa joinedAt
      const dateText = u.followedAt || u.joinedAt || '';

      li.innerHTML = `
        <div class="feed-header">
          <button
            class="user-link"
            data-user-id="${escapeHtml(u.id)}"
            style="background:none;border:none;color:#8ab4f8;cursor:pointer;padding:0"
          >
            ${escapeHtml(u.username || '')}
          </button>
          <span class="feed-date">${escapeHtml(dateText || '')}</span>
        </div>
        <div class="small">Takip ediliyor</div>
      `;

      followingListEl.appendChild(li);
    });
  } catch (err) {
    console.error('loadFollowing error:', err);
    followingListEl.innerHTML =
      '<p class="small">Takip listesi yüklenemedi.</p>';
  }
}


// Kullanıcı keşfet listesi
async function loadExploreUsers() {
  if (!exploreUsersEl || !authToken) return;

  try {
    const data = await api.get('/api/users/explore', authToken);
    const items = data.data || [];

    if (!items.length) {
      exploreUsersEl.innerHTML =
        '<p class="small">Görüntülenecek kullanıcı bulunamadı.</p>';
      return;
    }

    exploreUsersEl.innerHTML = '';
    items.forEach((u) => {
      const div = document.createElement('div');
      div.className = 'feed-item';

      const followLabel = u.isFollowing ? 'Takibi bırak' : 'Takip et';
      const followingAttr = u.isFollowing ? 'true' : 'false';

      div.innerHTML = `
        <div class="feed-header">
          <button class="user-link" data-user-id="${escapeHtml(u.id)}"
            style="background:none;border:none;color:#8ab4f8;cursor:pointer;padding:0">
            ${escapeHtml(u.username)}
          </button>
          <button
            class="btn btn-small explore-follow-btn"
            data-user-id="${escapeHtml(u.id)}"
            data-following="${followingAttr}"
            style="margin-left:auto"
          >
            ${followLabel}
          </button>
        </div>
        <div class="small">Katılım: ${escapeHtml(u.joinedAt || '')}</div>
      `;

      exploreUsersEl.appendChild(div);
    });
  } catch (err) {
    console.error('loadExploreUsers error:', err);
    exploreUsersEl.innerHTML =
      '<p class="small">Kullanıcı listesi yüklenemedi.</p>';
  }
}

// Belirli kullanıcının profilini ve tahminlerini yükler
function updateUserInUrl(userId) {
  try {
    const url = new URL(window.location.href);
    if (userId) {
      url.searchParams.set('user', userId);
    } else {
      url.searchParams.delete('user');
    }
    window.history.replaceState({}, '', url.toString());
  } catch (err) {
    console.error('updateUserInUrl error:', err);
  }
}

async function loadUserProfile(userId) {
    try {
        // Önce profil bilgisini al
    const prof = await api.get(
      `/api/users/${encodeURIComponent(userId)}`,
      authToken
    );

    const u = prof.user;
    const stats = prof.stats || {};
    const items = prof.predictions || [];

    // Kategori bazlı istatistikler: ayrı try-catch, hata olsa bile profili göster.
    let categoryStats = [];
    try {
      const statsRes = await api.get(
        `/api/stats/user/${encodeURIComponent(userId)}`,
        authToken
      );
      categoryStats = (statsRes && statsRes.categories) || [];
    } catch (err) {
      console.error('loadUserProfile stats error:', err);
      // Hata durumunda sadece istatistikler boş kalır, profil yine görünür
      categoryStats = [];
    }


    // Profil üst bilgileri
    if (profileDetailsEl) {
      profileDetailsEl.innerHTML = `
        <div><strong>${escapeHtml(u.username)}</strong></div>
        <div class="small">Katılım: ${escapeHtml(u.joinedAt || '')}</div>
        <div class="small">
          Toplam: ${stats.total || 0}
          · Çözülen: ${stats.resolved || 0}
          · Doğru: ${stats.correct || 0}
          · Yanlış: ${stats.incorrect || 0}
          · Başarı: ${stats.accuracy || 0}%
        </div>
      `;
    }
        if (profileCategoryStatsEl) {
      if (!categoryStats.length) {
        profileCategoryStatsEl.innerHTML =
          '<p class="small subtle">Bu kullanıcı için kategori bazlı istatistik yok.</p>';
      } else {
        let html = `
          <h4 style="margin-top:4px; margin-bottom:4px;">Kategorilere göre performans</h4>
          <table class="profile-category-table">
            <thead>
              <tr>
                <th>Kategori</th>
                <th>Toplam</th>
                <th>Çözülen</th>
                <th>Doğru</th>
                <th>Yanlış</th>
                <th>Başarı</th>
              </tr>
            </thead>
            <tbody>
        `;

        categoryStats.forEach((c) => {
          html += `
            <tr>
              <td>${escapeHtml(c.label || c.key || '')}</td>
              <td style="text-align:right;">${c.total || 0}</td>
              <td style="text-align:right;">${c.resolved || 0}</td>
              <td style="text-align:right;">${c.correct || 0}</td>
              <td style="text-align:right;">${c.incorrect || 0}</td>
              <td style="text-align:right;">${(c.accuracy ?? 0)}%</td>
            </tr>
          `;
        });

        html += `
            </tbody>
          </table>
        `;

        profileCategoryStatsEl.innerHTML = html;
      }
    }

    // Takip et / bırak butonu
    if (profileFollowBtn) {
      profileFollowBtn.dataset.userId = u.id;
      // backend'den isSelf ve isFollowing geliyor
      if (prof.isSelf) {
        // Kendi profilimiz -> buton gizli
        profileFollowBtn.style.display = 'none';
        profileFollowBtn.dataset.following = '';
      } else {
        profileFollowBtn.style.display = 'inline-block';
        profileFollowBtn.dataset.following = prof.isFollowing ? 'true' : 'false';
        profileFollowBtn.textContent = prof.isFollowing ? 'Takibi bırak' : 'Takip et';
      }
    }

        // Tahmin listesi
    if (profilePredictionsEl) {
      if (!items.length) {
        profilePredictionsEl.innerHTML =
          '<p class="small subtle">Bu kullanıcının henüz tahmini yok.</p>';
      } else {
        profilePredictionsEl.innerHTML = '';
        items.forEach((p) => {
          const div = document.createElement('div');
          div.className = 'feed-item';
          div.dataset.id = p.id; // detayı açmak için
          div.style.cursor = 'pointer';

          const cat = escapeHtml(p.category || '');
          const tDate = fmtDate(p.targetDate);
          const created = fmtDate(p.createdAt);

          const rawStatus = p.status || 'pending';
          const statusLabel =
            rawStatus === 'correct'
              ? 'Doğru'
              : rawStatus === 'incorrect'
              ? 'Yanlış'
              : 'Beklemede';

          const statusClass =
            rawStatus === 'correct'
              ? 'status-correct'
              : rawStatus === 'incorrect'
              ? 'status-incorrect'
              : 'status-pending';

          const isLocked = !!p.isLocked;
          const titleText = escapeHtml(
            p.title || (isLocked ? 'Mühürlü tahmin' : '(Başlık yok)')
          );
          const contentHtml = isLocked
            ? '<span class="small subtle">İçerik hedef tarih gelene kadar gizli.</span>'
            : escapeHtml(p.content || '').replace(/\n/g, '<br/>');

          const metaText = created
            ? `Oluşturma: ${created} · Açılma: ${tDate}`
            : `Açılma: ${tDate}`;

          const likesCount = p.likesCount ?? 0;
          const liked = !!p.liked;

          div.innerHTML = `
            <div class="feed-header">
              <span class="feed-category">${cat}</span>
              <span class="feed-date">${tDate}</span>
            </div>
            <div class="feed-content">
              <strong>${isLocked ? '🔒 ' : ''}${titleText}</strong>
              <div>${contentHtml}</div>
            </div>
            <div class="feed-footer">
              <span class="small subtle">
                ${metaText}
              </span>
              <div class="feed-footer-right">
                <span class="prediction-status-pill ${statusClass}">
                  ${statusLabel}
                </span>
                <button
                  type="button"
                  class="like-pill ${liked ? 'liked' : ''}"
                  data-id="${p.id}"
                >
                  <span class="like-icon">👍</span>
                  <span class="like-count">${likesCount}</span>
                </button>
              </div>
            </div>
          `;

          profilePredictionsEl.appendChild(div);
        });
      }
    }

  } catch (err) {
    console.error('loadUserProfile error:', err);
    if (profileDetailsEl) {
      profileDetailsEl.innerHTML =
        '<p class="small">Profil yüklenemedi.</p>';
    }
    if (profilePredictionsEl) {
      profilePredictionsEl.innerHTML = '';
    }
  }
}




  // =========================
  // 7) AUTH (register / login / logout)
  // =========================

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      // formdan mümkün olduğunca esnek oku:
      const inputs = registerForm.querySelectorAll('input');
      // beklenen sırayla: username, email, password
      const username = inputs[0]?.value?.trim();
      const email = inputs[1]?.value?.trim();
      const password = inputs[2]?.value || '';

      if (!username || !email || !password) {
        alert('Kullanıcı adı, e-posta ve şifre gerekli.');
        return;
      }
      try {
        await api.post('/api/auth/register', { username, email, password });
        alert('Kayıt başarılı. Şimdi giriş yapabilirsiniz.');
        registerForm.reset();
      } catch (err) {
        alert(err.message || 'Kayıt başarısız.');
      }
    });
  }

  if (profilePredictionsEl) {
    profilePredictionsEl.addEventListener('click', (e) => {
    const item = e.target.closest('.feed-item');
    if (!item) return;

    const id = item.dataset.id;
    if (!id) return;

    loadPredictionDetail(id);
  });
  }


  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const inputs = loginForm.querySelectorAll('input');
      // beklenen: [identifier(text), password(password)]
      const identifier = inputs[0]?.value?.trim();
      const password = inputs[inputs.length - 1]?.value || '';

      if (!identifier || !password) {
        alert('Kullanıcı adı/e-posta ve şifre gerekli.');
        return;
      }

      try {
        const data = await api.post('/api/auth/login', {
          emailOrUsername: identifier,
          password,
        });
        // beklenen: { token, user: { id, username } }
        setToken(data.token);
        currentUser = data.user || null;
        setUserInfoText();
        resetDetailPanel();

        // başarılı login -> verileri yükle
        await Promise.all([loadFeed(), loadMyPredictions({})]);
        alert('Giriş başarılı.');
      } catch (err) {
        alert(err.message || 'Giriş başarısız.');
      }
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      setToken('');
      currentUser = null;
      setUserInfoText();
      resetDetailPanel();
      // ekranları temizle
      if (feedListEl) feedListEl.innerHTML = '';
      if (myPredictionsListEl) myPredictionsListEl.innerHTML = '';
      alert('Çıkış yapıldı.');
    });
  }

  // Detay kartındaki like butonu
    if (predictionDetailEl) {
    predictionDetailEl.addEventListener('click', (e) => {
    const likeBtn = e.target.closest('.like-pill');
    if (likeBtn) {
      e.stopPropagation();
      handleLikeToggle(likeBtn);
    }
  });
}

    // 8) TAHMİN OLUŞTURMA
  // =========================

  if (predictionForm) {
    predictionForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Önce önceki hata durumlarını temizle
      if (predictionMessageEl) {
        predictionMessageEl.textContent = '';
        predictionMessageEl.className = 'message';
      }

      [
        predictionTitleEl,
        predictionContentEl,
        predictionDateEl,
        categorySelectEl,
      ].forEach((el) => {
        if (el) el.classList.remove('input-error');
      });

      if (!authToken) {
        if (predictionMessageEl) {
          predictionMessageEl.textContent =
            'Tahmin göndermek için önce giriş yapın.';
          predictionMessageEl.className = 'message error';
        }
        return;
      }

      const title = predictionTitleEl?.value?.trim() || '';
      const content = predictionContentEl?.value?.trim() || '';
      const targetDate = predictionDateEl?.value || '';
      const category = categorySelectEl?.value || '';

      const missingFields = [];

      if (!title) {
        missingFields.push('Başlık');
        predictionTitleEl?.classList.add('input-error');
      }
      if (!content) {
        missingFields.push('Tahmin');
        predictionContentEl?.classList.add('input-error');
      }
      if (!targetDate) {
        missingFields.push('Açılma tarihi');
        predictionDateEl?.classList.add('input-error');
      }
      if (!category) {
        missingFields.push('Kategori');
        categorySelectEl?.classList.add('input-error');
      }

      if (missingFields.length > 0) {
        if (predictionMessageEl) {
          predictionMessageEl.textContent =
            'Lütfen şu alanları doldurun: ' + missingFields.join(', ');
          predictionMessageEl.className = 'message error';
        }
        return;
      }

      // Tarih bugün veya gelecek olmalı (UX tarafında da kontrol edelim)
      const todayStr = new Date().toISOString().split('T')[0];
      if (targetDate < todayStr) {
        predictionDateEl?.classList.add('input-error');
        if (predictionMessageEl) {
          predictionMessageEl.textContent =
            'Açılma tarihi bugünden eski olamaz.';
          predictionMessageEl.className = 'message error';
        }
        return;
      }

      // Aynı anda birden fazla gönderimi engelle
      if (predictionForm.dataset.submitting === '1') {
        return;
      }
      predictionForm.dataset.submitting = '1';
      if (predictionSubmitBtn) {
        predictionSubmitBtn.disabled = true;
        predictionSubmitBtn.textContent = 'Gönderiliyor...';
      }

      try {
        const body = { title, content, targetDate, category };

        if (activeSourceCommentId) {
          body.sourceCommentId = activeSourceCommentId;
        }

        await api.post('/api/predictions', body, authToken);

        // başarı sonrası:
        predictionForm.reset();
        activeSourceCommentId = null;

        if (predictionFromCommentHintEl) {
          predictionFromCommentHintEl.textContent = '';
        }

        if (predictionMessageEl) {
          const niceDate = targetDate;
          predictionMessageEl.textContent =
            niceDate
              ? `Tahminin ${niceDate} tarihine kadar mühürlendi. 🎉`
              : 'Tahminin mühürlendi. 🎉';
          predictionMessageEl.className = 'message success';
        }

        // Feed ve "Benim tahminlerim"i tazele
        await Promise.all([loadFeed(), loadMyPredictions({})]);

        // Eğer sağda bir tahmin detayı açıksa ve bu tahminle ilgiliyse, yorumları yenile
        if (
          selectedPredictionId &&
          typeof loadCommentsForPrediction === 'function'
        ) {
          await loadCommentsForPrediction(selectedPredictionId);
        }
      } catch (err) {
        console.error('create prediction error:', err);
        if (predictionMessageEl) {
          predictionMessageEl.textContent =
            err?.message || 'Tahmin oluşturulamadı.';
          predictionMessageEl.className = 'message error';
        }
      } finally {
        predictionForm.dataset.submitting = '0';
        if (predictionSubmitBtn) {
          predictionSubmitBtn.disabled = false;
          predictionSubmitBtn.textContent = 'Tahmini mühürle';
        }
      }
    });
  }

  // =========================

  // =========================
  // 9) YORUM FORMU
  // =========================

  if (commentForm) {
    commentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation(); // aynı elemana eklenmiş diğer submit listener'larını da durdurur

      // Önce önceki mesaj ve hata sınıflarını temizle
      if (commentMessageEl) {
        commentMessageEl.textContent = '';
        commentMessageEl.className = 'message';
      }
      if (commentContentEl) {
        commentContentEl.classList.remove('input-error');
      }

      // Aynı anda ikinci kez tetiklenmeyi engelle (çift tıklama vs.)
      if (commentForm.dataset.submitting === '1') {
        return;
      }

      if (!authToken) {
        if (commentMessageEl) {
          commentMessageEl.textContent =
            'Yorum eklemek için önce giriş yapın.';
          commentMessageEl.className = 'message error';
        }
        return;
      }

      if (!selectedPredictionId) {
        if (commentMessageEl) {
          commentMessageEl.textContent = 'Önce bir tahmin seçin.';
          commentMessageEl.className = 'message error';
        }
        return;
      }

      const content = (commentContentEl?.value || '').trim();
      if (!content) {
        if (commentMessageEl) {
          commentMessageEl.textContent = 'Yorum boş olamaz.';
          commentMessageEl.className = 'message error';
        }
        if (commentContentEl) {
          commentContentEl.classList.add('input-error');
          commentContentEl.focus();
        }
        return;
      }

      // Artık gerçekten gönderiyoruz
      commentForm.dataset.submitting = '1';
      if (commentSubmitBtn) {
        commentSubmitBtn.disabled = true;
        commentSubmitBtn.textContent = 'Gönderiliyor...';
      }

      try {
        await api.post(
          `/api/predictions/${encodeURIComponent(
            selectedPredictionId
          )}/comments`,
          { content },
          authToken
        );

        if (commentMessageEl) {
          commentMessageEl.textContent = 'Yorum eklendi.';
          commentMessageEl.className = 'message success';
        }
        if (commentContentEl) {
          commentContentEl.value = '';
          commentContentEl.classList.remove('input-error');
        }

        await loadCommentsForPrediction(selectedPredictionId);
      } catch (err) {
        console.error('comment submit error:', err);
        if (commentMessageEl) {
          commentMessageEl.textContent =
            err.message || 'Yorum eklenirken bir hata oluştu.';
          commentMessageEl.className = 'message error';
        }
      } finally {
        commentForm.dataset.submitting = '0';
        if (commentSubmitBtn) {
          commentSubmitBtn.disabled = false;
          commentSubmitBtn.textContent = 'Yorum ekle';
        }
      }
    });
  }

  // =========================

  // 10) BENİM TAHMİNLERİM FİLTRELERİ

  // =========================

  if (myPredictionsFilterCategoryEl) {
    myPredictionsFilterCategoryEl.addEventListener('change', () => {
      const category = myPredictionsFilterCategoryEl.value || undefined;
      const status = myPredictionsFilterStatusEl ? myPredictionsFilterStatusEl.value || undefined : undefined;
      loadMyPredictions({ category, status });
    });
  }

  if (myPredictionsFilterStatusEl) {
    myPredictionsFilterStatusEl.addEventListener('change', () => {
      const category = myPredictionsFilterCategoryEl ? myPredictionsFilterCategoryEl.value || undefined : undefined;
      const status = myPredictionsFilterStatusEl.value || undefined;
      loadMyPredictions({ category, status });
    });
  }

  if (myPredictionsClearFiltersBtn) {
    myPredictionsClearFiltersBtn.addEventListener('click', () => {
      if (myPredictionsFilterCategoryEl) myPredictionsFilterCategoryEl.value = '';
      if (myPredictionsFilterStatusEl) myPredictionsFilterStatusEl.value = '';
      loadMyPredictions({});
    });
  }

  if (myPredictionsListEl) {
  myPredictionsListEl.addEventListener('click', (e) => {
    const likeBtn = e.target.closest('.like-pill');
    if (likeBtn) {
      e.stopPropagation();
      handleLikeToggle(likeBtn);
      return;
    }
    const item = e.target.closest('.feed-item');
    if (!item) return;
    const id = item.dataset.id;
    if (!id) return;
    loadPredictionDetail(id);
    });if (profileFollowBtn) {
    profileFollowBtn.addEventListener('click', async () => {
    if (!authToken) return;
    const uid = profileFollowBtn.dataset.userId;
    if (!uid) return;

    try {
      if (profileFollowBtn.textContent.includes('bırak')) {
        await api.del(`/api/follow/${encodeURIComponent(uid)}`, authToken);
      } else {
        await api.post(`/api/follow/${encodeURIComponent(uid)}`, {}, authToken);
      }
      await Promise.all([loadUserProfile(uid), loadFollowing()]);
    } catch (err) {
      alert(err.message || 'İşlem başarısız.');
    }
  });
  }

  if (followingListEl) {
    followingListEl.addEventListener('click', (e) => {
      const userLink = e.target.closest('.user-link');
  if (!userLink) return;

    const userId = userLink.dataset.userId;
  if (userId) {
  updateUserInUrl(userId);
  loadUserProfile(userId);
  }
    });
  }

  // İstatistik satırına tıklayınca "Benim tahminlerim"i o kategoriye göre filtrele
if (myStatsEl) {
  myStatsEl.addEventListener('click', (e) => {
    const row = e.target.closest('.my-stats-row');
    if (!row || !myPredictionsFilterCategoryEl) return;

    const key = row.dataset.categoryKey || '';

    // Filtre dropdown'unu ayarla
    myPredictionsFilterCategoryEl.value = key || '';

    // Statü filtresi neyse onu koruyarak tahminleri yeniden yükle
    const status = myPredictionsFilterStatusEl
      ? myPredictionsFilterStatusEl.value || ''
      : '';

    loadMyPredictions({
      category: key || undefined,
      status: status || undefined,
    });
  });
}

  if (feedListEl) {
  feedListEl.addEventListener('click', (e) => {
    // Önce like butonu mu diye bak
    const likeBtn = e.target.closest('.like-pill');
    if (likeBtn) {
      e.stopPropagation();
      handleLikeToggle(likeBtn);
      return;
    }

    // Kullanıcı adına tıklanırsa profil
    const userLink = e.target.closest('.user-link');
    if (userLink) {
      const uid = userLink.dataset.userId;
      if (uid) {
        updateUserInUrl(uid);
        loadUserProfile(uid);
      }
      return;
    }

    // Kartın herhangi bir yerine tıklanırsa detay
    const item = e.target.closest('.feed-item');
    if (!item) return;
    const id = item.dataset.id;
    if (!id) return;
    loadPredictionDetail(id);
  });
}

  if (profileFollowBtn) {
  profileFollowBtn.addEventListener('click', async () => {
    if (!authToken) return;

    const userId = profileFollowBtn.dataset.userId;
    const isFollowing = profileFollowBtn.dataset.following === 'true';
    if (!userId) return;

    try {
      if (isFollowing) {
        // Takibi bırak
        await api.del(`/api/follow/${encodeURIComponent(userId)}`, authToken);
      } else {
        // Takip et
        await api.post(`/api/follow/${encodeURIComponent(userId)}`, {}, authToken);
      }

      // Profil ve takip listesi tazelensin
      await Promise.all([
        loadUserProfile(userId),
        typeof loadFollowing === 'function' ? loadFollowing() : Promise.resolve(),
      ]);
    } catch (err) {
      console.error('profileFollowBtn error:', err);
      alert(err.message || 'İşlem başarısız.');
    }
  });
  }

  if (exploreUsersEl) {
  exploreUsersEl.addEventListener('click', async (e) => {
  if (!authToken) return;

    const userLink = e.target.closest('.user-link');
  if (userLink) {
    const uid = userLink.dataset.userId;
  if (uid) {
    updateUserInUrl(uid);
    await loadUserProfile(uid);
  }
  return;
  }


    const followBtn = e.target.closest('.explore-follow-btn');
    if (!followBtn) return;

    const userId = followBtn.dataset.userId;
    const isFollowing = followBtn.dataset.following === 'true';
    if (!userId) return;

    try {
      if (isFollowing) {
        // Takibi bırak
        await api.del(`/api/follow/${encodeURIComponent(userId)}`, authToken);
      } else {
        // Takip et
        await api.post(`/api/follow/${encodeURIComponent(userId)}`, {}, authToken);
      }

      // Listeyi, takip ettiklerimi ve profili tazele
      await Promise.all([
        loadExploreUsers(),
        loadFollowing(),
        loadUserProfile(userId),
      ]);
    } catch (err) {
      console.error('explore follow error:', err);
      alert(err.message || 'İşlem başarısız.');
    }
  });
  }


  }

  // =========================
  // 11) DM (opsiyonel / varsa)
  // =========================

  if (dmForm && dmMessageInputEl) {
    dmForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!authToken) return;
      const text = dmMessageInputEl.value.trim();
      if (!text) return;
      try {
        // Not: projendeki endpoint farklıysa değiştir.
        await api.post('/api/messages/send', { content: text }, authToken);
        dmMessageInputEl.value = '';
        // mesaj listesini yenilemek istersen burada çağır.
      } catch (err) {
        alert(err.message || 'Mesaj gönderilemedi.');
      }
    });
  }

  // =========================
  // 12) İLK YÜKLEME
  // =========================

  (async function boot() {
    setUserInfoText();
    resetDetailPanel();
    await loadCategories();

  if (authToken) {
  await loadMeLight();
  await Promise.all([
    loadFeed(),
    loadMyPredictions({}),
    loadFollowing(),
    loadExploreUsers(),
    loadMyStats(),
    loadLeaderboard(),
  ]);

  // URL'de user parametresi varsa profili otomatik yükle
  try {
    const url = new URL(window.location.href);
    const userIdFromUrl = url.searchParams.get('user');
    if (userIdFromUrl) {
      await loadUserProfile(userIdFromUrl);
    }
  } catch (err) {
    console.error('read user from url error:', err);
  }
}

  })();
})();
// Basit tab navigasyonu
document.addEventListener('DOMContentLoaded', () => {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');

  if (!tabButtons.length) return;

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');

      tabButtons.forEach((b) => b.classList.remove('is-active'));
      tabPanels.forEach((panel) => panel.classList.remove('is-active'));

      btn.classList.add('is-active');
      const panel = document.getElementById(`tab-${target}`);
      if (panel) {
        panel.classList.add('is-active');
      }
    });
  });
});
