// Basit frontend: auth, tahmin oluşturma ve feed gösterimi

let authToken = null;
let currentUser = null;

// DOM elemanlarını al
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
      predictionMessageEl.textContent = 'Tahmin göndermek için giriş yapmanız gerekiyor.';
      predictionMessageEl.className = 'message error';
      feedListEl.innerHTML = '<p class="small">Feed için önce giriş yapın.</p>';
    } else {
      userInfoEl.textContent = `Merhaba, ${currentUser.username}`;
      logoutBtn.style.display = 'inline-block';
      loginForm.style.display = 'none';
      registerForm.style.display = 'none';
      predictionSection.classList.remove('disabled');
      predictionMessageEl.textContent = '';
      predictionMessageEl.className = 'message';

      // Giriş yaptıktan sonra feed'i yükle
      loadFeed();
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
          '<p class="small">Takip ettiklerinden veya senden, zamanı gelmiş tahmin bulunmuyor.</p>';
        return;
      }

      feedListEl.innerHTML = '';

      items.forEach((p) => {
        const div = document.createElement('div');
        div.className = 'feed-item';

        const statusLabel =
          p.status === 'correct'
            ? 'Doğru'
            : p.status === 'incorrect'
            ? 'Yanlış'
            : 'Bekliyor';

        div.innerHTML = `
          <div class="feed-header">
            <span class="feed-user">${p.username}</span>
            <span class="feed-category">${p.category}</span>
            <span class="feed-date">${p.targetDate}</span>
          </div>
          <div class="feed-content">${p.content}</div>
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

      predictionMessageEl.textContent =
        'Tahmin başarıyla mühürlendi. Hedef tarihinde feed’de görünecek.';
      predictionMessageEl.className = 'message success';
      predictionForm.reset();

      // Hedef tarih bugünse feed'i yenileyelim
      const todayStr = new Date().toISOString().split('T')[0];
      if (targetDate <= todayStr) {
        loadFeed();
      }
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
  }
});
