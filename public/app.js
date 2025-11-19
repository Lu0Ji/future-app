
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

  // =========================
  // 1) GLOBAL DURUM
  // =========================

  let authToken = localStorage.getItem('token') || '';
  let currentUser = null; // {id, username} dolacak

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

  // Feed
  const feedListEl = document.getElementById('feed-list');

  // Benim tahminlerim + filtreler
  const myPredictionsListEl = document.getElementById('my-predictions-list');
  const myPredictionsFilterCategoryEl = document.getElementById('my-predictions-filter-category');
  const myPredictionsFilterStatusEl = document.getElementById('my-predictions-filter-status');
  const myPredictionsClearFiltersBtn = document.getElementById('my-predictions-clear-filters');
  const myStatsEl = document.getElementById('my-stats');


  // Detay paneli
  const predictionDetailEl = document.getElementById('prediction-detail');

  // Profil / DM (varsa çalışır)
  const profileDetailsEl = document.getElementById('profile-details');
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
    if (predictionDetailEl) {
      predictionDetailEl.innerHTML =
        '<p class="small">Bir tahmine tıklayarak detayını burada görebilirsiniz.</p>';
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
  // 4.5) TAKİP ETTİKLERİM
  // =========================

  

  // =========================
  // 5) FEED
  // =========================

  async function loadFeed() {
  if (!feedListEl) return;

  if (!authToken) {
    feedListEl.innerHTML = '<p class="small">Feed\'i görmek için giriş yapın.</p>';
    return;
  }

  try {
    const res = await fetch('/api/feed', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Feed yüklenemedi.');
    }

    const items = data.data || [];

    feedListEl.innerHTML = '';

    if (items.length === 0) {
      feedListEl.innerHTML = '<p class="small">Henüz tahmin yok.</p>';
      return;
    }

    items.forEach((p) => {
      const div = document.createElement('div');
      div.className = 'feed-item';

      // HTML iskelet
      div.innerHTML = `
        <div class="feed-header">
          <div class="feed-avatar"></div>
          <div class="feed-main">
            <div class="feed-top-row">
              <button class="user-link feed-user"></button>
              <span class="feed-category"></span>
              <span class="feed-date"></span>
            </div>
            <div class="feed-title-row">
              <span class="feed-title"></span>
              <span class="status-badge"></span>
            </div>
          </div>
        </div>
        <div class="feed-content"></div>
      `;

      // Verileri hazırla
      const username = p.username || 'Anon';
      const avatarLetter = username.charAt(0).toUpperCase();
      const title =
        p.title && p.title.trim().length > 0 ? p.title : '(Başlık yok)';

      const statusInfo =
        p.status === 'correct'
          ? { label: 'Doğru', className: 'status-correct' }
          : p.status === 'incorrect'
          ? { label: 'Yanlış', className: 'status-incorrect' }
          : { label: 'Bekliyor', className: 'status-pending' };

      // DOM referanslarını al
      const avatarEl = div.querySelector('.feed-avatar');
      const userBtn = div.querySelector('.feed-user');
      const categoryEl = div.querySelector('.feed-category');
      const dateEl = div.querySelector('.feed-date');
      const titleEl = div.querySelector('.feed-title');
      const statusEl = div.querySelector('.status-badge');
      const contentEl = div.querySelector('.feed-content');

      // Alanları doldur
      avatarEl.textContent = avatarLetter;

      userBtn.textContent = username;
      if (p.userId) {
        userBtn.dataset.userId = p.userId;
      }

      categoryEl.textContent = p.categoryLabel || p.category || '-';
      dateEl.textContent = p.targetDate || '';

      titleEl.textContent = title;

      statusEl.textContent = statusInfo.label;
      statusEl.classList.add(statusInfo.className);

      contentEl.textContent = p.content || '';

      feedListEl.appendChild(div);
    });
  } catch (err) {
    console.error('Feed error:', err);
    feedListEl.innerHTML =
      '<p class="message error">Feed yüklenemedi. Daha sonra tekrar deneyin.</p>';
  }
}


  // =========================
  // 6) BENİM TAHMİNLERİM + DETAY
  // =========================

  async function loadMyPredictions(options = {}) {
    if (!myPredictionsListEl) return;

    if (!authToken) {
      myPredictionsListEl.innerHTML = '<p class="small">Tahminlerinizi görmek için giriş yapın.</p>';
      return;
    }

    try {
      const params = new URLSearchParams();
      if (options.category) params.append('category', options.category);
      if (options.status) params.append('status', options.status);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const data = await api.get(`/api/predictions/mine${qs}`, authToken);
      const items = data.data || [];

      if (!items.length) {
        myPredictionsListEl.innerHTML =
          '<p class="small">Henüz tahmininiz yok (veya filtrelere uyan tahmin bulunamadı).</p>';
        return;
      }

      myPredictionsListEl.innerHTML = '';
      items.forEach((p) => {
        const div = document.createElement('div');
        div.className = 'feed-item';
        div.dataset.id = p.id;
        div.style.cursor = 'pointer';

        const statusLabel =
          p.status === 'correct' ? 'Doğru' :
          p.status === 'incorrect' ? 'Yanlış' : 'Bekliyor';

        const headerTitle = p.isLocked ? 'Mühürlü tahmin' : escapeHtml(p.title || '(Başlık yok)');
        const contentHtml = p.isLocked
          ? '<span class="small">İçerik hedef tarih gelene kadar gizli.</span>'
          : escapeHtml(p.content || '').replace(/\n/g, '<br/>');

        div.innerHTML = `
          <div class="feed-header">
            <span class="feed-category">${escapeHtml(p.category || '')}</span>
            <span class="feed-date">${fmtDate(p.targetDate)}</span>
          </div>
          <div class="feed-content">
            <strong>${headerTitle}</strong>
            <div>${contentHtml}</div>
          </div>
          <div class="feed-footer">
            Durum: ${statusLabel}
          </div>
        `;
        myPredictionsListEl.appendChild(div);
      });
    } catch (err) {
      console.error('My predictions error:', err);
      myPredictionsListEl.innerHTML = '<p class="small">Tahminler yüklenirken bir hata oluştu.</p>';
    }
  }

// Benim istatistiklerim kartı
async function loadMyStats() {
  if (!myStatsEl || !authToken) return;

  try {
    const data = await api.get('/api/stats/me', authToken);
    const categories = data.categories || [];

    if (!categories.length) {
      myStatsEl.innerHTML = '<p class="small">Henüz istatistik yok. Tahmin yaptıkça burada belirecek.</p>';
      return;
    }

    // Toplamlar
    let total = 0;
    let resolved = 0;
    let correct = 0;
    let incorrect = 0;

    categories.forEach((c) => {
      total += c.total || 0;
      resolved += c.resolved || 0;
      correct += c.correct || 0;
      incorrect += c.incorrect || 0;
    });

    const accuracy = resolved > 0 ? Math.round((correct / resolved) * 100) : 0;

    // HTML tablo
    let html = '';
    html += `<div class="small" style="margin-bottom:8px;">
      Kullanıcı: <strong>${escapeHtml(data.username || '')}</strong><br/>
      Toplam tahmin: <strong>${total}</strong>,
      Çözülen: <strong>${resolved}</strong>,
      Doğru: <strong>${correct}</strong>,
      Yanlış: <strong>${incorrect}</strong>,
      Başarı: <strong>${accuracy}%</strong>
    </div>`;

    html += `<table class="small" style="width:100%; border-collapse:collapse; font-size:12px;">
      <thead>
        <tr>
          <th style="text-align:left; padding:4px 0;">Kategori</th>
          <th style="text-align:right; padding:4px 0;">Toplam</th>
          <th style="text-align:right; padding:4px 0;">Çözülen</th>
          <th style="text-align:right; padding:4px 0;">Doğru</th>
          <th style="text-align:right; padding:4px 0;">Yanlış</th>
          <th style="text-align:right; padding:4px 0;">Başarı</th>
        </tr>
      </thead>
      <tbody>
    `;

    categories.forEach((c) => {
      html += `
        <tr data-category-key="${escapeHtml(c.key || '')}" class="my-stats-row" style="cursor:pointer;">
          <td style="padding:2px 0;">
            <span style="text-decoration:underline;">${escapeHtml(c.label || c.key || '')}</span>
          </td>
          <td style="text-align:right;">${c.total || 0}</td>
          <td style="text-align:right;">${c.resolved || 0}</td>
          <td style="text-align:right;">${c.correct || 0}</td>
          <td style="text-align:right;">${c.incorrect || 0}</td>
          <td style="text-align:right;">${c.accuracy || 0}%</td>
        </tr>
      `;
    });

    html += '</tbody></table>';

    myStatsEl.innerHTML = html;
  } catch (err) {
    console.error('loadMyStats error:', err);
    myStatsEl.innerHTML =
      '<p class="small">İstatistikler yüklenemedi.</p>';
  }
}


  async function loadPredictionDetail(predictionId) {
    if (!predictionDetailEl) return;

    if (!authToken) {
      resetDetailPanel();
      return;
    }
    if (!predictionId) {
      resetDetailPanel();
      return;
    }

    try {
      const data = await api.get(`/api/predictions/${predictionId}`, authToken);

      const statusLabel =
        data.status === 'correct' ? 'Doğru' :
        data.status === 'incorrect' ? 'Yanlış' : 'Bekliyor';

      const ownerName = escapeHtml(data.user?.username || 'Bilinmiyor');
      const cat = escapeHtml(data.category || '');
      const tDate = fmtDate(data.targetDate);
      const created = fmtDate(data.createdAt);

      const title = data.isLocked ? 'Mühürlü tahmin' : escapeHtml(data.title || '(Başlık yok)');
      const contentHtml = data.isLocked
        ? '<span class="small">İçerik hedef tarih gelene kadar gizli.</span>'
        : escapeHtml(data.content || '').replace(/\n/g, '<br/>');

      predictionDetailEl.innerHTML = `
        <div class="feed-item">
          <div class="feed-header">
            <span class="feed-user">${ownerName}</span>
            <span class="feed-category">${cat}</span>
            <span class="feed-date">${tDate}</span>
          </div>
          <div class="feed-content">
            <strong>${title}</strong>
            <div>${contentHtml}</div>
          </div>
          <div class="feed-footer">
            Durum: ${statusLabel} ${created ? `· Oluşturma: ${created}` : ''}
          </div>
        </div>
      `;
    } catch (err) {
      console.error('Prediction detail error:', err);
      predictionDetailEl.innerHTML = '<p class="small">Detay yüklenirken bir hata oluştu.</p>';
    }
  }
  // Takip ettiklerim listesini yükler
  async function loadFollowing() {
  if (!followingListEl || !authToken) return;
  try {
    const data = await api.get('/api/follow/following', authToken);
    const items = data.data || [];
    if (!items.length) {
      followingListEl.innerHTML = '<p class="small">Henüz kimseyi takip etmiyorsunuz.</p>';
      return;
    }
    followingListEl.innerHTML = '';
    items.forEach((u) => {
      const li = document.createElement('div');
      li.className = 'feed-item';
      li.innerHTML = `
        <div class="feed-header">
          <button class="user-link" data-user-id="${escapeHtml(u.id)}"
            style="background:none;border:none;color:#8ab4f8;cursor:pointer;padding:0">
            ${escapeHtml(u.username)}
          </button>
          <span class="feed-date">${escapeHtml(u.joinedAt || '')}</span>
        </div>
        <div class="small">Takip ediliyor</div>
      `;
      followingListEl.appendChild(li);
    });
  } catch (err) {
    console.error('loadFollowing error:', err);
    followingListEl.innerHTML = '<p class="small">Takip listesi yüklenemedi.</p>';
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
  if (!authToken) return;
  try {
    const prof = await api.get(`/api/users/${encodeURIComponent(userId)}`, authToken);

    const u = prof.user;
    const stats = prof.stats || {};
    const items = prof.predictions || [];

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
          '<p class="small">Bu kullanıcının görünür tahmini yok.</p>';
      } else {
        profilePredictionsEl.innerHTML = '';
        items.forEach((p) => {
          const div = document.createElement('div');
          div.className = 'feed-item';
          const title = p.isLocked
            ? 'Mühürlü tahmin'
            : escapeHtml(p.title || '(Başlık yok)');
          const content = p.isLocked
            ? '<span class="small">İçerik hedef tarih gelene kadar gizli.</span>'
            : escapeHtml(p.content || '').replace(/\n/g, '<br/>');
          const status =
            p.status === 'correct'
              ? 'Doğru'
              : p.status === 'incorrect'
              ? 'Yanlış'
              : 'Bekliyor';

          div.innerHTML = `
            <div class="feed-header">
              <span class="feed-category">${escapeHtml(p.category || '')}</span>
              <span class="feed-date">${escapeHtml(p.targetDate || '')}</span>
            </div>
            <div class="feed-content">
              <strong>${title}</strong>
              <div>${content}</div>
            </div>
            <div class="feed-footer">Durum: ${status}</div>
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

  // =========================
  // 8) TAHMİN OLUŞTURMA
  // =========================

  if (predictionForm) {
    predictionForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!authToken) {
        if (predictionMessageEl) {
          predictionMessageEl.textContent = 'Tahmin göndermek için önce giriş yapın.';
          predictionMessageEl.className = 'message error';
        }
        return;
      }

      const title = predictionTitleEl?.value?.trim() || '';
      const content = predictionContentEl?.value?.trim() || '';
      const targetDate = predictionDateEl?.value || '';
      const category = categorySelectEl?.value || '';

      if (!title || !content || !targetDate || !category) {
        if (predictionMessageEl) {
          predictionMessageEl.textContent = 'Lütfen başlık, tahmin, tarih ve kategoriyi doldurun.';
          predictionMessageEl.className = 'message error';
        }
        return;
      }

      try {
        await api.post('/api/predictions', { title, content, targetDate, category }, authToken);
        if (predictionMessageEl) {
          predictionMessageEl.textContent = 'Tahmin başarıyla mühürlendi.';
          predictionMessageEl.className = 'message success';
        }
        predictionForm.reset();
        // liste/ feed güncelle
        await Promise.all([loadFeed(), loadMyPredictions({})]);
      } catch (err) {
        if (predictionMessageEl) {
          predictionMessageEl.textContent = err.message || 'Tahmin oluşturulamadı.';
          predictionMessageEl.className = 'message error';
        }
      }
    });
  }

  // =========================
  // 9) BENİM TAHMİNLERİM FİLTRELERİ
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
    const userLink = e.target.closest('.user-link');
  if (userLink) {
    const uid = userLink.dataset.userId;
    if (uid) {
      updateUserInUrl(uid);
      loadUserProfile(uid);
    }
    return;
  }

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
  // 10) DM (opsiyonel / varsa)
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
  // 11) İLK YÜKLEME
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
