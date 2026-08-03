const CACHE_KEY = 'lb_ratings_cache';
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 часа

function getUsername() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['username'], (r) => resolve(r.username || null));
  });
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

// Letterboxd использует div.react-component с data-item-slug
// Рейтинг хранится в li-родителе через span[class*="rated-"]
function parsePosterPage(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const results = [];

  doc.querySelectorAll('[data-item-slug]').forEach((el) => {
    const slug = el.getAttribute('data-item-slug');
    if (!slug) return;

    let rating = null;
    const li = el.closest('li');
    if (li) {
      const ratingEl = li.querySelector('[class*="rated-"]');
      if (ratingEl) {
        const m = ratingEl.className.match(/rated-(\d+)/);
        if (m) rating = parseInt(m[1], 10) / 2; // rated-8 => 4.0
      }
    }

    results.push({ slug, rating });
  });

  const hasNext = !!doc.querySelector('a.next');
  return { results, hasNext };
}

async function fetchAllPages(baseUrl, maxPages = 25) {
  let all = [];
  let page = 1;

  while (page <= maxPages) {
    const url = page === 1 ? baseUrl : `${baseUrl}page/${page}/`;
    let resp;
    try {
      resp = await fetch(url, { credentials: 'include' });
    } catch (e) {
      break;
    }
    if (!resp.ok) break;

    const html = await resp.text();
    const { results, hasNext } = parsePosterPage(html);
    all = all.concat(results);

    if (!hasNext || results.length === 0) break;
    page++;
    await new Promise((r) => setTimeout(r, 300)); // не долбим сервер
  }
  return all;
}

async function fetchUserData(username) {
  const ratingsUrl = `https://letterboxd.com/${username}/films/ratings/`;
  const likesUrl = `https://letterboxd.com/${username}/likes/films/`;

  const [ratings, likes] = await Promise.all([
    fetchAllPages(ratingsUrl),
    fetchAllPages(likesUrl)
  ]);

  const map = {};
  ratings.forEach(({ slug, rating }) => {
    map[slug] = { ...(map[slug] || {}), rating };
  });
  likes.forEach(({ slug }) => {
    map[slug] = { ...(map[slug] || {}), liked: true };
  });

  return map;
}

function injectBadges(map) {
  document.querySelectorAll('[data-item-slug]').forEach((el) => {
    const slug = el.getAttribute('data-item-slug');
    const info = map[slug];
    if (!info) return;
    if (el.querySelector('.lb-ext-badge')) return;

    let html = '';
    if (info.rating) {
      const full = Math.floor(info.rating);
      const half = info.rating % 1 ? '½' : '';
      html += `<span class="lb-ext-stars">${'★'.repeat(full)}${half}</span>`;
    }
    if (info.liked) html += `<span class="lb-ext-heart">❤</span>`;

    if (html) {
      const badge = document.createElement('div');
      badge.className = 'lb-ext-badge';
      badge.innerHTML = html;
      el.style.position = 'relative';
      el.appendChild(badge);
    }
  });
}

// Ждём появления постеров в DOM (страница рендерится через React)
function waitForPosters(timeout = 10000) {
  return new Promise((resolve) => {
    const existing = document.querySelectorAll('[data-item-slug]');
    if (existing.length > 0) return resolve(existing.length);

    const observer = new MutationObserver(() => {
      const els = document.querySelectorAll('[data-item-slug]');
      if (els.length > 0) {
        observer.disconnect();
        resolve(els.length);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(document.querySelectorAll('[data-item-slug]').length);
    }, timeout);
  });
}

async function main() {
  const username = await getUsername();
  if (!username) {
    console.warn('[LB Ratings] Открой попап расширения и введи свой username.');
    return;
  }

  let cache = await getCache();
  let map;

  if (cache && Date.now() - cache.timestamp < CACHE_TTL && Object.keys(cache.data).length > 0) {
    map = cache.data;
  } else {
    map = await fetchUserData(username);
    await setCache(map);
  }

  await waitForPosters();
  injectBadges(map);
}

main();
