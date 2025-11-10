// Frontend: auth, tahmin, feed, benim tahminlerim, takip ettiklerim, profil ve DM

let authToken = null;
let currentUser = null;
let currentDmUser = null; // seçili DM kullanıcısı

document.addEventListener('DOMContentLoaded', () => {
  const userInfoEl = document.getElementById('user-info');
  const logoutBtn = document.getElementById('logout-btn');

  const registerForm = document.getElementById('register-form');
  const loginForm = document.getElementById('login-form');
  const authMessageEl = document.getElementById('auth-message');

  const predictionSection = document.getElementById('prediction-section');
  const predictionForm = document.getElementById('prediction-form');
  const predictionContentEl = document.getElementById('prediction-content');
  const predictionTitleEl = document.getElementById('prediction-title');

  const myPredictionsFilterCategoryEl = document.getElementById(
    'my-predictions-filter-category'
  );
  const myPredictionsFilterStatusEl = document.getElementById(
    'my-predictions-filter-status'
  );
  const myPredictionsClearFiltersBtn = document.getElementById(
    'my-predictions-clear-filters'
  );
    if (myPredictionsFilterCategoryEl && myPredictionsFilterStatusEl) {
    const triggerFilter = () => {
      loadMyPredictions({
        category: myPredictionsFilterCategoryEl.value || undefined,
        status: myPredictionsFilterStatusEl.value || undefined,
      });
    };

    myPredictionsFilterCategoryEl.addEventListener('change', triggerFilter);
    myPredictionsFilterStatusEl.addEventListener('change', triggerFilter);

    if (myPredictionsClearFiltersBtn) {
      myPredictionsClearFiltersBtn.addEventListener('click', () => {
        myPredictionsFilterCategoryEl.value = '';
        myPredictionsFilterStatusEl.value = '';
        loadMyPredictions(); // filtresiz
      });
    }
  }

  const predictionDateEl = document.getElementById('prediction-date');
  const categorySelectEl = document.getElementById('prediction-category');
  const predictionMessageEl = document.getElementById('prediction-message');
  


  const feedListEl = document.getElementById('feed-list');
  const myPredictionsListEl = document.getElementById('my-predictions-list');
  const followingListEl = document.getElementById('following-list');
  const profileDetailsEl = document.getElementById('profile-details');
  const profilePredictionsEl = document.getElementById('profile-predictions');

  const dmSelectedUserEl = document.getElementById('dm-selected-user');
  const dmMessagesEl = document.getElementById('dm-messages');
  const dmForm = document.getElementById('dm-form');
  const dmInputEl = document.getElementById('dm-input');
  const dmStatusEl = document.getElementById('dm-message-status');

  // LocalStorage'dan auth bilgisi yükle
  const stored = localStorage.getItem('auth');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      authToken = parsed.token;
      currentUser = parsed.user;
    } catch (e) {
      console.warn('Failed to parse stored auth:', e);
      localStorage.removeItem('auth');
    }
  }

  function setAuth(token, user) {
    authToken = token || null;
    currentUser = user || null;
    currentDmUser = null;

    if (token && user) {
      localStorage.setItem('auth', JSON.stringify({ token, user }));
    } else {
      localStorage.removeItem('auth');
    }

    updateAuthUI();
  }

  function updateAuthUI() {
    if (!authToken || !currentUser) {
      userInfoEl.textContent = 'Giriş yapmadınız';
      logoutBtn.style.display = 'none';
      loginForm.style.display = '';
      registerForm.style.display = '';
      predictionSection.classList.add('disabled');
      predictionMessageEl.textContent =
        'Tahmin göndermek için giriş yapmanız gerekiyor.';
      predictionMessageEl.className = 'message error';

      feedListEl.innerHTML =
        '<p class="small">Feed için önce giriş yapın.</p>';
      myPredictionsListEl.innerHTML =
        '<p class="small">Tahminlerinizi görmek için önce giriş yapın.</p>';
      followingListEl.innerHTML =
        '<p class="small">Takip ettiklerinizi görmek için önce giriş yapın.</p>';
      profileDetailsEl.innerHTML =
        '<p class="small">Bir kullanıcı seçmek için sağ taraftan takip ettiklerinize tıklayın.</p>';
      profilePredictionsEl.innerHTML =
        '<p class="small">Bir kullanıcı seçmek için sağ taraftan takip ettiklerinize tıklayın.</p>';

      dmSelectedUserEl.textContent =
        'Henüz bir kullanıcı seçmediniz. Sağ taraftan "Takip ettiklerim" listesinden birini seçip mesajlaşabilirsiniz.';
      dmMessagesEl.innerHTML = '<p class="small">Mesaj yok.</p>';
      dmStatusEl.textContent = '';
      dmStatusEl.className = 'message';
    } else {
      userInfoEl.textContent = `Merhaba, ${currentUser.username}`;
      logoutBtn.style.display = 'inline-block';
      loginForm.style.display = 'none';
      registerForm.style.display = 'none';
      predictionSection.classList.remove('disabled');
      predictionMessageEl.textContent = '';
      predictionMessageEl.className = 'message';

      loadFeed();
      loadMyPredictions();
      loadFollowing();
      loadUserProfile(currentUser.id);
      dmSelectedUserEl.textContent =
        'Mesajlaşmak için sağ taraftan bir kullanıcı seçin.';
      dmMessagesEl.innerHTML =
        '<p class="small">Bir kullanıcı seçilmedi.</p>';
    }
  }

    async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Kategori yüklenemedi.');
    }

    // 🔹 Tahmin formundaki kategori select'i doldur
    if (categorySelectEl) {
      categorySelectEl.innerHTML = '';

      data.data.forEach((cat) => {
        const opt = document.createElement('option');
        opt.value = cat.key;
        opt.textContent = cat.label;
        categorySelectEl.appendChild(opt);
      });
    }

    // 🔹 "Benim tahminlerim" filtresi için kategori select'i doldur
    if (myPredictionsFilterCategoryEl) {
      myPredictionsFilterCategoryEl.innerHTML = '';

      const allOpt = document.createElement('option');
      allOpt.value = '';
      allOpt.textContent = 'Tüm kategoriler';
      myPredictionsFilterCategoryEl.appendChild(allOpt);

      data.data.forEach((cat) => {
        const opt = document.createElement('option');
        opt.value = cat.key;
        opt.textContent = cat.label;
        myPredictionsFilterCategoryEl.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Kategori yükleme hatası:', err);

    // Hata olursa en azından select boş kalmasın
    if (categorySelectEl) {
      categorySelectEl.innerHTML = '';
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Yüklenemedi';
      categorySelectEl.appendChild(opt);
    }
  }
}



  async function loadFeed() {
    if (!authToken) {
      feedListEl.innerHTML = '<p class="small">Feed için önce giriş yapın.</p>';
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
      if (items.length === 0) {
        feedListEl.innerHTML =
          '<p class="small">Takip ettiklerinden veya senden, tahmin bulunmuyor.</p>';
        return;
      }

      feedListEl.innerHTML = '';

      items.forEach((p) => {
        const div = document.createElement('div');
        div.className = 'feed-item';

        const statusLabel = p.isLocked
          ? 'Mühürlü'
          : p.status === 'correct'
          ? 'Doğru'
          : p.status === 'incorrect'
          ? 'Yanlış'
          : 'Bekliyor';

        const contentText = p.isLocked
          ? 'Bu kategoride mühürlü bir tahmin var. İçerik açılma tarihinde görünecek.'
          : p.content;

        div.innerHTML = `
          <div class="feed-header">
            <span class="feed-user">${p.username}</span>
            <span class="feed-category">${p.category}${
          p.isLocked ? ' 🔒' : ''
        }</span>
            <span class="feed-date">${p.targetDate}</span>
          </div>
          <div class="feed-content">${contentText}</div>
          <div class="feed-footer">Durum: ${statusLabel}</div>
        `;

        feedListEl.appendChild(div);
      });
    } catch (err) {
      console.error(err);
      feedListEl.innerHTML =
        '<p class="small">Feed yüklenirken bir hata oluştu.</p>';
    }
  }

  async function loadMyPredictions(options = {}) {
    if (!authToken) {
      myPredictionsListEl.innerHTML =
        '<p class="small">Tahminlerinizi görmek için giriş yapın.</p>';
      return;
    }

    try {
      const params = new URLSearchParams();
      if (options.category) params.append('category', options.category);
      if (options.status) params.append('status', options.status);

      const qs = params.toString() ? `?${params.toString()}` : '';

      const res = await fetch(`/api/predictions/mine${qs}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Tahminler yüklenemedi.');
      }

      const items = data.data || [];

      if (items.length === 0) {
        myPredictionsListEl.innerHTML =
          '<p class="small">Henüz tahmininiz yok (veya filtrelere uyan tahmin bulunamadı).</p>';
        return;
      }

      myPredictionsListEl.innerHTML = '';

      items.forEach((p) => {
        const div = document.createElement('div');
        div.className = 'feed-item';

        const statusLabel =
          p.status === 'correct'
            ? 'Doğru'
            : p.status === 'incorrect'
            ? 'Yanlış'
            : 'Bekliyor';

        const headerTitle = p.isLocked
          ? 'Mühürlü tahmin'
          : p.title || '(Başlık yok)';

        const contentHtml = p.isLocked
          ? '<span class="small">İçerik hedef tarih gelene kadar gizli.</span>'
          : p.content;

        div.innerHTML = `
          <div class="feed-header">
            <span class="feed-category">${p.category}</span>
            <span class="feed-date">${p.targetDate || ''}</span>
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
      console.error(err);
      myPredictionsListEl.innerHTML =
        '<p class="small">Tahminler yüklenirken bir hata oluştu.</p>';
    }
  }


  async function loadFollowing() {
    if (!authToken) {
      followingListEl.innerHTML =
        '<p class="small">Takip ettiklerinizi görmek için önce giriş yapın.</p>';
      return;
    }

    try {
      const res = await fetch('/api/follow/following', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Takip ettikleriniz yüklenemedi.');
      }

      const items = data.following || [];
      if (items.length === 0) {
        followingListEl.innerHTML =
          '<p class="small">Henüz kimseyi takip etmiyorsunuz.</p>';
        return;
      }

      followingListEl.innerHTML = '';

      items.forEach((u) => {
        const div = document.createElement('div');
        div.className = 'feed-item';

        const profileBtn = document.createElement('button');
        profileBtn.type = 'button';
        profileBtn.textContent = 'Profili gör';
        profileBtn.style.marginTop = '6px';
        profileBtn.addEventListener('click', () => {
          loadUserProfile(u.id);
        });

        const dmBtn = document.createElement('button');
        dmBtn.type = 'button';
        dmBtn.textContent = 'Mesajlaş';
        dmBtn.style.marginTop = '6px';
        dmBtn.style.marginLeft = '6px';
        dmBtn.addEventListener('click', () => {
          startConversation(u);
        });

        div.innerHTML = `
          <div class="feed-header">
            <span class="feed-user">${u.username}</span>
            <span class="feed-date small">Takip edildi: ${
              new Date(u.followedAt).toISOString().split('T')[0]
            }</span>
          </div>
          <div class="feed-content small">${u.email || ''}</div>
        `;

        const btnWrapper = document.createElement('div');
        btnWrapper.style.marginTop = '4px';
        btnWrapper.appendChild(profileBtn);
        btnWrapper.appendChild(dmBtn);

        div.appendChild(btnWrapper);
        followingListEl.appendChild(div);
      });
    } catch (err) {
      console.error(err);
      followingListEl.innerHTML =
        '<p class="small">Takip ettikleriniz yüklenirken bir hata oluştu.</p>';
    }
  }

    async function loadUserProfile(userId) {
    if (!authToken) {
      profileDetailsEl.innerHTML =
        '<p class="small">Profil görmek için önce giriş yapın.</p>';
      profilePredictionsEl.innerHTML =
        '<p class="small">Profil tahminlerini görmek için önce giriş yapın.</p>';
      return;
    }

    if (!userId) {
      profileDetailsEl.innerHTML =
        '<p class="small">Bir kullanıcı seçmek için sağ taraftan takip ettiklerinize tıklayın.</p>';
      profilePredictionsEl.innerHTML =
        '<p class="small">Bir kullanıcı seçmek için sağ taraftan takip ettiklerinize tıklayın.</p>';
      return;
    }

    try {
      const res = await fetch(`/api/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Profil yüklenemedi.');
      }

      const createdStr = new Date(data.createdAt)
        .toISOString()
        .split('T')[0];

      profileDetailsEl.innerHTML = `
        <div class="feed-item">
          <div class="feed-header">
            <span class="feed-user">${data.username}</span>
            <span class="feed-date">Katılım: ${createdStr}</span>
          </div>
          <div class="feed-content">
            <div class="small">${data.email || ''}</div>
            <div class="small">
              Tahmin sayısı: <strong>${data.predictionCount}</strong><br/>
              Takipçi: <strong>${data.followerCount}</strong> · Takip ettikleri: <strong>${data.followingCount}</strong>
            </div>
          </div>
          <div class="feed-footer">
            ${
              data.isMe
                ? 'Bu sizsiniz.'
                : data.isFollowing
                ? 'Takip ediyorsunuz.'
                : 'Takip etmiyorsunuz.'
            }
          </div>
        </div>
      `;

      // ✅ Profil yüklendikten sonra, aynı kullanıcı için açılmış tahminleri getir
      loadProfilePredictions(userId);
    } catch (err) {
      console.error(err);
      profileDetailsEl.innerHTML =
        '<p class="small">Profil yüklenirken bir hata oluştu.</p>';
      profilePredictionsEl.innerHTML =
        '<p class="small">Profil tahminleri yüklenirken bir hata oluştu.</p>';
    }
  }

    async function loadProfilePredictions(userId) {
    if (!authToken) {
      profilePredictionsEl.innerHTML =
        '<p class="small">Profil tahminlerini görmek için önce giriş yapın.</p>';
      return;
    }

    if (!userId) {
      profilePredictionsEl.innerHTML =
        '<p class="small">Bir kullanıcı seçmek için sağ taraftan takip ettiklerinize tıklayın.</p>';
      return;
    }

    try {
      const res = await fetch(`/api/users/${userId}/predictions`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || 'Profil tahminleri yüklenemedi.'
        );
      }

      const items = data.data || [];

      if (items.length === 0) {
        profilePredictionsEl.innerHTML =
          '<p class="small">Bu kullanıcının açılmış tahmini yok.</p>';
        return;
      }

      profilePredictionsEl.innerHTML = '';

      items.forEach((p) => {
        const div = document.createElement('div');
        div.className = 'feed-item';

        const statusLabel =
          p.status === 'correct'
            ? 'Doğru'
            : p.status === 'incorrect'
            ? 'Yanlış'
            : 'Bekliyor';

        const createdStr = p.createdAt || '';

        div.innerHTML = `
          <div class="feed-header">
            <span class="feed-category">${p.category}</span>
            <span class="feed-date">${p.targetDate}</span>
          </div>
          <div class="feed-content">${p.content}</div>
          <div class="feed-footer">
            Durum: ${statusLabel}${
          createdStr ? ` · Oluşturma: ${createdStr}` : ''
        }
          </div>
        `;

        profilePredictionsEl.appendChild(div);
      });
    } catch (err) {
      console.error(err);
      profilePredictionsEl.innerHTML =
        '<p class="small">Profil tahminleri yüklenirken bir hata oluştu.</p>';
    }
  }


  // DM başlat
  function startConversation(user) {
    currentDmUser = user;
    dmStatusEl.textContent = '';
    dmStatusEl.className = 'message';

    dmSelectedUserEl.textContent = `${user.username} ile mesajlaşma`;
    loadConversation(user.id);
  }

  // DM konuşmasını yükle
  async function loadConversation(userId) {
    if (!authToken) {
      dmMessagesEl.innerHTML =
        '<p class="small">Mesajlaşmak için önce giriş yapın.</p>';
      return;
    }

    try {
      const res = await fetch(`/api/messages/conversation/${userId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Mesajlar yüklenemedi.');
      }

      const messages = data.messages || [];
      if (messages.length === 0) {
        dmMessagesEl.innerHTML =
          '<p class="small">Henüz mesaj yok. İlk mesajı siz gönderebilirsiniz.</p>';
        return;
      }

      dmMessagesEl.innerHTML = '';
      messages.forEach((m) => {
        const div = document.createElement('div');
        div.className = 'dm-message' + (m.fromSelf ? ' self' : '');

        const timeStr = new Date(m.createdAt)
          .toISOString()
          .split('T')[1]
          .slice(0, 5);

        div.innerHTML = `
          <div class="dm-message-meta">
            ${m.fromSelf ? 'Siz' : currentDmUser?.username || 'Karşı taraf'} · ${timeStr}
          </div>
          <div class="dm-message-content">${m.content}</div>
        `;

        dmMessagesEl.appendChild(div);
      });

      // Listeyi en alta kaydır
      dmMessagesEl.scrollTop = dmMessagesEl.scrollHeight;
    } catch (err) {
      console.error(err);
      dmMessagesEl.innerHTML =
        '<p class="small">Mesajlar yüklenirken bir hata oluştu.</p>';
    }
  }

  // DM formu gönderme
  dmForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    dmStatusEl.textContent = '';
    dmStatusEl.className = 'message';

    if (!authToken) {
      dmStatusEl.textContent = 'Mesaj göndermek için önce giriş yapın.';
      dmStatusEl.className = 'message error';
      return;
    }

    if (!currentDmUser) {
      dmStatusEl.textContent =
        'Önce sağ taraftan bir kullanıcı seçin.';
      dmStatusEl.className = 'message error';
      return;
    }

    const content = dmInputEl.value.trim();
    if (!content) {
      dmStatusEl.textContent = 'Boş mesaj gönderemezsiniz.';
      dmStatusEl.className = 'message error';
      return;
    }

    try {
      const res = await fetch(
        `/api/messages/${currentDmUser.id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ content }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        dmStatusEl.textContent =
          data.error || 'Mesaj gönderilemedi.';
        dmStatusEl.className = 'message error';
        return;
      }

      dmInputEl.value = '';
      dmStatusEl.textContent = 'Mesaj gönderildi.';
      dmStatusEl.className = 'message success';

      // Konuşmayı yeniden yükle
      loadConversation(currentDmUser.id);
    } catch (err) {
      console.error(err);
      dmStatusEl.textContent =
        'Mesaj gönderilirken bir hata oluştu.';
      dmStatusEl.className = 'message error';
    }
  });

  // Kayıt formu
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authMessageEl.textContent = '';
    authMessageEl.className = 'message';

    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document
      .getElementById('register-password')
      .value.trim();

    if (!username || !email || !password) {
      authMessageEl.textContent = 'Lütfen tüm kayıt alanlarını doldurun.';
      authMessageEl.className = 'message error';
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        authMessageEl.textContent = data.error || 'Kayıt başarısız.';
        authMessageEl.className = 'message error';
        return;
      }

      authMessageEl.textContent =
        'Kayıt başarılı. Şimdi sağ taraftan giriş yapabilirsiniz.';
      authMessageEl.className = 'message success';
      registerForm.reset();
    } catch (err) {
      console.error(err);
      authMessageEl.textContent = 'Kayıt sırasında bir hata oluştu.';
      authMessageEl.className = 'message error';
    }
  });

  // Giriş formu
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authMessageEl.textContent = '';
    authMessageEl.className = 'message';

    const identifier = document
      .getElementById('login-identifier')
      .value.trim();
    const password = document
      .getElementById('login-password')
      .value.trim();

    if (!identifier || !password) {
      authMessageEl.textContent = 'Lütfen giriş bilgilerini doldurun.';
      authMessageEl.className = 'message error';
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailOrUsername: identifier,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        authMessageEl.textContent = data.error || 'Giriş başarısız.';
        authMessageEl.className = 'message error';
        return;
      }

      setAuth(data.token, data.user);
      authMessageEl.textContent = 'Giriş başarılı.';
      authMessageEl.className = 'message success';
      loginForm.reset();
    } catch (err) {
      console.error(err);
      authMessageEl.textContent = 'Giriş sırasında bir hata oluştu.';
      authMessageEl.className = 'message error';
    }
  });

  // Çıkış
  logoutBtn.addEventListener('click', () => {
    setAuth(null, null);
    authMessageEl.textContent = 'Çıkış yapıldı.';
    authMessageEl.className = 'message';
  });

// Tahmin formu
predictionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  predictionMessageEl.textContent = '';
  predictionMessageEl.className = 'message';

  // 🔐 Giriş kontrolü
  if (!authToken) {
    predictionMessageEl.textContent =
      'Tahmin göndermek için önce giriş yapın.';
    predictionMessageEl.className = 'message error';
    return;
  }

  // 🆕 Başlık + içerik + tarih + kategori
  const title = predictionTitleEl.value.trim();          // <--- yeni satır
  const content = predictionContentEl.value.trim();
  const targetDate = predictionDateEl.value;
  const category = categorySelectEl.value;

  // 🧪 Validasyon
  if (!title) {
    predictionMessageEl.textContent = 'Lütfen bir başlık girin.';
    predictionMessageEl.className = 'message error';
    return;
  }

  if (!content || !targetDate || !category) {
    predictionMessageEl.textContent =
      'Lütfen tahmin, tarih ve kategoriyi doldurun.';
    predictionMessageEl.className = 'message error';
    return;
  }

  // 📤 API isteği
  try {
    const res = await fetch('/api/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ title, content, targetDate, category }), // <-- title da gidiyor
    });

    const data = await res.json();

    if (!res.ok) {
      predictionMessageEl.textContent =
        data.error || 'Tahmin oluşturulamadı.';
      predictionMessageEl.className = 'message error';
      return;
    }

    predictionMessageEl.textContent = 'Tahmin başarıyla mühürlendi.';
    predictionMessageEl.className = 'message success';

    // Formu sıfırla
    predictionForm.reset();
    // (İstersen ekstra güvenlik için:)
    // predictionTitleEl.value = '';
    // predictionContentEl.value = '';

    // Listeleri güncelle
    loadFeed();
    loadMyPredictions();
  } catch (err) {
    console.error(err);
    predictionMessageEl.textContent =
      'Tahmin gönderilirken bir hata oluştu.';
    predictionMessageEl.className = 'message error';
  }
});


  // İlk yüklemede UI ve kategoriler
  updateAuthUI();
  loadCategories();
  if (authToken) {
    loadFeed();
    loadMyPredictions();
    loadFollowing();
    loadUserProfile(currentUser?.id);
  }
});
