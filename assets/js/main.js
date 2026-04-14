/* Hadol — main.js: dark mode + search */

// ── Dark mode ─────────────────────────────────────────────────────
(function () {
  var toggle = document.getElementById('mode-toggle');
  var label  = toggle && toggle.querySelector('.hd-mode-label');

  function stored() { return localStorage.getItem('hd-mode'); }
  function sysDark() { return window.matchMedia('(prefers-color-scheme: dark)').matches; }

  function current() {
    return stored() || (sysDark() ? 'dark' : 'light');
  }

  function apply(mode) {
    document.documentElement.setAttribute('data-mode', mode);
    if (label) label.textContent = mode === 'dark' ? 'Dark' : 'White';
  }

  apply(current());

  toggle && toggle.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    localStorage.setItem('hd-mode', next);
    apply(next);
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    if (!stored()) apply(e.matches ? 'dark' : 'light');
  });
})();

// ── Search ────────────────────────────────────────────────────────
(function () {
  var trigger   = document.getElementById('search-trigger');
  var bar       = document.getElementById('hd-search-bar');
  var input     = document.getElementById('search-input');
  var resultsEl = document.getElementById('search-results');
  var closeBtn  = document.getElementById('search-close');

  if (!trigger || !bar || !input) return;

  var data = null;

  function load() {
    if (data) return Promise.resolve();
    return fetch('/search.json')
      .then(function (r) { return r.json(); })
      .then(function (j) { data = j; })
      .catch(function () { data = []; });
  }

  function run(q) {
    if (!data || !q) { hide(); return; }
    var low = q.toLowerCase();
    var hits = data.filter(function (p) {
      return (p.title  || '').toLowerCase().includes(low) ||
             (p.content|| '').toLowerCase().includes(low) ||
             (p.tags   || '').toLowerCase().includes(low);
    }).slice(0, 8);

    if (!hits.length) {
      resultsEl.innerHTML = '<p class="hd-no-results">검색 결과가 없습니다.</p>';
    } else {
      resultsEl.innerHTML = hits.map(function (p) {
        return '<a href="' + p.url + '" class="hd-search-result">' +
               '<span class="hd-sr-title">' + esc(p.title) + '</span>' +
               '<span class="hd-sr-date">'  + (p.date || '') + '</span>' +
               '</a>';
      }).join('');
    }
    resultsEl.classList.add('active');
  }

  function hide() {
    resultsEl.classList.remove('active');
    resultsEl.innerHTML = '';
  }

  function esc(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  trigger.addEventListener('click', function () {
    bar.classList.toggle('active');
    if (bar.classList.contains('active')) {
      load().then(function () { input.focus(); });
    } else {
      hide();
      input.value = '';
    }
  });

  closeBtn && closeBtn.addEventListener('click', function () {
    bar.classList.remove('active');
    hide(); input.value = '';
  });

  input.addEventListener('input', function () {
    run(input.value.trim());
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      bar.classList.remove('active');
      hide(); input.value = '';
    }
  });

  document.addEventListener('click', function (e) {
    if (!bar.contains(e.target) && e.target !== trigger) {
      hide();
    }
  });
})();
