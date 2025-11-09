// Basit frontend: auth, tahmin oluşturma, feed, "benim tahminlerim" ve takip ettiğim kullanıcılar + profil

let authToken = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  const userInfoEl = document.getElementById('user-info');
  const logoutBtn = document.getElementById('logout-btn');

  const registerForm = document.getElementById('register-form');
  const loginForm = document.getElementById('login-form');
  const authMessageEl = document.getElementById('auth-message');

  const predictionSection = document.getElementById('prediction-section');
  const predictionForm = document.getElementById('prediction-form');
  const predictionContentEl = document.getElementById('prediction-content');
  const predictionDateEl = document.getElementById('prediction-date');
  const categorySelectEl = document.getElementById('prediction-category');
  const predictionMessageEl = document.getElementById('prediction-message');

  const feedListEl = document.getElementById('feed-list');
  const myPredictionsListEl = document.getElementById('my-predictions-list');
  const followingListEl = document.getElementById('following-list');
  const profileDetailsEl = document.getElementById('profile-details');

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
    } else {
      userInfoEl.textContent = `Merhaba, ${currentUser.username}`;
      logoutBtn.style.display = 'inline-block';
      loginForm.style.display = 'none';
      registerForm.style.display = 'none';
      predictionSection.classList.remove('disabled');
      predictionMessageEl.textContent = '';
      predictionMessageEl.className = 'message';

      // Giriş yaptıktan sonra feed, kendi tahminlerim, takip ettiklerim ve profil
      loadFeed();
      loadMyPredictions();
      loadFollowing();
      loadUserProfile(currentUser.id); // varsayılan olarak kendi profilimiz
    }
  }

  async function loadCategories() {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      categorySelectEl.innerHTML = '';

      if (!res.ok) {
        throw new Error(data.error || 'Kategori yüklenemedi.');
      }

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Kategori seçin';
      categorySelectEl.appendChild(placeholder);

      (data.data || []).forEach((cat) => {
        const opt = document.createElement('option');
        opt.value = cat.key;
        opt.textContent = cat.label;
        categorySelectEl.appendChild(opt);
      });
    } catch (err) {
      console.error(err);
      categorySelectEl.innerHTML = '';
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Kategori yüklenemedi';
      categorySelectEl.appendChild(opt);
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

  // Benim tahminlerim
  async function loadMyPredictions() {
    if (!authToken) {
      myPredictionsListEl.innerHTML =
        '<p class="small">Tahminlerinizi görmek için önce giriş yapın.</p>';
      return;
    }

    try {
      const res = await fetch('/api/predictions/mine', {
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
          '<p class="small">Henüz tahmininiz yok.</p>';
        return;
      }

      myPredictionsListEl.innerHTML = '';

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
          ? 'Mühürlü tahmin. İçerik açılma tarihinde görünecek.'
          : p.content;

        const lockTag = p.isLocked ? ' 🔒' : '';

        div.innerHTML = `
          <div class="feed-header">
            <span class="feed-category">${p.category}${lockTag}</span>
            <span class="feed-date">${p.targetDate}</span>
          </div>
          <div class="feed-content">${contentText}</div>
          <div class="feed-footer">Durum: ${statusLabel}</div>
        `;

        myPredictionsListEl.appendChild(div);
      });
    } catch (err) {
      console.error(err);
      myPredictionsListEl.innerHTML =
        '<p class="small">Tahminler yüklenirken bir hata oluştu.</p>';
    }
  }

  // Takip ettiklerim
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

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'Profili gör';
        btn.style.marginTop = '6px';
        btn.addEventListener('click', () => {
          loadUserProfile(u.id);
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

        div.appendChild(btn);
        followingListEl.appendChild(div);
      });
    } catch (err) {
      console.error(err);
      followingListEl.innerHTML =
        '<p class="small">Takip ettikleriniz yüklenirken bir hata oluştu.</p>';
    }
  }

  // Profil detayı
  async function loadUserProfile(userId) {
    if (!authToken) {
      profileDetailsEl.innerHTML =
        '<p class="small">Profil görmek için önce giriş yapın.</p>';
      return;
    }

    if (!userId) {
      profileDetailsEl.innerHTML =
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
    } catch (err) {
      console.error(err);
      profileDetailsEl.innerHTML =
        '<p class="small">Profil yüklenirken bir hata oluştu.</p>';
    }
  }

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

    if (!authToken) {
      predictionMessageEl.textContent =
        'Tahmin göndermek için önce giriş yapın.';
      predictionMessageEl.className = 'message error';
      return;
    }

    const content = predictionContentEl.value.trim();
    const targetDate = predictionDateEl.value;
    const category = categorySelectEl.value;

    if (!content || !targetDate || !category) {
      predictionMessageEl.textContent =
        'Lütfen tahmin, tarih ve kategoriyi doldurun.';
      predictionMessageEl.className = 'message error';
      return;
    }

    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ content, targetDate, category }),
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
      predictionForm.reset();

      // Tahminlerden sonra feed ve benim tahminlerim güncellensin
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
