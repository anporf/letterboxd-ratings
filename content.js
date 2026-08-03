let badgesVisible = true;

function injectBadges() {
  document.querySelectorAll('li.posteritem').forEach((li) => {
    const ratingRaw = parseInt(li.getAttribute('data-owner-rating') || '0', 10);
    if (ratingRaw === 0) return;

    const slugEl = li.querySelector('[data-item-slug]');
    if (!slugEl) return;
    if (slugEl.querySelector('.lb-ext-badge')) return;

    const rating = ratingRaw / 2; // data-owner-rating: 9 => 4.5★
    const full = Math.floor(rating);
    const half = rating % 1 ? '½' : '';

    const badge = document.createElement('div');
    badge.className = 'lb-ext-badge';
    badge.innerHTML = `<span class="lb-ext-stars">${'★'.repeat(full)}${half}</span>`;
    slugEl.style.position = 'relative';
    slugEl.appendChild(badge);
  });
}

function hideBadges() {
  document.querySelectorAll('.lb-ext-badge').forEach(b => b.style.display = 'none');
}

function showBadges() {
  document.querySelectorAll('.lb-ext-badge').forEach(b => b.style.display = '');
}

// Ждём появления li.posteritem в DOM (React рендерит страницу асинхронно)
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

async function main() {
  await waitForPosters();
  injectBadges();
}

main();

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
    sendResponse({ visible: badgesVisible });
  }
});
