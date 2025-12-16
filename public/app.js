
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
    // Tahmin çözümleme oyları için global handler
  window.handleResolutionVote = async function (e, predictionId, vote) {
    e.preventDefault();
    e.stopPropagation();

    if (!authToken) {
      alert('Oy vermek için giriş yapmalısın.');
      return;
    }

    if (!predictionId || !vote) {
      return;
    }

    try {
      const res = await api.post(
        `/api/predictions/${encodeURIComponent(predictionId)}/vote`,
        { vote },
        authToken
      );

      // Tıklanan butonu ve bulunduğu kartı bul
      const btn = e.target.closest('.resolution-vote-btn');
      const container = btn && btn.closest('.resolution-vote-buttons');
      if (container) {
        container.remove(); // butonları kaldır
      }

      // Backend statüyü değiştirdiyse, durum pill'ini güncelle
          if (res && res.status && btn) {
      // 1) Karttaki durumu güncelle
      const card = btn.closest('.feed-item');
      if (card) {
        const pill = card.querySelector('.prediction-status-pill');
        if (pill) {
          pill.classList.remove(
            'status-correct',
            'status-incorrect',
            'status-pending'
          );

          let label = 'Beklemede';
          let cls = 'status-pending';

          if (res.status === 'correct') {
            label = 'Doğru';
            cls = 'status-correct';
          } else if (res.status === 'incorrect') {
            label = 'Yanlış';
            cls = 'status-incorrect';
          }

          pill.textContent = label;
          pill.classList.add(cls);
        }
      }

      // 2) Sağdaki detay paneli bu tahmini gösteriyorsa onu da güncelle
      if (
        typeof selectedPredictionId !== 'undefined' &&
        selectedPredictionId &&
        String(selectedPredictionId) === String(predictionId) &&
        predictionDetailEl
      ) {
        const detailCard =
          predictionDetailEl.querySelector('.prediction-detail-card');
        if (detailCard) {
          const detailPill =
            detailCard.querySelector('.prediction-status-pill');
          if (detailPill) {
            detailPill.classList.remove(
              'status-correct',
              'status-incorrect',
              'status-pending'
            );

            let label = 'Beklemede';
            let cls = 'status-pending';

            if (res.status === 'correct') {
              label = 'Doğru';
              cls = 'status-correct';
            } else if (res.status === 'incorrect') {
              label = 'Yanlış';
              cls = 'status-incorrect';
            }

            detailPill.textContent = label;
            detailPill.classList.add(cls);
          }

          // Detay footer'daki açıklama metni
          const statusTextEl = predictionDetailEl.querySelector(
            '.prediction-detail-footer .small.subtle'
          );
          if (statusTextEl) {
            const resolvedStr = res.resolvedAt ? fmtDate(res.resolvedAt) : null;

            if (res.status === 'correct') {
              statusTextEl.innerHTML = resolvedStr
                ? `Bu tahmin ${resolvedStr} tarihinde <strong>Doğru</strong> olarak işaretlendi.`
                : 'Bu tahmin <strong>Doğru</strong> olarak işaretlendi.';
            } else if (res.status === 'incorrect') {
              statusTextEl.innerHTML = resolvedStr
                ? `Bu tahmin ${resolvedStr} tarihinde <strong>Yanlış</strong> olarak işaretlendi.`
                : 'Bu tahmin <strong>Yanlış</strong> olarak işaretlendi.';
            } else {
              statusTextEl.textContent =
                'Bu tahmin şu anda beklemede.';
            }
          }
        }
      }
    }

    } catch (err) {
      console.error('vote error:', err);
      alert(
        (err && err.message) ||
          'Oy verilirken bir hata oluştu.'
      );
    }
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

    // --- i18n ---
  const supportedLangs = ['tr', 'en'];
  let currentLang =
    localStorage.getItem('lang') ||
    (navigator.language.startsWith('tr') ? 'tr' : 'en');

  if (!supportedLangs.includes(currentLang)) {
    currentLang = 'en';
  }

  let translations = {};

  async function loadTranslations(lang) {
    try {
      const res = await fetch(`/i18n/${lang}.json`);
      translations = await res.json();
      currentLang = lang;
      localStorage.setItem('lang', lang);
      applyTranslationsToDom(); // HTML üzerindeki textleri güncelle
    } catch (e) {
      console.error('i18n load error', e);
    }
  }

  function t(key, vars = {}) {
    const raw = translations[key] || key;
    return raw.replace(/\{\{(\w+)\}\}/g, (_, name) => {
      return vars[name] ?? '';
    });
  }


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
  const categoryDatalistEl = document.getElementById('prediction-category-list');
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
  const myStrengthsCardEl = document.getElementById('myStrengthsCard');
  const myBestCategoriesEl = document.getElementById('myBestCategories');


  // Dil seçici
  const langSelectEl = document.getElementById('lang-select');


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
  const profilePageContentEl = document.getElementById('profile-page-content');
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
    // Mesajlar sayfası
  const messagesThreadListEl = document.getElementById('messages-thread-list');
  const messagesConversationEl = document.getElementById('messages-conversation');
  const messagesEmptyStateEl = document.getElementById('messages-empty-state');
  const messagesConversationHeaderEl = document.getElementById('messages-conversation-header');
  const messagesConversationBodyEl = document.getElementById('messages-conversation-body');
  const messagesSendFormEl = document.getElementById('messages-send-form');
  const messagesInputEl = document.getElementById('messages-input');



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

      // Tahmin formu: datalist (yazılabilir kategori + öneri)
      if (categoryDatalistEl) {
        categoryDatalistEl.innerHTML = '';
        categories.forEach((c) => {
          const opt = document.createElement('option');
          opt.value = c.key; // sabitlerde key; custom'da zaten key=label
          categoryDatalistEl.appendChild(opt);
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
      // ID hangi isimle gelirse gelsin yakala
      const predictionId = p.id || p._id || p.predictionId;

      const div = document.createElement('div');
      div.className = 'feed-item';
      if (predictionId) {
        div.dataset.id = predictionId;
      }
      div.style.cursor = 'pointer';

      const userName = escapeHtml(p.user?.username || 'Bilinmiyor');
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

      const title = escapeHtml(p.title || '(Başlık yok)');

      const contentHtml = isLocked
        ? '<span class="small subtle">İçerik hedef tarih gelene kadar gizli.</span>'
        : escapeHtml(p.content || '').replace(/\n/g, '<br/>');

      const likesCount = p.likesCount ?? 0;
      const liked = !!p.liked;

      // Hedef tarih gelmiş ve hâlâ pending ise oy verilebilir
      const canVote = !isLocked && rawStatus === 'pending';

      const voteButtonsHtml =
        canVote && predictionId
          ? `
        <div class="resolution-vote-buttons">
          <button
            type="button"
            class="resolution-vote-btn"
            onclick="window.handleResolutionVote(event, '${predictionId}', 'correct')"
          >
            Doğru
          </button>
          <button
            type="button"
            class="resolution-vote-btn"
            onclick="window.handleResolutionVote(event, '${predictionId}', 'incorrect')"
          >
            Yanlış
          </button>
        </div>
      `
          : '';

      const metaText = created
        ? `Oluşturma: ${created} · Açılma: ${tDate}`
        : `Açılma: ${tDate}`;

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
            ${metaText}
          </span>
          <div class="feed-footer-right">
            ${voteButtonsHtml}
            <span class="prediction-status-pill ${statusClass}">
              ${statusLabel}
            </span>
            <button
              type="button"
              class="like-pill ${liked ? 'liked' : ''}"
              data-id="${predictionId || ''}"
            >
              <span class="like-icon">👍</span>
              <span class="like-count">${likesCount}</span>
            </button>
          </div>
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
      const canVote = !isLocked && rawStatus === 'pending';

      const titleText = escapeHtml(p.title || '(Başlık yok)');

      const contentHtml = isLocked
        ? '<span class="small subtle">İçerik hedef tarih gelene kadar gizli.</span>'
        : escapeHtml(p.content || '').replace(/\n/g, '<br/>');

      const likesCount = p.likesCount ?? 0;
      const liked = !!p.liked;

      const metaText = created
        ? `Oluşturma: ${created} · Açılma: ${tDate}`
        : `Açılma: ${tDate}`;

      const voteButtonsHtml = canVote
        ? `
        <div class="resolution-vote-buttons">
          <button
            type="button"
            class="resolution-vote-btn"
            onclick="window.handleResolutionVote(event, '${p.id}', 'correct')"
          >
            Doğru
          </button>
          <button
            type="button"
            class="resolution-vote-btn"
            onclick="window.handleResolutionVote(event, '${p.id}', 'incorrect')"
          >
            Yanlış
          </button>
        </div>
      `
        : '';


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
              ${voteButtonsHtml}
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

            // --- Güçlü olduğun kategoriler kartı ---
    if (myStrengthsCardEl && myBestCategoriesEl) {
      const MIN_RESOLVED_FOR_STRENGTH = 3;

      const eligible = categories
        .map((c) => {
          const label = c.label || c.name || c.category || 'Genel';
          const resolved =
            c.resolved ??
            c.resolvedCount ??
            c.solved ??
            c.totalResolved ??
            0;
          const correct =
            c.correct ??
            c.correctCount ??
            c.trueCount ??
            0;

          const accuracy =
            c.accuracy ??
            (resolved > 0
              ? Math.round((correct / resolved) * 100)
              : 0);

          return { label, resolved, accuracy };
        })
        // Yeterince verisi olmayanları ele
        .filter((c) => c.resolved >= MIN_RESOLVED_FOR_STRENGTH)
        // Önce başarıya, sonra çözülen sayısına göre sırala
        .sort((a, b) => {
          if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
          return b.resolved - a.resolved;
        })
        .slice(0, 3); // en iyi 3 kategori

      if (!eligible.length) {
        myBestCategoriesEl.innerHTML =
          '<p class="small subtle">Güçlü kategorilerini görebilmek için en az birkaç tahminin çözülmüş olması gerekiyor.</p>';
      } else {
        myBestCategoriesEl.innerHTML = `
          <ul class="best-categories-list">
            ${eligible
              .map(
                (c) => `
              <li>
                <span class="cat-label">${escapeHtml(c.label)}</span>
                <span class="cat-meta">
                  Çözülen: ${c.resolved} · Başarı: ${c.accuracy}%
                </span>
              </li>
            `
              )
              .join('')}
          </ul>
        `;
      }
    }


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

        // Giriş yapmış kullanıcı için kısa özet (sıra, başarı, çözülen)
    let summaryHtml = '';
    if (currentUser) {
      const myIndex = items.findIndex(
        (row) =>
          row.userId &&
          String(row.userId) === String(currentUser.id)
      );

      if (myIndex !== -1) {
        const rank = myIndex + 1;
        const meRow = items[myIndex];
        const resolved = meRow.resolvedCount || 0;
        const acc = meRow.accuracy ?? 0;

        summaryHtml = `
          <div class="leaderboard-summary">
            Sen şu anda <strong>${rank}.</strong> sıradasın
            · Çözülen: <strong>${resolved}</strong>
            · Başarı: <strong>${acc}%</strong>
          </div>
        `;
      } else {
        summaryHtml = `
          <div class="leaderboard-summary">
            Henüz liderlik tablosunda yer almıyorsun.
            Daha fazla tahmin yap ve açılan tahminlerde doğru sayını artır!
          </div>
        `;
      }
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
            <th>Rozet</th>
          </tr>
        </thead>
        <tbody>
    `;

      items.forEach((row, index) => {
      const rank = index + 1;

      // İlk 3 için madalya, diğerleri için numara
      let rankDisplay = String(rank);
      if (rank === 1) rankDisplay = '🥇';
      else if (rank === 2) rankDisplay = '🥈';
      else if (rank === 3) rankDisplay = '🥉';

      const resolved = row.resolvedCount || 0;
      const accuracy = row.accuracy ?? 0;

      // Rozet mantığı
      let badge = 'Yeni';
      if (resolved >= 30 && accuracy >= 80) {
        badge = 'Usta tahminci';
      } else if (resolved >= 15 && accuracy >= 65) {
        badge = 'Güçlü tahminci';
      } else if (resolved >= 5) {
        badge = 'Yükselen';
      }

      // Satır sınıfları: hem "ben" hem top3 olabilir
      const classNames = [];

      if (
        currentUser &&
        row.userId &&
        String(row.userId) === String(currentUser.id)
      ) {
        classNames.push('is-me');
      }
      if (rank === 1) classNames.push('top-1');
      else if (rank === 2) classNames.push('top-2');
      else if (rank === 3) classNames.push('top-3');

      const rowClassAttr = classNames.length
        ? ` class="${classNames.join(' ')}"`
        : '';

      html += `
        <tr${rowClassAttr}>
          <td title="Sıra: ${rank}">${rankDisplay}</td>
          <td>
            <button
              type="button"
              class="user-link leaderboard-user-link"
              data-user-id="${escapeHtml(row.userId || '')}"
              style="background:none;border:none;color:#8ab4f8;cursor:pointer;padding:0"
            >
              ${escapeHtml(row.username || '')}
            </button>
          </td>
          <td style="text-align:right;">${resolved}</td>
          <td style="text-align:right;">${row.correctCount || 0}</td>
          <td style="text-align:right;">${accuracy}%</td>
          <td style="text-align:right;">${badge}</td>
        </tr>
      `;
    });


    html += `
        </tbody>
      </table>
    `;

    // Özet + tabloyu birlikte bas
    leaderboardBodyEl.innerHTML = summaryHtml + html;
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

    const titleText = escapeHtml(data.title || '(Başlık yok)');


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

  async function renderProfileCategoryStats(userId) {
    if (!profileCategoryStatsEl || !authToken) return;

    profileCategoryStatsEl.innerHTML =
      '<p class="small subtle">Kategori istatistikleri yükleniyor...</p>';

    try {
      const data = await api.get(
        `/api/stats/user/${encodeURIComponent(userId)}`,
        authToken
      );
      const categories = data.categories || [];

      if (!categories.length) {
        profileCategoryStatsEl.innerHTML =
          '<p class="small subtle">Bu kullanıcı için kategori bazlı istatistik yok.</p>';
        return;
      }

      // Çözülen tahmini olan kategorileri al
      const nonEmpty = categories.filter((c) => (c.resolved || 0) > 0);

      // Accuracy'e göre sıralayıp ilk 3'ü al
      const top = [...nonEmpty]
        .sort((a, b) => {
          const accA = a.accuracy ?? 0;
          const accB = b.accuracy ?? 0;
          if (accB !== accA) return accB - accA;
          return (b.resolved || 0) - (a.resolved || 0);
        })
        .slice(0, 3);

      let html = '';

      if (top.length) {
        html += `
          <h4 class="small-heading">En başarılı kategoriler</h4>
          <div class="profile-category-highlights">
        `;

        top.forEach((c) => {
          const acc = c.accuracy ?? 0;
          let tierClass = 'tier-5';
          if (acc >= 85) tierClass = 'tier-1';
          else if (acc >= 70) tierClass = 'tier-2';
          else if (acc >= 50) tierClass = 'tier-3';
          else if (acc >= 25) tierClass = 'tier-4';

          html += `
            <div class="profile-category-pill ${tierClass}">
              <span class="profile-category-pill-label">
                ${escapeHtml(c.label || c.key || '')}
              </span>
              <span class="profile-category-pill-value">%${acc}</span>
            </div>
          `;
        });

        html += `</div>`;
      }

      // Altına tüm kategoriler tablosu
      html += `
        <h4 class="small-heading">Tüm kategoriler</h4>
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
      `;

      profileCategoryStatsEl.innerHTML = html;
    } catch (err) {
      console.error('renderProfileCategoryStats error:', err);
      profileCategoryStatsEl.innerHTML =
        '<p class="small">Kategori istatistikleri yüklenirken bir hata oluştu.</p>';
    }
  }

    // PROFİL SAYFASI (kendi profilim)
  async function loadMyProfilePage() {
    if (!profilePageContentEl) return;

    if (!authToken) {
      profilePageContentEl.innerHTML =
        '<p class="small subtle">Profilini görmek için önce giriş yapman gerekiyor.</p>';
      return;
    }

    profilePageContentEl.innerHTML =
      '<p class="small subtle">Profil yükleniyor...</p>';

    try {
      // Genel istatistikler
      const stats = await api.get('/api/stats/me', authToken);
       // Takip istatistikleri
      let followingCount = 0;
      let followersCount = 0;
      try {
        const followStats = await api.get('/api/follow/me-stats', authToken);
        followingCount = followStats.followingCount || 0;
        followersCount = followStats.followersCount || 0;
      } catch (err) {
        console.error('follow stats error:', err);
      }
      const total = stats.total || 0;
      const resolved = stats.resolved || 0;
      const correct = stats.correct || 0;
      const incorrect = stats.incorrect || 0;
      const accuracy =
        stats.accuracy !== undefined && stats.accuracy !== null
          ? stats.accuracy
          : resolved > 0
          ? Math.round((correct / resolved) * 100)
          : 0;

      const categories = stats.categories || [];

      // Güçlü kategoriler (en fazla 3 tane)
      const bestCategories = categories
        .map((c) => {
          const label = c.label || c.name || c.category || 'Genel';
          const resolvedCount =
            c.resolved ??
            c.resolvedCount ??
            c.solved ??
            c.totalResolved ??
            c.total ??
            0;
          const correctCount =
            c.correct ??
            c.correctCount ??
            c.trueCount ??
            c.correctTotal ??
            0;

          const acc =
            c.accuracy ??
            (resolvedCount > 0
              ? Math.round((correctCount / resolvedCount) * 100)
              : 0);

          return {
            label,
            resolved: resolvedCount,
            accuracy: acc,
          };
        })
        .filter((c) => c.resolved > 0)
        .sort((a, b) => {
          if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
          return b.resolved - a.resolved;
        })
        .slice(0, 3);

      // Kendi tahminlerimiz (son 5 tanesini göstereceğiz)
      const mineRes = await api.get('/api/predictions/mine', authToken);
      const allMyPreds = mineRes.items || mineRes.data || [];
      const recentPreds = allMyPreds.slice(0, 5);

      const username =
        escapeHtml(currentUser?.username || stats.username || 'Profilim');
      const initials = escapeHtml(
        (currentUser?.username || stats.username || 'P')
          .charAt(0)
          .toUpperCase()
      );

      // Güçlü kategoriler HTML
      let bestCatsHtml = '';
      if (!bestCategories.length) {
        bestCatsHtml =
          '<p class="small subtle">Güçlü kategorilerini görebilmek için önce bazı tahminlerinin çözülmüş olması gerekiyor.</p>';
      } else {
        bestCatsHtml = `
          <ul class="best-categories-list">
            ${bestCategories
              .map(
                (c) => `
              <li>
                <span class="cat-label">${escapeHtml(c.label)}</span>
                <span class="cat-meta">
                  Çözülen: ${c.resolved} · Başarı: ${c.accuracy}%
                </span>
              </li>
            `
              )
              .join('')}
          </ul>
        `;
      }

      // Son tahminler HTML
      let recentHtml = '';
      if (!recentPreds.length) {
        recentHtml =
          '<p class="small subtle">Henüz tahmin yapmadığın için listelenecek kayıt yok.</p>';
      } else {
        recentHtml = `
          <ul class="profile-recent-list">
            ${recentPreds
              .map((p) => {
                const title = p.title || '(Başlık yok)';
                const cat = p.category || '';
                const openDate = fmtDate(p.openAt || p.targetDate);
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

                return `
                  <li>
                    <div class="profile-recent-title-row">
                      <span class="profile-recent-title">${escapeHtml(
                        title
                      )}</span>
                      <span class="badge ${statusClass}">${statusLabel}</span>
                    </div>
                    <div class="profile-recent-meta">
                      ${escapeHtml(cat || '')}${
                openDate ? ` · Açılış: ${openDate}` : ''
              }
                    </div>
                  </li>
                `;
              })
              .join('')}
          </ul>
        `;
      }

      // Son içerik
      profilePageContentEl.innerHTML = `
        <div class="profile-page-grid">
          <div class="profile-main">
            <div class="profile-hero">
              <div class="profile-avatar">${initials}</div>
              <div>
                <h2>${username}</h2>
                <p class="small subtle">
                  Zaman kapsüllerine şimdiye kadar <strong>${total}</strong> tahmin bıraktın.
                </p>
                <p class="small subtle">
                  Takipçi: <strong>${followersCount}</strong>
                  · Takip edilen: <strong>${followingCount}</strong>
                </p>
              </div>
            </div>


            <div class="profile-stat-cards">
              <div class="profile-stat-card">
                <div class="label">Toplam tahmin</div>
                <div class="value">${total}</div>
              </div>
              <div class="profile-stat-card">
                <div class="label">Çözülen</div>
                <div class="value">${resolved}</div>
              </div>
              <div class="profile-stat-card">
                <div class="label">Doğru</div>
                <div class="value">${correct}</div>
              </div>
              <div class="profile-stat-card">
                <div class="label">Başarı</div>
                <div class="value">${accuracy}%</div>
              </div>
            </div>

            <div class="card-inner-block">
              <h3 class="small-heading">Güçlü olduğun kategoriler</h3>
              ${bestCatsHtml}
            </div>
          </div>

          <div class="profile-side">
            <div class="card-inner-block">
              <h3 class="small-heading">Son tahminlerin</h3>
              ${recentHtml}
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      console.error('my profile load error:', err);
      profilePageContentEl.innerHTML =
        '<p class="small subtle">Profil bilgileri yüklenirken bir hata oluştu.</p>';
    }
  }

  window.futureAppLoadMyProfilePage = loadMyProfilePage;

    // BAŞKA KULLANICININ PROFİLİ
  async function loadUserProfilePage(username) {
    if (!profilePageContentEl) return;

    if (!authToken) {
      profilePageContentEl.innerHTML =
        '<p class="small subtle">Profil görmek için önce giriş yapman gerekiyor.</p>';
      return;
    }

    profilePageContentEl.innerHTML =
      '<p class="small subtle">Profil yükleniyor...</p>';

    try {
      // İstatistikler
      const stats = await api.get(
        `/api/stats/user/${encodeURIComponent(username)}`,
        authToken
      );

      // Takip istatistikleri
      let followingCount = 0;
      let followersCount = 0;
      try {
        const followStats = await api.get(
          `/api/follow/user/${encodeURIComponent(username)}/stats`,
          authToken
        );
        followingCount = followStats.followingCount || 0;
        followersCount = followStats.followersCount || 0;
      } catch (err) {
        console.error('user follow stats error:', err);
      }

      const displayName = stats.username || username;
      const initials = escapeHtml(displayName.charAt(0).toUpperCase());

      const total = stats.total || 0;
      const resolved = stats.resolved || stats.solved || 0;
      const correct = stats.correct || 0;
      const accuracy = stats.accuracy || stats.successRate || 0;

      profilePageContentEl.innerHTML = `
        <div class="profile-page-grid">
          <div class="profile-main">
            <div class="profile-hero">
              <div class="profile-avatar">${initials}</div>
              <div>
                <h2>${escapeHtml(displayName)}</h2>
                <p class="small subtle">
                  Bu kullanıcı zaman kapsüllerine şimdiye kadar
                  <strong>${total}</strong> tahmin bırakmış.
                </p>
                <p class="small subtle">
                  Takipçi: <strong>${followersCount}</strong>
                  · Takip edilen: <strong>${followingCount}</strong>
                </p>
              </div>
            </div>

            <div class="profile-stat-cards">
              <div class="profile-stat-card">
                <div class="label">Toplam tahmin</div>
                <div class="value">${total}</div>
              </div>
              <div class="profile-stat-card">
                <div class="label">Çözülen</div>
                <div class="value">${resolved}</div>
              </div>
              <div class="profile-stat-card">
                <div class="label">Doğru</div>
                <div class="value">${correct}</div>
              </div>
              <div class="profile-stat-card">
                <div class="label">Başarı</div>
                <div class="value">${accuracy}%</div>
              </div>
            </div>

            <div class="card-inner-block">
              <h3 class="small-heading">Güçlü kategoriler (yakında)</h3>
              <p class="small subtle">
                Bu kullanıcının kategorilere göre performansını burada göstereceğiz.
              </p>
            </div>
          </div>

          <div class="profile-side">
            <div class="card-inner-block">
              <h3 class="small-heading">Bu kullanıcının tahminleri</h3>
              <p class="small subtle">
                Yakında bu bölümde bu kullanıcının son tahminlerini listeleyeceğiz.
              </p>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      console.error('user profile load error:', err);
      profilePageContentEl.innerHTML =
        '<p class="small subtle">Profil yüklenirken bir hata oluştu veya kullanıcı bulunamadı.</p>';
    }
  }

// TAM EKRAN PROFİL SAYFASI (profilePageContentEl içine render)
async function loadUserFullPage(userId) {
  if (!profilePageContentEl) return;

  profilePageContentEl.innerHTML =
    '<p class="small subtle">Profil yükleniyor...</p>';

  try {
    // /api/users/:id => { user, stats, predictions, isSelf, isFollowing }
    const prof = await api.get(`/api/users/${userId}`, authToken);

    // takip istatistikleri (ID ile)
    const followStats = await api.get(
      `/api/follow/user/${userId}/stats`,
      authToken
    );

    const u = prof.user || {};
    const s = prof.stats || {};

    const username = u.username || 'Kullanıcı';
    const initials = (username || '?').charAt(0).toUpperCase();

    // joinedAt string geliyor (YYYY-MM-DD). Boşsa '-' gösterelim.
    const joinedText = u.joinedAt
      ? new Date(u.joinedAt).toLocaleDateString('tr-TR')
      : '-';

    // undefined olmasın diye default 0
    const total = Number.isFinite(s.total) ? s.total : 0;
    const resolved = Number.isFinite(s.resolved) ? s.resolved : 0;
    const correct = Number.isFinite(s.correct) ? s.correct : 0;
    const accuracy = Number.isFinite(s.accuracy) ? s.accuracy : 0;

    // --- Tahminleri iki gruba ayır: açılmış / açılmamış (mühürlü) ---
    const preds = Array.isArray(prof.predictions) ? prof.predictions : [];
    const openedPreds = preds.filter((p) => !p.isLocked);
    const lockedPreds = preds.filter((p) => p.isLocked);

    // Açılmış tahminler HTML
    let openedHtml = '';
    if (!openedPreds.length) {
      openedHtml =
        '<p class="small subtle">Bu kullanıcıya ait açılmış tahmin bulunmuyor.</p>';
    } else {
      openedHtml = `
        <ul class="profile-recent-list">
          ${openedPreds
            .map((p) => {
              const title = p.title || '(Başlık yok)';
              const cat = p.category || '';
              const openDate = p.targetDate || '';
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

              return `
                <li>
                  <div class="profile-recent-title-row">
                    <span class="profile-recent-title">${escapeHtml(title)}</span>
                    <span class="badge ${statusClass}">${statusLabel}</span>
                  </div>
                  <div class="profile-recent-meta">
                    ${escapeHtml(cat)}${openDate ? ` · Açılış: ${escapeHtml(openDate)}` : ''}
                  </div>
                </li>
              `;
            })
            .join('')}
        </ul>
      `;
    }

    // Açılmamış (mühürlü) tahminler HTML (SADECE başlık)
    let lockedHtml = '';
    if (!lockedPreds.length) {
      lockedHtml =
        '<p class="small subtle">Bu kullanıcıya ait açılmamış tahmin bulunmuyor.</p>';
    } else {
      lockedHtml = `
        <ul class="profile-recent-list">
          ${lockedPreds
            .map((p) => {
              const title = p.title || '(Başlık yok)';
              return `
                <li>
                  <div class="profile-recent-title-row">
                    <span class="profile-recent-title">${escapeHtml(title)}</span>
                  </div>
                </li>
              `;
            })
            .join('')}
        </ul>
      `;
    }

    profilePageContentEl.innerHTML = `
      <div class="profile-full-hero">
        <div class="profile-full-avatar">${escapeHtml(initials)}</div>
        <div>
          <h2>${escapeHtml(username)}</h2>
          <p class="small subtle">Katılım: ${escapeHtml(joinedText)}</p>
          <p class="small subtle">
            Takipçi: <strong>${followStats.followersCount}</strong>
            · Takip edilen: <strong>${followStats.followingCount}</strong>
          </p>
        </div>
      </div>

      <div class="profile-stats-row">
        <div class="profile-stat-card"><span>Toplam</span><strong>${total}</strong></div>
        <div class="profile-stat-card"><span>Çözülen</span><strong>${resolved}</strong></div>
        <div class="profile-stat-card"><span>Doğru</span><strong>${correct}</strong></div>
        <div class="profile-stat-card"><span>Başarı</span><strong>${accuracy}%</strong></div>
      </div>

      <div class="card-inner-block">
        <h3>Açılmış tahminler</h3>
        ${openedHtml}
      </div>

      <div class="card-inner-block">
        <h3>Henüz açılmamış tahminler</h3>
        ${lockedHtml}
      </div>

          `;
  } catch (err) {
    console.error('full profile error:', err);
    profilePageContentEl.innerHTML =
      '<p class="small subtle">Profil yüklenirken bir hata oluştu veya kullanıcı bulunamadı.</p>';
  }
}

// Router için global erişim
window.loadUserFullPage = loadUserFullPage;


  // SPA router dışarıdan çağırabilsin diye global'e açıyoruz
  window.futureAppLoadOtherProfilePage = loadUserProfilePage;


  // --- MESAJLAR SAYFASI (şimdilik demo veriyle) ---

  let demoThreads = [
    {
      id: 't1',
      username: 'yusuf',
      lastMessage: 'Bu proje çok iyi gidiyor!',
      messages: [
        { fromMe: false, text: 'Selam, nasıl gidiyor?', at: '10:01' },
        { fromMe: true, text: 'Süper gidiyor, FutureCast uçacak 🚀', at: '10:02' },
      ],
    },
    {
      id: 't2',
      username: 'veli',
      lastMessage: 'Yeni tahminlerine baktım.',
      messages: [
        { fromMe: false, text: 'Bugün yeni tahminler açtın mı?', at: '09:15' },
        { fromMe: true, text: 'Evet, özellikle teknoloji kategorisine 😎', at: '09:17' },
      ],
    },
  ];

  let activeThreadId = null;

  function renderMessagesThreadList() {
    if (!messagesThreadListEl) return;

    if (!demoThreads.length) {
      messagesThreadListEl.innerHTML =
        '<li class="messages-thread-item"><span class="messages-thread-preview">Henüz mesaj yok.</span></li>';
      return;
    }

    messagesThreadListEl.innerHTML = demoThreads
      .map((t) => {
        const initial = escapeHtml(t.username.charAt(0).toUpperCase());
        const isActive = t.id === activeThreadId;
        return `
          <li class="messages-thread-item${isActive ? ' active' : ''}" data-thread-id="${
            t.id
          }">
            <div class="messages-thread-avatar">${initial}</div>
            <div class="messages-thread-main">
              <div class="messages-thread-name">${escapeHtml(t.username)}</div>
              <div class="messages-thread-preview">${escapeHtml(t.lastMessage)}</div>
            </div>
          </li>
        `;
      })
      .join('');
  }

  function renderMessagesConversation(thread) {
    if (
      !messagesConversationEl ||
      !messagesConversationHeaderEl ||
      !messagesConversationBodyEl ||
      !messagesEmptyStateEl
    )
      return;

    if (!thread) {
      messagesConversationEl.classList.add('hidden');
      messagesEmptyStateEl.style.display = 'block';
      return;
    }

    messagesEmptyStateEl.style.display = 'none';
    messagesConversationEl.classList.remove('hidden');

    messagesConversationHeaderEl.textContent = thread.username;

    messagesConversationBodyEl.innerHTML = thread.messages
      .map((m) => {
        const cls = m.fromMe ? 'me' : 'them';
        return `
          <div class="message-row ${cls}">
            <div class="message-bubble">
              ${escapeHtml(m.text)}
              <div class="message-meta">${m.at || ''}</div>
            </div>
          </div>
        `;
      })
      .join('');

    messagesConversationBodyEl.scrollTop = messagesConversationBodyEl.scrollHeight;
  }

  function openDemoThread(threadId) {
    activeThreadId = threadId;
    const thread = demoThreads.find((t) => t.id === threadId);
    renderMessagesThreadList();
    renderMessagesConversation(thread);
  }

  async function initMessagesPage() {
    if (!messagesThreadListEl) return;

    renderMessagesThreadList();
    renderMessagesConversation(null);

    // tıklama ile sohbet açma
    messagesThreadListEl.addEventListener('click', (e) => {
      const li = e.target.closest('.messages-thread-item');
      if (!li) return;
      const id = li.getAttribute('data-thread-id');
      if (!id) return;
      openDemoThread(id);
    });

    // gönderme formu
    if (messagesSendFormEl && messagesInputEl) {
      messagesSendFormEl.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = messagesInputEl.value.trim();
        if (!text || !activeThreadId) return;

        const thread = demoThreads.find((t) => t.id === activeThreadId);
        if (!thread) return;

        thread.messages.push({
          fromMe: true,
          text,
          at: 'şimdi',
        });
        thread.lastMessage = text;
        messagesInputEl.value = '';
        renderMessagesThreadList();
        renderMessagesConversation(thread);
      });
    }
  }

  // SPA router dışarıda olduğu için globalde tutuyoruz
  window.futureAppInitMessages = initMessagesPage;


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
        <div style="display:flex; gap:8px; align-items:center; justify-content:space-between;">
          <button type="button" class="btn ghost-btn open-full-profile" data-user-id="${escapeHtml(u.id)}">
            <strong>${escapeHtml(u.username)}</strong>
          </button>

          <button type="button" class="btn secondary-btn open-full-profile" data-user-id="${escapeHtml(u.id)}">
            Tam profil
          </button>
        </div>
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
        // Çözülen tahmini olan kategorileri al
        const nonEmpty = categoryStats.filter(
          (c) => (c.resolved || 0) > 0
        );

        // Accuracy'e göre sıralayıp ilk 3'ü al (eşitlikte resolved'a göre)
        const top = [...nonEmpty]
          .sort((a, b) => {
            const accA = a.accuracy ?? 0;
            const accB = b.accuracy ?? 0;
            if (accB !== accA) return accB - accA;
            return (b.resolved || 0) - (a.resolved || 0);
          })
          .slice(0, 3);

        let html = '';

        if (top.length) {
          html += `
            <h4 style="margin-top:4px; margin-bottom:2px;">En başarılı kategoriler</h4>
            <div class="profile-category-highlights">
          `;

          top.forEach((c) => {
            const acc = c.accuracy ?? 0;
            let tierClass = 'tier-5';
            if (acc >= 85) tierClass = 'tier-1';
            else if (acc >= 70) tierClass = 'tier-2';
            else if (acc >= 50) tierClass = 'tier-3';
            else if (acc >= 25) tierClass = 'tier-4';

            html += `
              <div class="profile-category-pill ${tierClass}">
                <span class="profile-category-pill-label">
                  ${escapeHtml(c.label || c.key || '')}
                </span>
                <span class="profile-category-pill-value">%${acc}</span>
              </div>
            `;
          });

          html += `
            </div>
          `;
        }

        // Altına tüm kategoriler tablosunu koy
        html += `
          <h4 style="margin-top:6px; margin-bottom:4px;">Tüm kategoriler</h4>
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
              <td style="text-align:right;">${c.accuracy ?? 0}%</td>
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
                const canVote = !isLocked && rawStatus === 'pending';

      const voteButtonsHtml = canVote
        ? `
        <div class="resolution-vote-buttons">
          <button
            type="button"
            class="resolution-vote-btn"
            onclick="window.handleResolutionVote(event, '${p.id}', 'correct')"
          >
            Doğru
          </button>
          <button
            type="button"
            class="resolution-vote-btn"
            onclick="window.handleResolutionVote(event, '${p.id}', 'incorrect')"
          >
            Yanlış
          </button>
        </div>
      `
        : '';

          const titleText = escapeHtml(p.title || '(Başlık yok)');

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
                ${voteButtonsHtml}
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

     // Kategori istatistikleri ve rozetler
    if (u && u.id) {
      renderProfileCategoryStats(u.id);
    } else {
      renderProfileCategoryStats(userId);
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
          predictionMessageEl.textContent = t('errors.login_required');
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
          predictionMessageEl.textContent = t('errors.date_past');
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
          predictionMessageEl.textContent = t('prediction.form.success', {
            date: targetDate,
          });
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

    // Liderlik tablosunda bir kullanıcı adına tıklanınca profilini aç
  if (leaderboardBodyEl) {
    leaderboardBodyEl.addEventListener('click', (e) => {
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

if (leaderboardBodyEl) {
  leaderboardBodyEl.addEventListener('click', (e) => {
    const userLink = e.target.closest('.user-link');
    if (!userLink) return;

    const uid = userLink.dataset.userId;
    if (!uid) return;

    updateUserInUrl(uid);
    loadUserProfile(uid);
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

      const recipientId = dmForm.dataset.recipientId;
      if (!recipientId) {
        alert('Önce mesaj göndermek istediğin kullanıcıyı seçmelisin.');
        return;
      }

      const text = dmMessageInputEl.value.trim();
      if (!text) return;

      try {
        await api.post(
          `/api/messages/${encodeURIComponent(recipientId)}`,
          { content: text },
          authToken
        );
        dmMessageInputEl.value = '';
      } catch (err) {
        alert(err.message || 'Mesaj gönderilemedi.');
      }
    });
  }

  // DM alıcısını başka yerlerden ayarlamak için yardımcı (opsiyonel)
  window.futureAppSetDmRecipient = (recipientId) => {
    if (dmForm) dmForm.dataset.recipientId = recipientId || '';
  };


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

    // Üst seviye sayfa navigasyonu (Ana sayfa / Profil / Mesajlar / Ayarlar)
    const appPages = document.querySelectorAll('.app-page');
    const pageNavButtons = document.querySelectorAll('.primary-nav .nav-link');

    function showPage(pageId) {
      appPages.forEach((page) => {
        page.classList.toggle('app-page-active', page.id === pageId);
      });
    }

    pageNavButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-page');
        if (!target) return;

        pageNavButtons.forEach((b) => b.classList.remove('nav-link-active'));
        btn.classList.add('nav-link-active');

        showPage(target);

        // Profil sayfasına geçiliyorsa, verileri yükle
        if (target === 'page-profile') {
          if (window.futureAppLoadMyProfilePage) {
            window.futureAppLoadMyProfilePage();
          }
        }
        // Mesajlar sayfasına geçiliyorsa, mesaj layout'unu hazırla
        if (target === 'page-messages') {
          if (window.futureAppInitMessages) {
            window.futureAppInitMessages();
          }
        }
      });
    });

    // Sayfa yenilendiğinde profil zaten aktifse (örn. direkt linkle gelirse)
    const initialActivePage = document.querySelector('.app-page.app-page-active');
    if (initialActivePage && initialActivePage.id === 'page-profile') {
    if (window.futureAppLoadMyProfilePage) {
      window.futureAppLoadMyProfilePage();
    }
  }

    // --- i18n setup ---
  const supportedLangs = ['tr', 'en'];
  const langStorageKey = 'futureapp_lang';

  let currentLang =
    localStorage.getItem(langStorageKey) ||
    (navigator.language && navigator.language.startsWith('tr')
      ? 'tr'
      : 'en');

  if (!supportedLangs.includes(currentLang)) {
    currentLang = 'en';
  }

  let translations = {};

  function t(key, vars = {}) {
    // Çeviri yoksa key'in kendisini gösterme, ama şu an için fallback key olsun
    const raw =
      Object.prototype.hasOwnProperty.call(translations, key)
        ? translations[key]
        : key;

    return raw.replace(/\{\{(\w+)\}\}/g, (_, name) =>
      vars[name] != null ? String(vars[name]) : ''
    );
  }

  function applyTranslationsToDom() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      el.textContent = t(key);
    });
  }

  async function loadTranslations(lang) {
    try {
      const res = await fetch(`/i18n/${lang}.json`);
      if (!res.ok) throw new Error('Translations not found');
      translations = await res.json();
      currentLang = lang;
      localStorage.setItem(langStorageKey, lang);
      applyTranslationsToDom();
    } catch (err) {
      console.error('Translation load error:', err);
    }
  }


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



  // Başlangıçta seçili dilin çevirilerini yükle
  loadTranslations(currentLang);

  // Sağ profilden "Tam profil" navigasyonu (ID standardı)
document.body.addEventListener('click', (e) => {
  const btn = e.target.closest('.open-full-profile');
  if (!btn) return;

  e.preventDefault();
  e.stopPropagation();

  const uid = btn.dataset.userId;
  if (!uid) {
    console.warn('open-full-profile clicked but no data-user-id found');
    return;
  }

  // URL güncelle (varsa)
  try {
    if (typeof updateUserInUrl === 'function') updateUserInUrl(uid);
  } catch (err) {
    console.warn('updateUserInUrl error:', err);
  }

  // Profil sayfasına geç: önce showPage, yoksa Profile nav'ına click
  try {
    if (typeof showPage === 'function') {
      showPage('page-profile');
    } else {
      const profileNav = document.querySelector('.primary-nav .nav-link[data-page="page-profile"]');
      if (profileNav) profileNav.click();
    }
  } catch (err) {
    console.warn('showPage/nav error:', err);
  }

  // Full profil render
  try {
    if (typeof window.loadUserFullPage === 'function') {
      window.loadUserFullPage(uid);
    } else {
      console.warn('loadUserFullPage is not defined on window');
    }
  } catch (err) {
    console.error('loadUserFullPage error:', err);
  }
});

});


