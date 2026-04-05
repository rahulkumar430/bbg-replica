/**
 * auth.js — Decrypts page content using the AES key stored in sessionStorage.
 * Loaded on every encrypted page. Redirects to /login.html if no key found.
 */
(function () {
  'use strict';

  var KEY_STORAGE = 'bbg-auth-key';

  // ── Check authentication ──────────────────────────────────────────────────
  var keyB64 = sessionStorage.getItem(KEY_STORAGE);
  if (!keyB64) {
    window.location.replace('/login.html');
    return;
  }

  // Re-check when page is restored from bfcache (back/forward navigation)
  window.addEventListener('pageshow', function (e) {
    if (e.persisted && !sessionStorage.getItem(KEY_STORAGE)) {
      window.location.replace('/login.html');
    }
  });

  // ── Decrypt helper ────────────────────────────────────────────────────────
  async function decrypt(encryptedB64, aesKey) {
    var raw = Uint8Array.from(atob(encryptedB64), function (c) { return c.charCodeAt(0); });
    // Format: iv (12 bytes) + authTag (16 bytes) + ciphertext
    var iv         = raw.slice(0, 12);
    var authTag    = raw.slice(12, 28);
    var ciphertext = raw.slice(28);
    // Web Crypto expects tag appended to ciphertext
    var combined = new Uint8Array(ciphertext.length + authTag.length);
    combined.set(ciphertext);
    combined.set(authTag, ciphertext.length);
    var decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      aesKey,
      combined
    );
    return new TextDecoder().decode(decrypted);
  }

  async function importKey(b64) {
    var keyBytes = Uint8Array.from(atob(b64), function (c) { return c.charCodeAt(0); });
    return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
  }

  // ── Decrypt page content ──────────────────────────────────────────────────
  async function decryptPage() {
    var dbg = function(msg) { console.log('[auth] ' + msg); };
    try {
      dbg('Importing key from sessionStorage (' + keyB64.length + ' chars)');
      var aesKey = await importKey(keyB64);
      dbg('Key imported OK');
    } catch (e) {
      dbg('Key import FAILED: ' + e.message);
      document.body.innerHTML = '<pre style="padding:2rem;color:red;">Key import failed: ' + e.message + '</pre>';
      return;
    }

    // Decrypt #encrypted-content if present
    var encEl = document.getElementById('encrypted-content');
    if (encEl) {
      var encText = encEl.textContent.trim();
      dbg('Found encrypted content: ' + encText.length + ' chars');
      dbg('First 40: ' + encText.slice(0, 40));
      dbg('Contains newlines: ' + (encText.indexOf('\n') !== -1));
      try {
        var html = await decrypt(encText, aesKey);
        dbg('Decryption OK, HTML length: ' + html.length);
        var container = encEl.parentElement; // #content-inner or main.page-main
        container.innerHTML = html;

        // Re-run highlight.js on decrypted code blocks
        if (window.hljs) hljs.highlightAll();

        // Re-init code tab switching + copy buttons on decrypted content
        container.querySelectorAll('.code-block-tabs').forEach(function (block) {
          var btn = document.createElement('button');
          btn.className = 'code-copy-btn';
          btn.textContent = 'Copy';
          btn.addEventListener('click', function () {
            var panel = block.querySelector('.code-tab-panel.active pre code');
            if (!panel) return;
            navigator.clipboard.writeText(panel.textContent).then(function () {
              btn.textContent = 'Copied!';
              btn.classList.add('copied');
              setTimeout(function () { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
            });
          });
          block.appendChild(btn);

          block.querySelectorAll('.code-tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
              var lang = this.dataset.lang;
              block.querySelectorAll('.code-tab, .code-tab-panel').forEach(function (el) { el.classList.remove('active'); });
              this.classList.add('active');
              block.querySelector('.code-tab-panel[data-lang="' + lang + '"]').classList.add('active');
            });
          });
        });

        document.dispatchEvent(new Event('content-decrypted'));
      } catch (e) {
        dbg('DECRYPT FAILED: ' + (e.message || e.name || String(e)));
        document.body.innerHTML = '<div style="padding:2rem;color:#ef4444;font-family:monospace;">' +
          '<h2>Decryption Failed</h2>' +
          '<p>Error: ' + (e.message || e.name || 'unknown') + '</p>' +
          '<p>Key length: ' + keyB64.length + ' chars</p>' +
          '<p>Encrypted blob: ' + encText.length + ' chars</p>' +
          '<p>Contains newlines: ' + (encText.indexOf('\\n') !== -1) + '</p>' +
          '<p>First 60 of blob: <code>' + encText.slice(0, 60) + '</code></p>' +
          '<p style="margin-top:1rem"><a href="/login.html" style="color:#8ab4f8;">Back to Login</a></p></div>';
        sessionStorage.removeItem(KEY_STORAGE);
        return;
      }
    }

    // Decrypt sidebar if it's encrypted (base64 blob instead of HTML)
    var sidebar = document.getElementById('sidebar');
    if (sidebar && !sidebar.querySelector('.topic-list')) {
      // sidebar.html was fetched but is encrypted — decrypt it
      // This is handled by patching the sidebar fetch in sidebar.js
    }
  }

  // ── Decrypt sidebar.html fetches ──────────────────────────────────────────
  // Patch the global to let sidebar.js know the key
  window._bbgDecryptSidebar = async function (encText) {
    var aesKey = await importKey(keyB64);
    return decrypt(encText.trim(), aesKey);
  };

  // ── Add logout button ─────────────────────────────────────────────────────
  var logoutBtn = document.createElement('button');
  logoutBtn.textContent = 'Logout';
  logoutBtn.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:999;' +
    'background:#333;color:#aaa;border:1px solid #555;border-radius:6px;' +
    'padding:4px 14px;font-size:12px;cursor:pointer;font-family:inherit;' +
    'transition:background 0.2s,color 0.2s;';
  logoutBtn.addEventListener('mouseenter', function () {
    this.style.background = '#444'; this.style.color = '#e0e0e0';
  });
  logoutBtn.addEventListener('mouseleave', function () {
    this.style.background = '#333'; this.style.color = '#aaa';
  });
  logoutBtn.addEventListener('click', function () {
    sessionStorage.removeItem(KEY_STORAGE);
    window.location.replace('/login.html');
  });
  document.body.appendChild(logoutBtn);

  // ── Run decryption ────────────────────────────────────────────────────────
  decryptPage();
})();
