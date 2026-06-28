// ═══════════════════════════════════════════════════════════
// NPS PWA Studio — Firebase Authentication + Admin Panel
// Supporte : Email/Mot de passe + Google Sign-In
// Admin : panneau de publication des mises à jour (Firestore)
// Compatible WebView Android (Firebase v8 compat)
// ═══════════════════════════════════════════════════════════

(function () {

  // ── Constante admin ───────────────────────────────────────
  var ADMIN_EMAIL = 'nelsonpataule11@gmail.com';

  // ── Attendre que Firebase soit prêt ──────────────────────
  function waitForFirebase(callback) {
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
      callback();
    } else {
      setTimeout(function () { waitForFirebase(callback); }, 100);
    }
  }

  // ── Référence Firestore (partagée avec index.html) ────────
  function getDb() {
    return firebase.firestore();
  }

  // ── Échappement HTML sûr (anti-XSS) ──────────────────────
  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ── Vérification admin (côté JS) ─────────────────────────
  function isAdminUser() {
    var u = firebase.auth().currentUser;
    return u && u.email === ADMIN_EMAIL;
  }

  // ══════════════════════════════════════════════════════════
  // STYLES — Overlay auth + Barre utilisateur + Panneau admin
  // ══════════════════════════════════════════════════════════
  function injectStyles() {
    var style = document.createElement('style');
    style.innerHTML = `
      /* ── Auth overlay ── */
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
      .auth-logo { text-align: center; margin-bottom: 24px; }
      .auth-logo-icon {
        width: 64px; height: 64px;
        background: linear-gradient(135deg, #7c6eff, #a78bfa);
        border-radius: 18px;
        display: inline-flex; align-items: center; justify-content: center;
        font-size: 30px; margin-bottom: 12px;
      }
      .auth-title { color: #fff; font-size: 22px; font-weight: 700; text-align: center; margin: 0 0 4px; }
      .auth-subtitle { color: #6b7280; font-size: 13px; text-align: center; margin: 0 0 24px; }
      .auth-tabs {
        display: flex; background: #0a0a14;
        border-radius: 10px; padding: 4px; margin-bottom: 20px;
      }
      .auth-tab {
        flex: 1; padding: 9px; border: none; background: transparent;
        color: #6b7280; font-size: 13px; font-weight: 600;
        border-radius: 8px; cursor: pointer; transition: all 0.2s;
      }
      .auth-tab.active { background: #7c6eff; color: #fff; }
      .auth-field { margin-bottom: 14px; }
      .auth-field label {
        display: block; color: #9ca3af; font-size: 12px;
        font-weight: 600; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;
      }
      .auth-field input {
        width: 100%; padding: 12px 14px;
        background: #0a0a14; border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px; color: #fff; font-size: 14px;
        outline: none; transition: border-color 0.2s;
      }
      .auth-field input:focus { border-color: #7c6eff; }
      .auth-field input::placeholder { color: #4b5563; }
      .auth-btn {
        width: 100%; padding: 13px;
        border: none; border-radius: 11px;
        font-size: 14px; font-weight: 700;
        cursor: pointer; transition: all 0.2s; margin-bottom: 10px;
      }
      .auth-btn-primary {
        background: linear-gradient(135deg, #7c6eff, #a78bfa); color: #fff;
      }
      .auth-btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
      .auth-btn-primary:active { transform: translateY(0); }
      .auth-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
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
        content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.08);
      }
      .auth-error {
        background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);
        color: #f87171; font-size: 12px;
        padding: 10px 12px; border-radius: 8px; margin-bottom: 14px; display: none;
      }
      .auth-success {
        background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3);
        color: #4ade80; font-size: 12px;
        padding: 10px 12px; border-radius: 8px; margin-bottom: 14px; display: none;
      }
      .auth-forgot { text-align: center; margin-top: 4px; }
      .auth-forgot a { color: #7c6eff; font-size: 12px; text-decoration: none; }

      /* ── Barre utilisateur ── */
      .auth-user-bar {
        position: fixed; top: 0; right: 0; left: 0; z-index: 9998;
        background: rgba(10,10,20,0.95);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(124,110,255,0.15);
        padding: 8px 16px;
        display: none; align-items: center; justify-content: space-between;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        gap: 8px;
      }
      .auth-user-info { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
      .auth-avatar {
        width: 30px; height: 30px; border-radius: 50%;
        background: linear-gradient(135deg, #7c6eff, #a78bfa);
        display: flex; align-items: center; justify-content: center;
        color: #fff; font-size: 13px; font-weight: 700; overflow: hidden; flex-shrink: 0;
      }
      .auth-avatar img { width: 100%; height: 100%; object-fit: cover; }
      .auth-user-email {
        color: #d1d5db; font-size: 12px;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;
      }
      .auth-bar-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
      .auth-admin-btn {
        background: linear-gradient(135deg, #7c6eff, #a78bfa);
        border: none; color: #fff;
        padding: 5px 10px; border-radius: 7px;
        font-size: 11px; font-weight: 700; cursor: pointer; letter-spacing: 0.5px;
      }
      .auth-signout-btn {
        background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3);
        color: #f87171; padding: 5px 12px;
        border-radius: 7px; font-size: 12px; cursor: pointer; font-weight: 600;
      }

      /* ── Panneau Admin ── */
      #admin-panel-overlay {
        display: none; position: fixed; inset: 0;
        background: rgba(0,0,0,0.85); z-index: 99998;
        align-items: flex-end; justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      #admin-panel-overlay.open { display: flex; }
      #admin-panel {
        background: #0d0d1a; border-top: 1px solid rgba(124,110,255,0.3);
        border-radius: 20px 20px 0 0;
        width: 100%; max-height: 88vh; overflow-y: auto;
        padding: 0 0 24px;
      }
      .admin-drag-bar {
        width: 40px; height: 4px; background: rgba(255,255,255,0.15);
        border-radius: 10px; margin: 14px auto 0;
      }
      .admin-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 16px 18px 12px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
      }
      .admin-title {
        font-size: 16px; font-weight: 700; color: #fff;
        display: flex; align-items: center; gap: 8px;
      }
      .admin-badge-label {
        font-size: 10px; background: rgba(124,110,255,0.2);
        color: #a78bfa; padding: 2px 7px; border-radius: 4px; font-weight: 700; letter-spacing: 1px;
      }
      .admin-close-btn {
        background: none; border: none; color: #6b7280;
        font-size: 20px; cursor: pointer; line-height: 1; padding: 4px;
      }
      .admin-tabs {
        display: flex; padding: 12px 18px 0; gap: 8px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
      }
      .admin-tab-btn {
        padding: 8px 14px; border: none; background: transparent;
        color: #6b7280; font-size: 13px; font-weight: 600;
        border-bottom: 2px solid transparent; cursor: pointer;
        transition: all 0.2s; margin-bottom: -1px;
      }
      .admin-tab-btn.active { color: #7c6eff; border-bottom-color: #7c6eff; }
      .admin-tab-content { padding: 16px 18px; }
      .admin-section { display: none; }
      .admin-section.active { display: block; }

      /* Composer */
      .admin-composer-label {
        font-size: 11px; color: #9ca3af; font-weight: 600;
        text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;
      }
      .admin-composer-textarea {
        width: 100%; min-height: 100px; background: #070710;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px; color: #fff; font-size: 14px;
        padding: 12px 14px; resize: vertical; outline: none;
        font-family: inherit; line-height: 1.5; margin-bottom: 10px;
        transition: border-color 0.2s;
      }
      .admin-composer-textarea:focus { border-color: #7c6eff; }
      .admin-composer-textarea::placeholder { color: #374151; }
      .admin-publish-btn {
        width: 100%; padding: 13px; border: none;
        background: linear-gradient(135deg, #7c6eff, #a78bfa);
        color: #fff; font-size: 14px; font-weight: 700;
        border-radius: 11px; cursor: pointer; transition: opacity 0.2s;
      }
      .admin-publish-btn:hover { opacity: 0.9; }
      .admin-publish-btn:disabled { opacity: 0.5; cursor: not-allowed; }

      /* Liste des mises à jour */
      .admin-news-item {
        background: #13131f; border: 1px solid rgba(255,255,255,0.07);
        border-radius: 12px; padding: 12px 14px; margin-bottom: 10px;
        position: relative;
      }
      .admin-news-meta { font-size: 11px; color: #6b7280; margin-bottom: 6px; }
      .admin-news-text { font-size: 13px; color: #d1d5db; line-height: 1.5; }
      .admin-news-del {
        position: absolute; top: 10px; right: 10px;
        background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25);
        color: #f87171; font-size: 11px; font-weight: 700;
        padding: 4px 9px; border-radius: 6px; cursor: pointer;
      }
      .admin-news-del:hover { background: rgba(239,68,68,0.25); }

      /* Logs */
      .admin-log-table {
        width: 100%; border-collapse: collapse; font-size: 12px;
      }
      .admin-log-table th {
        text-align: left; color: #6b7280; font-weight: 600;
        padding: 6px 8px; border-bottom: 1px solid rgba(255,255,255,0.06);
        font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px;
      }
      .admin-log-table td {
        padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.04);
        color: #d1d5db; vertical-align: top;
      }
      .admin-log-table tr:last-child td { border-bottom: none; }

      /* Toast */
      .admin-toast {
        position: fixed; bottom: 30px; left: 50%;
        transform: translateX(-50%);
        background: #1e1e2e; border: 1px solid rgba(124,110,255,0.3);
        color: #fff; padding: 11px 20px; border-radius: 10px;
        font-size: 13px; font-weight: 600; z-index: 999999;
        opacity: 0; transition: opacity 0.3s; pointer-events: none;
      }
      .admin-toast.err { border-color: rgba(239,68,68,0.4); color: #f87171; }
      .admin-toast.show { opacity: 1; }

      /* Animations */
      @keyframes authFadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .auth-card { animation: authFadeIn 0.4s ease; }
      @keyframes adminSlideUp {
        from { transform: translateY(100%); }
        to   { transform: translateY(0); }
      }
      #admin-panel-overlay.open #admin-panel { animation: adminSlideUp 0.3s ease; }
    `;
    document.head.appendChild(style);
  }

  // ══════════════════════════════════════════════════════════
  // HTML — Overlay de connexion
  // ══════════════════════════════════════════════════════════
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

  // ══════════════════════════════════════════════════════════
  // HTML — Barre utilisateur (après connexion)
  // ══════════════════════════════════════════════════════════
  function createUserBar() {
    var bar = document.createElement('div');
    bar.id = 'auth-user-bar';
    bar.className = 'auth-user-bar';
    bar.innerHTML = `
      <div class="auth-user-info">
        <div class="auth-avatar" id="auth-avatar-el">?</div>
        <span class="auth-user-email" id="auth-user-email-el"></span>
      </div>
      <div class="auth-bar-actions">
        <button class="auth-admin-btn" id="admin-panel-btn"
          style="display:none" onclick="adminPanelOpen()">
          ⚙️ ADMIN
        </button>
        <button class="auth-signout-btn" onclick="authSignOut()">Déconnexion</button>
      </div>
    `;
    document.body.appendChild(bar);
  }

  // ══════════════════════════════════════════════════════════
  // HTML — Panneau Admin (glissant du bas)
  // ══════════════════════════════════════════════════════════
  function createAdminPanel() {
    var panel = document.createElement('div');
    panel.id = 'admin-panel-overlay';
    panel.innerHTML = `
      <div id="admin-panel">
        <div class="admin-drag-bar"></div>
        <div class="admin-header">
          <div class="admin-title">
            🛠️ Console Admin
            <span class="admin-badge-label">ADMIN</span>
          </div>
          <button class="admin-close-btn" onclick="adminPanelClose()">✕</button>
        </div>

        <div class="admin-tabs">
          <button class="admin-tab-btn active" onclick="adminSwitchTab('publish')">📢 Publier</button>
          <button class="admin-tab-btn" onclick="adminSwitchTab('news')">📋 Mises à jour</button>
          <button class="admin-tab-btn" onclick="adminSwitchTab('logs')">👥 Activité</button>
        </div>

        <!-- Onglet : Publier une mise à jour -->
        <div class="admin-tab-content">
          <div class="admin-section active" id="admin-tab-publish">
            <p class="admin-composer-label">Nouvelle mise à jour</p>
            <textarea class="admin-composer-textarea" id="admin-msg-input"
              placeholder="Rédigez votre message... Il sera visible immédiatement dans l'app."></textarea>
            <button class="admin-publish-btn" id="admin-publish-btn" onclick="adminPublish()">
              📢 Publier dans l'app
            </button>
          </div>

          <!-- Onglet : Liste des mises à jour publiées -->
          <div class="admin-section" id="admin-tab-news">
            <p class="admin-composer-label" style="margin-bottom:12px">Mises à jour publiées</p>
            <div id="admin-news-list">
              <div style="color:#6b7280;font-size:13px;text-align:center;padding:20px 0">Chargement…</div>
            </div>
          </div>

          <!-- Onglet : Logs utilisateurs -->
          <div class="admin-section" id="admin-tab-logs">
            <p class="admin-composer-label" style="margin-bottom:12px">Activité récente (50 dernières)</p>
            <div id="admin-logs-container" style="overflow-x:auto">
              <div style="color:#6b7280;font-size:13px;text-align:center;padding:20px 0">Chargement…</div>
            </div>
          </div>
        </div>
      </div>
    `;
    // Fermer en cliquant sur le fond
    panel.addEventListener('click', function(e) {
      if (e.target === panel) adminPanelClose();
    });
    document.body.appendChild(panel);

    // Toast
    var toast = document.createElement('div');
    toast.id = 'admin-toast';
    toast.className = 'admin-toast';
    document.body.appendChild(toast);
  }

  // ══════════════════════════════════════════════════════════
  // AFFICHAGE / MASQUAGE
  // ══════════════════════════════════════════════════════════
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
    var adminBtn = document.getElementById('admin-panel-btn');
    if (emailEl) emailEl.textContent = user.displayName || user.email;
    if (avatarEl) {
      if (user.photoURL) {
        // Utiliser DOM API pour éviter l'injection d'attribut via innerHTML
        avatarEl.textContent = '';
        var img = document.createElement('img');
        img.src = user.photoURL;
        avatarEl.appendChild(img);
      } else {
        avatarEl.textContent = (user.displayName || user.email || '?')[0].toUpperCase();
      }
    }
    // Bouton admin visible seulement pour l'admin
    if (adminBtn) {
      adminBtn.style.display = (user.email === ADMIN_EMAIL) ? 'inline-block' : 'none';
    }
  }

  // ══════════════════════════════════════════════════════════
  // UI HELPERS — Auth
  // ══════════════════════════════════════════════════════════
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
  function setLoading(btnId, loading, label) {
    var btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    if (loading) {
      btn.dataset.origLabel = btn.textContent;
      btn.textContent = 'Chargement…';
    } else {
      btn.textContent = label || btn.dataset.origLabel || btn.textContent;
    }
  }
  function firebaseErrorMsg(code) {
    var msgs = {
      'auth/user-not-found': 'Aucun compte avec cet email.',
      'auth/wrong-password': 'Mot de passe incorrect.',
      'auth/invalid-credential': 'Email ou mot de passe incorrect.',
      'auth/email-already-in-use': 'Cet email est déjà utilisé.',
      'auth/weak-password': 'Mot de passe trop court (min. 6 caractères).',
      'auth/invalid-email': 'Email invalide.',
      'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.',
      'auth/popup-blocked': 'Popup bloqué. Veuillez utiliser email/mot de passe.',
      'auth/operation-not-allowed': 'Cette méthode de connexion n\'est pas activée.',
      'auth/network-request-failed': 'Erreur réseau. Vérifiez votre connexion.',
    };
    return msgs[code] || 'Erreur : ' + code;
  }

  // ══════════════════════════════════════════════════════════
  // LOGGING — Enregistrer l'activité dans Firestore
  // ══════════════════════════════════════════════════════════
  function logActivity(user, action) {
    getDb().collection('logs_utilisateurs').add({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      action: action,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function(e) {
      console.warn('[auth.js] logActivity failed:', e.message);
    });
  }

  // ══════════════════════════════════════════════════════════
  // AUTH — Connexion / Inscription / Google / Déconnexion
  // ══════════════════════════════════════════════════════════
  window.authLogin = function () {
    var email = (document.getElementById('auth-login-email') || {}).value || '';
    var pass = (document.getElementById('auth-login-password') || {}).value || '';
    if (!email || !pass) { authShowError('Remplissez tous les champs.'); return; }
    setLoading('auth-login-btn', true);
    authClearMessages();
    firebase.auth().signInWithEmailAndPassword(email.trim(), pass)
      .catch(function (err) {
        setLoading('auth-login-btn', false, 'Se connecter');
        authShowError(firebaseErrorMsg(err.code));
      });
  };

  window.authRegister = function () {
    var name = (document.getElementById('auth-reg-name') || {}).value || '';
    var email = (document.getElementById('auth-reg-email') || {}).value || '';
    var pass = (document.getElementById('auth-reg-password') || {}).value || '';
    if (!email || !pass) { authShowError('Email et mot de passe requis.'); return; }
    setLoading('auth-reg-btn', true);
    authClearMessages();
    firebase.auth().createUserWithEmailAndPassword(email.trim(), pass)
      .then(function (cred) {
        if (name) return cred.user.updateProfile({ displayName: name.trim() });
      })
      .catch(function (err) {
        setLoading('auth-reg-btn', false, 'Créer un compte');
        authShowError(firebaseErrorMsg(err.code));
      });
  };

  window.authGoogle = function () {
    authClearMessages();
    var provider = new firebase.auth.GoogleAuthProvider();
    // signInWithRedirect fonctionne mieux dans WebView que signInWithPopup
    firebase.auth().signInWithRedirect(provider).catch(function (err) {
      authShowError(firebaseErrorMsg(err.code));
    });
  };

  window.authForgotPassword = function () {
    var email = (document.getElementById('auth-login-email') || {}).value || '';
    if (!email) { authShowError('Entrez votre email pour réinitialiser le mot de passe.'); return; }
    firebase.auth().sendPasswordResetEmail(email.trim())
      .then(function () { authShowSuccess('Email de réinitialisation envoyé à ' + email); })
      .catch(function (err) { authShowError(firebaseErrorMsg(err.code)); });
  };

  window.authSignOut = function () {
    var user = firebase.auth().currentUser;
    if (user) logActivity(user, 'déconnexion');
    firebase.auth().signOut();
  };

  // ══════════════════════════════════════════════════════════
  // ADMIN — Panneau de gestion
  // ══════════════════════════════════════════════════════════
  window.adminPanelOpen = function () {
    if (!isAdminUser()) { adminToast('Accès refusé.', true); return; }
    var p = document.getElementById('admin-panel-overlay');
    if (p) {
      p.classList.add('open');
      adminSwitchTab('publish');   // réinitialiser sur l'onglet publier
      adminLoadNews();             // charger les mises à jour
    }
  };

  window.adminPanelClose = function () {
    var p = document.getElementById('admin-panel-overlay');
    if (p) p.classList.remove('open');
  };

  window.adminSwitchTab = function (tab) {
    ['publish', 'news', 'logs'].forEach(function(t) {
      var sec = document.getElementById('admin-tab-' + t);
      if (sec) sec.classList.toggle('active', t === tab);
    });
    document.querySelectorAll('.admin-tab-btn').forEach(function(btn, i) {
      var tabs = ['publish','news','logs'];
      btn.classList.toggle('active', tabs[i] === tab);
    });
    if (tab === 'news') adminLoadNews();
    if (tab === 'logs') adminLoadLogs();
  };

  // ── Publier une nouveauté ──────────────────────────────────
  window.adminPublish = function () {
    if (!isAdminUser()) { adminToast('Accès refusé.', true); return; }
    var input = document.getElementById('admin-msg-input');
    var txt = input ? input.value.trim() : '';
    if (!txt) { adminToast('Le message est vide.', true); return; }
    var btn = document.getElementById('admin-publish-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Publication…'; }
    var user = firebase.auth().currentUser;
    getDb().collection('nouveautes').add({
      text: txt,
      author: (user && (user.displayName || user.email)) || 'Admin',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function () {
      if (input) input.value = '';
      if (btn) { btn.disabled = false; btn.textContent = '📢 Publier dans l\'app'; }
      adminToast('✅ Publié ! Visible dans l\'app maintenant.');
      if (user) logActivity(user, 'publication mise à jour : ' + txt.substring(0, 60));
    }).catch(function (e) {
      if (btn) { btn.disabled = false; btn.textContent = '📢 Publier dans l\'app'; }
      adminToast('Erreur : ' + e.message, true);
    });
  };

  // ── Charger et afficher les mises à jour ──────────────────
  function adminLoadNews() {
    var container = document.getElementById('admin-news-list');
    if (!container) return;
    container.innerHTML = '<div style="color:#6b7280;font-size:13px;text-align:center;padding:20px 0">Chargement…</div>';
    getDb().collection('nouveautes').orderBy('timestamp', 'desc').limit(30).get()
      .then(function(snap) {
        if (snap.empty) {
          container.innerHTML = '<div style="color:#6b7280;font-size:13px;text-align:center;padding:20px 0">Aucune mise à jour publiée.</div>';
          return;
        }
        var html = '';
        snap.forEach(function(doc) {
          var d = doc.data();
          var date = d.timestamp ? d.timestamp.toDate().toLocaleString('fr-FR', {
            day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'
          }) : 'En cours…';
          var txt = escHtml(d.text || '').replace(/\n/g,'<br>');
          html += '<div class="admin-news-item">' +
            '<div class="admin-news-meta">' + escHtml(d.author || 'Admin') + ' · ' + escHtml(date) + '</div>' +
            '<div class="admin-news-text">' + txt + '</div>' +
            '<button class="admin-news-del" onclick="adminDeleteNews(\'' + doc.id + '\')">Supprimer</button>' +
          '</div>';
        });
        container.innerHTML = html;
      }).catch(function(e) {
        container.innerHTML = '<div style="color:#f87171;font-size:13px;padding:10px">Erreur : ' + e.message + '</div>';
      });
  }

  // ── Supprimer une mise à jour ─────────────────────────────
  window.adminDeleteNews = function (docId) {
    if (!isAdminUser()) { adminToast('Accès refusé.', true); return; }
    if (!confirm('Supprimer cette mise à jour ? Elle disparaîtra immédiatement de l\'app.')) return;
    getDb().collection('nouveautes').doc(docId).delete()
      .then(function() {
        adminToast('🗑️ Supprimé.');
        adminLoadNews();
        var user = firebase.auth().currentUser;
        if (user) logActivity(user, 'suppression mise à jour id:' + docId);
      })
      .catch(function(e) { adminToast('Erreur suppression : ' + e.message, true); });
  };

  // ── Charger les logs utilisateurs ────────────────────────
  function adminLoadLogs() {
    var container = document.getElementById('admin-logs-container');
    if (!container) return;
    container.innerHTML = '<div style="color:#6b7280;font-size:13px;text-align:center;padding:20px 0">Chargement…</div>';
    getDb().collection('logs_utilisateurs').orderBy('timestamp', 'desc').limit(50).get()
      .then(function(snap) {
        if (snap.empty) {
          container.innerHTML = '<div style="color:#6b7280;font-size:13px;text-align:center;padding:20px 0">Aucune activité enregistrée.</div>';
          return;
        }
        var html = '<table class="admin-log-table"><thead><tr><th>Date</th><th>Utilisateur</th><th>Action</th></tr></thead><tbody>';
        snap.forEach(function(doc) {
          var d = doc.data();
          var date = d.timestamp ? d.timestamp.toDate().toLocaleString('fr-FR', {
            day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'
          }) : '…';
          var email = escHtml(d.email || '');
          var action = escHtml(d.action || '');
          html += '<tr><td style="white-space:nowrap">' + escHtml(date) + '</td><td>' + email + '</td><td>' + action + '</td></tr>';
        });
        html += '</tbody></table>';
        container.innerHTML = html;
      }).catch(function(e) {
        container.innerHTML = '<div style="color:#f87171;font-size:13px;padding:10px">Erreur : ' + e.message + '</div>';
      });
  }

  // ── Toast admin ────────────────────────────────────────────
  function adminToast(msg, err) {
    var t = document.getElementById('admin-toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'admin-toast' + (err ? ' err' : '');
    // Force reflow
    t.offsetHeight;
    t.classList.add('show');
    setTimeout(function() { t.classList.remove('show'); }, 3000);
  }

  // ══════════════════════════════════════════════════════════
  // INITIALISATION PRINCIPALE
  // ══════════════════════════════════════════════════════════
  waitForFirebase(function () {
    injectStyles();
    createOverlay();
    createUserBar();
    createAdminPanel();

    // Résultat de redirection Google (connexion via redirect)
    firebase.auth().getRedirectResult().then(function (result) {
      if (result && result.user) {
        logActivity(result.user, 'connexion via Google (redirect)');
      }
    }).catch(function (err) {
      if (err.code) authShowError(firebaseErrorMsg(err.code));
    });

    // Surveillance de l'état de connexion
    firebase.auth().onAuthStateChanged(function (user) {
      if (user) {
        hideOverlay();
        showUserBar(user);
        // Logger la connexion (seulement si l'onglet vient de s'ouvrir)
        if (!window._nps_logged) {
          window._nps_logged = true;
          logActivity(user, 'connexion');
        }
      } else {
        window._nps_logged = false;
        showOverlay();
        var bar = document.getElementById('auth-user-bar');
        if (bar) bar.style.display = 'none';
        adminPanelClose();
      }
    });

    // Soumission par la touche Enter
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
