// ═══════════════════════════════════════════════════════════
// NPS PWA Studio — Firebase Authentication Module
// Supporte : Email/Mot de passe + Google Sign-In
// Compatible WebView Android (Firebase v8 compat)
// ═══════════════════════════════════════════════════════════

(function () {
  // ── Attendre que Firebase soit prêt ──────────────────────
  function waitForFirebase(callback) {
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
      callback();
    } else {
      setTimeout(function () { waitForFirebase(callback); }, 100);
    }
  }

  // ── Injecter les styles de l'overlay auth ────────────────
  function injectStyles() {
    var style = document.createElement('style');
    style.innerHTML = `
      #auth-overlay {
        position: fixed; inset: 0; z-index: 99999;
        background: #0a0a14;
        display: flex; align-items: center; justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        padding: 20px; box-sizing: border-box;
      }
      #auth-overlay * { box-sizing: border-box; }
      .auth-card {
        background: #13131f;
        border: 1px solid rgba(124,110,255,0.2);
        border-radius: 20px;
        padding: 32px 24px;
        width: 100%; max-width: 380px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.6);
      }
      .auth-logo {
        text-align: center; margin-bottom: 24px;
      }
      .auth-logo-icon {
        width: 64px; height: 64px;
        background: linear-gradient(135deg, #7c6eff, #a78bfa);
        border-radius: 18px;
        display: inline-flex; align-items: center; justify-content: center;
        font-size: 30px; margin-bottom: 12px;
      }
      .auth-title {
        color: #fff; font-size: 22px; font-weight: 700;
        text-align: center; margin: 0 0 4px;
      }
      .auth-subtitle {
        color: #6b7280; font-size: 13px;
        text-align: center; margin: 0 0 24px;
      }
      .auth-tabs {
        display: flex; background: #0a0a14;
        border-radius: 10px; padding: 4px;
        margin-bottom: 20px;
      }
      .auth-tab {
        flex: 1; padding: 9px; border: none; background: transparent;
        color: #6b7280; font-size: 13px; font-weight: 600;
        border-radius: 8px; cursor: pointer; transition: all 0.2s;
      }
      .auth-tab.active {
        background: #7c6eff; color: #fff;
      }
      .auth-field { margin-bottom: 14px; }
      .auth-field label {
        display: block; color: #9ca3af; font-size: 12px;
        font-weight: 600; margin-bottom: 6px; text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .auth-field input {
        width: 100%; padding: 12px 14px;
        background: #0a0a14; border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px; color: #fff; font-size: 14px;
        outline: none; transition: border-color 0.2s;
      }
      .auth-field input:focus {
        border-color: #7c6eff;
      }
      .auth-field input::placeholder { color: #4b5563; }
      .auth-btn {
        width: 100%; padding: 13px;
        border: none; border-radius: 11px;
        font-size: 14px; font-weight: 700;
        cursor: pointer; transition: all 0.2s;
        margin-bottom: 10px;
      }
      .auth-btn-primary {
        background: linear-gradient(135deg, #7c6eff, #a78bfa);
        color: #fff;
      }
      .auth-btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
      .auth-btn-primary:active { transform: translateY(0); }
      .auth-btn-primary:disabled {
        opacity: 0.5; cursor: not-allowed; transform: none;
      }
      .auth-btn-google {
        background: #fff; color: #374151;
        border: 1px solid #e5e7eb;
        display: flex; align-items: center; justify-content: center; gap: 10px;
      }
      .auth-btn-google:hover { background: #f9fafb; }
      .auth-btn-google svg { width: 18px; height: 18px; }
      .auth-divider {
        display: flex; align-items: center; gap: 10px;
        margin: 14px 0; color: #4b5563; font-size: 12px;
      }
      .auth-divider::before, .auth-divider::after {
        content: ''; flex: 1;
        height: 1px; background: rgba(255,255,255,0.08);
      }
      .auth-error {
        background: rgba(239,68,68,0.1);
        border: 1px solid rgba(239,68,68,0.3);
        color: #f87171; font-size: 12px;
        padding: 10px 12px; border-radius: 8px;
        margin-bottom: 14px; display: none;
      }
      .auth-success {
        background: rgba(34,197,94,0.1);
        border: 1px solid rgba(34,197,94,0.3);
        color: #4ade80; font-size: 12px;
        padding: 10px 12px; border-radius: 8px;
        margin-bottom: 14px; display: none;
      }
      .auth-forgot {
        text-align: center; margin-top: 4px;
      }
      .auth-forgot a {
        color: #7c6eff; font-size: 12px; text-decoration: none;
      }
      .auth-user-bar {
        position: fixed; top: 0; right: 0; left: 0; z-index: 9998;
        background: rgba(10,10,20,0.95);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(124,110,255,0.15);
        padding: 8px 16px;
        display: none; align-items: center; justify-content: space-between;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      .auth-user-info {
        display: flex; align-items: center; gap: 8px;
      }
      .auth-avatar {
        width: 30px; height: 30px; border-radius: 50%;
        background: linear-gradient(135deg, #7c6eff, #a78bfa);
        display: flex; align-items: center; justify-content: center;
        color: #fff; font-size: 13px; font-weight: 700;
        overflow: hidden;
      }
      .auth-avatar img { width: 100%; height: 100%; object-fit: cover; }
      .auth-user-email {
        color: #d1d5db; font-size: 12px; max-width: 180px;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .auth-signout-btn {
        background: rgba(239,68,68,0.15);
        border: 1px solid rgba(239,68,68,0.3);
        color: #f87171; padding: 5px 12px;
        border-radius: 7px; font-size: 12px;
        cursor: pointer; font-weight: 600;
      }
      @keyframes authFadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .auth-card { animation: authFadeIn 0.4s ease; }
    `;
    document.head.appendChild(style);
  }

  // ── Créer l'overlay HTML ─────────────────────────────────
  function createOverlay() {
    var overlay = document.createElement('div');
    overlay.id = 'auth-overlay';
    overlay.innerHTML = `
      <div class="auth-card">
        <div class="auth-logo">
          <div class="auth-logo-icon">🚀</div>
          <h1 class="auth-title">PWA-APK Studio</h1>
          <p class="auth-subtitle">Connectez-vous pour continuer</p>
        </div>

        <div class="auth-tabs">
          <button class="auth-tab active" onclick="authSwitchTab('login')" id="tab-login">Connexion</button>
          <button class="auth-tab" onclick="authSwitchTab('register')" id="tab-register">Inscription</button>
        </div>

        <div id="auth-error" class="auth-error"></div>
        <div id="auth-success" class="auth-success"></div>

        <div id="auth-form-login">
          <div class="auth-field">
            <label>Email</label>
            <input type="email" id="auth-login-email" placeholder="votre@email.com" />
          </div>
          <div class="auth-field">
            <label>Mot de passe</label>
            <input type="password" id="auth-login-password" placeholder="••••••••" />
          </div>
          <button class="auth-btn auth-btn-primary" id="auth-login-btn" onclick="authLogin()">
            Se connecter
          </button>
          <div class="auth-forgot">
            <a href="#" onclick="authForgotPassword(); return false;">Mot de passe oublié ?</a>
          </div>
        </div>

        <div id="auth-form-register" style="display:none">
          <div class="auth-field">
            <label>Nom d'affichage</label>
            <input type="text" id="auth-reg-name" placeholder="Votre nom" />
          </div>
          <div class="auth-field">
            <label>Email</label>
            <input type="email" id="auth-reg-email" placeholder="votre@email.com" />
          </div>
          <div class="auth-field">
            <label>Mot de passe</label>
            <input type="password" id="auth-reg-password" placeholder="Min. 6 caractères" />
          </div>
          <button class="auth-btn auth-btn-primary" id="auth-reg-btn" onclick="authRegister()">
            Créer un compte
          </button>
        </div>

        <div class="auth-divider">ou</div>

        <button class="auth-btn auth-btn-google" onclick="authGoogle()">
          <svg viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuer avec Google
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  // ── Créer la barre utilisateur (après connexion) ──────────
  function createUserBar() {
    var bar = document.createElement('div');
    bar.id = 'auth-user-bar';
    bar.className = 'auth-user-bar';
    bar.innerHTML = `
      <div class="auth-user-info">
        <div class="auth-avatar" id="auth-avatar-el">?</div>
        <span class="auth-user-email" id="auth-user-email-el"></span>
      </div>
      <button class="auth-signout-btn" onclick="authSignOut()">Déconnexion</button>
    `;
    document.body.appendChild(bar);
  }

  // ── Afficher / masquer l'overlay ──────────────────────────
  function showOverlay() {
    var o = document.getElementById('auth-overlay');
    if (o) o.style.display = 'flex';
  }
  function hideOverlay() {
    var o = document.getElementById('auth-overlay');
    if (o) { o.style.opacity = '0'; o.style.transition = 'opacity 0.3s'; setTimeout(function () { o.remove(); }, 300); }
  }
  function showUserBar(user) {
    var bar = document.getElementById('auth-user-bar');
    if (!bar) return;
    bar.style.display = 'flex';
    var emailEl = document.getElementById('auth-user-email-el');
    var avatarEl = document.getElementById('auth-avatar-el');
    if (emailEl) emailEl.textContent = user.displayName || user.email;
    if (avatarEl) {
      if (user.photoURL) {
        avatarEl.innerHTML = '<img src="' + user.photoURL + '" />';
      } else {
        avatarEl.textContent = (user.displayName || user.email || '?')[0].toUpperCase();
      }
    }
  }

  // ── Helpers UI ────────────────────────────────────────────
  window.authSwitchTab = function (tab) {
    document.getElementById('auth-form-login').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('auth-form-register').style.display = tab === 'register' ? 'block' : 'none';
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    authClearMessages();
  };
  function authShowError(msg) {
    var el = document.getElementById('auth-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
    var s = document.getElementById('auth-success');
    if (s) s.style.display = 'none';
  }
  function authShowSuccess(msg) {
    var el = document.getElementById('auth-success');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
    var e = document.getElementById('auth-error');
    if (e) e.style.display = 'none';
  }
  function authClearMessages() {
    var e = document.getElementById('auth-error');
    var s = document.getElementById('auth-success');
    if (e) e.style.display = 'none';
    if (s) s.style.display = 'none';
  }
  function setLoading(btnId, loading) {
    var btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? 'Chargement...' : btn.dataset.label || btn.textContent;
  }

  // ── Traduction des erreurs Firebase ──────────────────────
  function firebaseErrorMsg(code) {
    var msgs = {
      'auth/user-not-found': 'Aucun compte avec cet email.',
      'auth/wrong-password': 'Mot de passe incorrect.',
      'auth/email-already-in-use': 'Cet email est déjà utilisé.',
      'auth/weak-password': 'Mot de passe trop court (min. 6 caractères).',
      'auth/invalid-email': 'Email invalide.',
      'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.',
      'auth/popup-blocked': 'Popup bloqué. Veuillez utiliser email/mot de passe.',
      'auth/operation-not-allowed': 'Cette méthode de connexion n\'est pas activée dans Firebase.',
      'auth/network-request-failed': 'Erreur réseau. Vérifiez votre connexion.',
    };
    return msgs[code] || 'Erreur : ' + code;
  }

  // ── Connexion email/mot de passe ─────────────────────────
  window.authLogin = function () {
    var email = (document.getElementById('auth-login-email') || {}).value || '';
    var pass = (document.getElementById('auth-login-password') || {}).value || '';
    if (!email || !pass) { authShowError('Remplissez tous les champs.'); return; }
    setLoading('auth-login-btn', true);
    authClearMessages();
    firebase.auth().signInWithEmailAndPassword(email.trim(), pass)
      .catch(function (err) {
        setLoading('auth-login-btn', false);
        authShowError(firebaseErrorMsg(err.code));
      });
  };

  // ── Inscription ───────────────────────────────────────────
  window.authRegister = function () {
    var name = (document.getElementById('auth-reg-name') || {}).value || '';
    var email = (document.getElementById('auth-reg-email') || {}).value || '';
    var pass = (document.getElementById('auth-reg-password') || {}).value || '';
    if (!email || !pass) { authShowError('Email et mot de passe requis.'); return; }
    setLoading('auth-reg-btn', true);
    authClearMessages();
    firebase.auth().createUserWithEmailAndPassword(email.trim(), pass)
      .then(function (cred) {
        if (name) {
          return cred.user.updateProfile({ displayName: name.trim() });
        }
      })
      .catch(function (err) {
        setLoading('auth-reg-btn', false);
        authShowError(firebaseErrorMsg(err.code));
      });
  };

  // ── Connexion Google ──────────────────────────────────────
  window.authGoogle = function () {
    authClearMessages();
    var provider = new firebase.auth.GoogleAuthProvider();
    // signInWithRedirect fonctionne mieux dans WebView que signInWithPopup
    firebase.auth().signInWithRedirect(provider).catch(function (err) {
      authShowError(firebaseErrorMsg(err.code));
    });
  };

  // ── Mot de passe oublié ───────────────────────────────────
  window.authForgotPassword = function () {
    var email = (document.getElementById('auth-login-email') || {}).value || '';
    if (!email) { authShowError('Entrez votre email pour réinitialiser le mot de passe.'); return; }
    firebase.auth().sendPasswordResetEmail(email.trim())
      .then(function () {
        authShowSuccess('Email de réinitialisation envoyé à ' + email);
      })
      .catch(function (err) {
        authShowError(firebaseErrorMsg(err.code));
      });
  };

  // ── Déconnexion ───────────────────────────────────────────
  window.authSignOut = function () {
    firebase.auth().signOut();
  };

  // ── Initialisation principale ─────────────────────────────
  waitForFirebase(function () {
    injectStyles();
    createOverlay();
    createUserBar();

    // Récupérer le résultat de la redirection Google
    firebase.auth().getRedirectResult().then(function (result) {
      if (result && result.user) {
        // Connexion réussie via Google redirect
      }
    }).catch(function (err) {
      if (err.code) {
        authShowError(firebaseErrorMsg(err.code));
      }
    });

    // Surveiller l'état de connexion
    firebase.auth().onAuthStateChanged(function (user) {
      if (user) {
        hideOverlay();
        showUserBar(user);
      } else {
        showOverlay();
        var bar = document.getElementById('auth-user-bar');
        if (bar) bar.style.display = 'none';
      }
    });

    // Permettre la soumission par Enter
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var loginForm = document.getElementById('auth-form-login');
        var regForm = document.getElementById('auth-form-register');
        if (loginForm && loginForm.style.display !== 'none') authLogin();
        else if (regForm && regForm.style.display !== 'none') authRegister();
      }
    });
  });
})();
