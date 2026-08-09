const VISIBLE_KEY = 'lb_badges_visible';

let badgesVisible = true;

// Читаем сохранённое состояние и применяем его
chrome.storage.local.get([VISIBLE_KEY], (r) => {
  if (r[VISIBLE_KEY] === false) {
    badgesVisible = false;
    // Ждём рендера, потом скрываем
    waitForPosters().then(() => {
      injectBadges();
      hideBadges();
    });
  } else {
    waitForPosters().then(() => injectBadges());
  }
});

function injectBadges() {
  document.querySelectorAll('li.posteritem').forEach((li) => {
    const ratingRaw = parseInt(li.getAttribute('data-owner-rating') || '0', 10);
    if (ratingRaw === 0) return;

    if (li.querySelector('.lb-ext-badge')) return;

    const rating = ratingRaw / 2;
    const full = Math.floor(rating);
    const half = rating % 1 ? '½' : '';

    const badge = document.createElement('div');
    badge.className = 'lb-ext-badge';
    badge.innerHTML = `<span class="lb-ext-stars">${'★'.repeat(full)}${half}</span>`;

    const numberEl = li.querySelector('.list-number');
    if (numberEl) {
      li.insertBefore(badge, numberEl);
    } else {
      li.appendChild(badge);
    }
  });
}

function hideBadges() {
  document.querySelectorAll('.lb-ext-badge').forEach(b => b.style.display = 'none');
}

function showBadges() {
  document.querySelectorAll('.lb-ext-badge').forEach(b => b.style.display = '');
}

function waitForPosters(timeout = 10000) {
  return new Promise((resolve) => {
    if (document.querySelector('li.posteritem')) return resolve();
    const observer = new MutationObserver(() => {
      if (document.querySelector('li.posteritem')) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); resolve(); }, timeout);
  });
}

// Слушаем команды из попапа
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'toggle') {
    if (badgesVisible) {
      hideBadges();
      badgesVisible = false;
    } else {
      injectBadges();
      showBadges();
      badgesVisible = true;
    }
    chrome.storage.local.set({ [VISIBLE_KEY]: badgesVisible });
    sendResponse({ visible: badgesVisible });
  } else if (msg.action === 'getState') {
    sendResponse({ visible: badgesVisible });
  }
});
