
// ── Dark mode toggle ────────────────────────────────────────────────────────
(function () {
  if (localStorage.getItem('bbg-dark') === '1') document.body.classList.add('dark');
  var btn = document.createElement('button');
  btn.className = 'dark-toggle';
  btn.title = 'Toggle dark mode';
  btn.setAttribute('aria-label', 'Toggle dark mode');
  btn.addEventListener('click', function () {
    document.body.classList.toggle('dark');
    localStorage.setItem('bbg-dark', document.body.classList.contains('dark') ? '1' : '0');
  });
  document.body.appendChild(btn);
})();

// ── Hamburger + collapsible sidebar ─────────────────────────────────────────
(function () {
  var isMobile = window.innerWidth <= 768;
  var savedState = sessionStorage.getItem('bbg-sidebar-visible');
  if (!isMobile && savedState !== '0') document.body.classList.add('sidebar-open');

  var ham = document.createElement('button');
  ham.className = 'hamburger';
  ham.setAttribute('aria-label', 'Toggle sidebar');
  ham.innerHTML = '<span></span><span></span><span></span>';

  var overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';

  function toggleSidebar() {
    var open = document.body.classList.toggle('sidebar-open');
    if (!isMobile) sessionStorage.setItem('bbg-sidebar-visible', open ? '1' : '0');
  }
  function closeSidebar() {
    document.body.classList.remove('sidebar-open');
    if (!isMobile) sessionStorage.setItem('bbg-sidebar-visible', '0');
  }

  ham.addEventListener('click', toggleSidebar);
  overlay.addEventListener('click', closeSidebar);
  document.body.appendChild(ham);
  document.body.appendChild(overlay);
  window._bbgHamburger = ham;

  var sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.addEventListener('click', function (e) {
      if (e.target.tagName === 'A' && isMobile) closeSidebar();
    });
  }
})();

// ── Content cleanup + heading injection ─────────────────────────────────────
(function () {
  var contentInner = document.getElementById('content-inner');
  if (!contentInner) return;

  var antContent = contentInner.querySelector('.ant-layout-content');
  if (antContent) contentInner.innerHTML = antContent.innerHTML;

  [
    '[class*="chatButtonContainer"]', '[class*="chatButton__"]',
    '[class*="chatIcon"]', '[class*="chatIconExpend"]',
    '[class*="markCompleteWrap"]', '[class*="markComplete"]',
    'aside', '.ant-layout-sider', '.ant-menu'
  ].forEach(function (sel) {
    contentInner.querySelectorAll(sel).forEach(function (el) {
      el.parentNode && el.parentNode.removeChild(el);
    });
  });

  var parts = window.location.pathname.split('/').filter(Boolean);
  if (parts[parts.length - 1] === 'index.html') parts.pop();
  if (parts.length < 3) return;
  var pageSlug = parts[parts.length - 1];
  if (!pageSlug || pageSlug === 'content') return;

  var titleText = pageSlug.replace(/^p\d+-c\d+-/, '').replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });

  var existingH1 = contentInner.querySelector('h1');
  if (existingH1 && existingH1.parentNode) existingH1.parentNode.removeChild(existingH1);

  var h1 = document.createElement('h1');
  h1.id = 'page-auto-heading';
  h1.textContent = titleText;
  contentInner.insertBefore(h1, contentInner.firstChild);
})();

// ── Sidebar (fetched from shared sidebar.html) ─────────────────────────────
(function () {
  'use strict';
  var sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  var STORAGE_KEY = 'bbg-sidebar-open';
  var activeTopic   = sidebar.dataset.activeTopic   || '';
  var activeChapter = sidebar.dataset.activeChapter || '';
  var activePage    = sidebar.dataset.activePage    || '';

  function loadOpenTopics() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveOpenTopics(arr) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch (e) {}
  }

  function initSidebar() {
    if (activePage) {
      var activeEl = sidebar.querySelector('.page-item[data-page="' + activePage + '"]');
      if (activeEl) activeEl.classList.add('active');
    }

    sidebar.querySelectorAll('.topic-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var slug = this.dataset.topic;
        var list = document.getElementById('topic-' + slug);
        var isOpen = list.classList.contains('open');
        list.classList.toggle('open', !isOpen);
        this.classList.toggle('open', !isOpen);
        var arr = loadOpenTopics().filter(function (t) { return t !== slug; });
        if (!isOpen) arr.push(slug);
        saveOpenTopics(arr);
      });
    });

    sidebar.querySelectorAll('.chapter-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var list = document.getElementById(this.dataset.target);
        var isOpen = list.classList.contains('open');
        list.classList.toggle('open', !isOpen);
        this.classList.toggle('open', !isOpen);
      });
    });

    if (activeTopic) {
      var cl = document.getElementById('topic-' + activeTopic);
      var bt = sidebar.querySelector('.topic-toggle[data-topic="' + activeTopic + '"]');
      if (cl) cl.classList.add('open');
      if (bt) bt.classList.add('open');
      if (activeChapter) {
        var gid = 'group-' + activeTopic + '-' + activeChapter;
        var gEl = document.getElementById(gid);
        var gBtn = sidebar.querySelector('.chapter-toggle[data-target="' + gid + '"]');
        if (gEl) gEl.classList.add('open');
        if (gBtn) gBtn.classList.add('open');
      }
    }

    loadOpenTopics().forEach(function (slug) {
      if (slug === activeTopic) return;
      var cl = document.getElementById('topic-' + slug);
      var bt = sidebar.querySelector('.topic-toggle[data-topic="' + slug + '"]');
      if (cl) cl.classList.add('open');
      if (bt) bt.classList.add('open');
    });

    var activeItem = sidebar.querySelector('.page-item.active');
    if (activeItem) {
      var linkText = activeItem.querySelector('a');
      var heading = document.getElementById('page-auto-heading');
      if (linkText && heading) heading.textContent = linkText.textContent.trim();
    }

    var savedScroll = sessionStorage.getItem('bbg-sidebar-scroll');
    if (savedScroll !== null) {
      sidebar.scrollTop = parseInt(savedScroll, 10);
      sessionStorage.removeItem('bbg-sidebar-scroll');
    } else if (activeItem) {
      activeItem.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }

    sidebar.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        sessionStorage.setItem('bbg-sidebar-scroll', sidebar.scrollTop);
      });
    });
  }

  fetch('/assets/sidebar.html')
    .then(function (r) { return r.text(); })
    .then(function (html) {
      if (html.indexOf('<') === -1 && window._bbgDecryptSidebar) return window._bbgDecryptSidebar(html);
      return html;
    })
    .then(function (html) {
      sidebar.innerHTML = html;
      var header = document.getElementById('sidebar-header');
      // Only move hamburger into sidebar header on desktop (on mobile it stays fixed on body)
      if (header && window._bbgHamburger && window.innerWidth > 768) {
        header.appendChild(window._bbgHamburger);
      }
      initSidebar();
    })
    .catch(function () {
      sidebar.innerHTML = '<div style="padding:1rem;color:#999;">Sidebar failed to load</div>';
    });
})();

// ── Multi-language code tabs + copy button ──────────────────────────────────
(function () {
  document.querySelectorAll('.code-block-tabs').forEach(function (block) {
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
})();
