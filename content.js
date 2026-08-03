const CACHE_KEY = 'lb_likes_cache';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 часа

let badgesVisible = true;

// Определяем username залогиненного пользователя из DOM
function detectUsername() {
  // Letterboxd встраивает data-owner на элементах навигации
  const ownerEl = document.querySelector('[data-owner]');
  if (ownerEl) return ownerEl.getAttribute('data-owner');

  // Запасной вариант: ссылка на профиль в шапке
  const accountLink = document.querySelector('a.account-link[href]');
  if (accountLink) {
    const m = accountLink.getAttribute('href').match(/^\/([^/]+)\/?$/);
    if (m) return m[1];
  }
  return null;
}

function getCache() {
  return new Promise((resolve) => {
    chrome.storage.local.get([CACHE_KEY], (r) => resolve(r[CACHE_KEY] || null));
  });
}

function setCache(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [CACHE_KEY]: { data, timestamp: Date.now() } }, resolve);
  });
}

// Парсим страницу лайков — ищем data-item-slug
function parseLikesPage(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const slugs = [];
  doc.querySelectorAll('[data-item-slug]').forEach((el) => {
    const slug = el.getAttribute('data-item-slug');
    if (slug) slugs.push(slug);
  });
  const hasNext = !!doc.querySelector('a.next');
  return { slugs, hasNext };
}

async function fetchLikes(username, maxPages = 25) {
  const liked = new Set();
  let page = 1;

  while (page <= maxPages) {
    const url = page === 1
      ? `https://letterboxd.com/${username}/likes/films/`
      : `https://letterboxd.com/${username}/likes/films/page/${page}/`;

    let resp;
    try {
      resp = await fetch(url, { credentials: 'include' });
    } catch (e) { break; }
    if (!resp.ok) break;

    const { slugs, hasNext } = parseLikesPage(await resp.text());
    slugs.forEach(s => liked.add(s));

    if (!hasNext || slugs.length === 0) break;
    page++;
    await new Promise(r => setTimeout(r, 300));
  }

  return liked;
}

async function getLikedSet(username) {
  const cache = await getCache();
  if (cache && cache.username === username &&
      Date.now() - cache.timestamp < CACHE_TTL &&
      cache.data.length > 0) {
    return new Set(cache.data);
  }

  const liked = await fetchLikes(username);
  await setCache({ data: Array.from(liked), username });
  return liked;
}

function injectBadges(likedSet) {
  document.querySelectorAll('li.posteritem').forEach((li) => {
    const ratingRaw = parseInt(li.getAttribute('data-owner-rating') || '0', 10);
    const slugEl = li.querySelector('[data-item-slug]');
    if (!slugEl) return;
    if (slugEl.querySelector('.lb-ext-badge')) return;

    const slug = slugEl.getAttribute('data-item-slug');
    const liked = likedSet ? likedSet.has(slug) : false;

    let html = '';
    if (ratingRaw > 0) {
      const rating = ratingRaw / 2;
      const full = Math.floor(rating);
      const half = rating % 1 ? '½' : '';
      html += `<span class="lb-ext-stars">${'★'.repeat(full)}${half}</span>`;
    }
    if (liked) html += `<span class="lb-ext-heart">❤</span>`;

    if (html) {
      const badge = document.createElement('div');
      badge.className = 'lb-ext-badge';
      badge.innerHTML = html;
      slugEl.style.position = 'relative';
      slugEl.appendChild(badge);
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

let cachedLikedSet = null;

async function main() {
  await waitForPosters();

  const username = detectUsername();

  if (username) {
    cachedLikedSet = await getLikedSet(username);
  }

  injectBadges(cachedLikedSet);
}

main();

// Слушаем команды из попапа
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'toggle') {
    if (badgesVisible) {
      hideBadges();
      badgesVisible = false;
    } else {
      injectBadges(cachedLikedSet);
      showBadges();
      badgesVisible = true;
    }
    sendResponse({ visible: badgesVisible });
  } else if (msg.action === 'clearCache') {
    chrome.storage.local.remove([CACHE_KEY], () => sendResponse({ ok: true }));
    return true; // async
  }
});
