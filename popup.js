document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('username');
  const status = document.getElementById('status');

  chrome.storage.local.get(['username'], (r) => {
    if (r.username) input.value = r.username;
  });

  document.getElementById('save').addEventListener('click', () => {
    const username = input.value.trim();
    if (!username) return;
    chrome.storage.local.set({ username }, () => {
      status.textContent = 'Сохранено. Перезагрузи страницу списка.';
    });
  });

  document.getElementById('clearCache').addEventListener('click', () => {
    chrome.storage.local.remove(['lb_ratings_cache'], () => {
      status.textContent = 'Кэш очищен. При следующем открытии данные скачаются заново.';
    });
  });
});
