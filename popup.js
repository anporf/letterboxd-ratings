document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggle');
  const clearBtn = document.getElementById('clearCache');
  const status = document.getElementById('status');

  function getActiveTab(cb) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.url || !tab.url.includes('letterboxd.com')) {
        status.textContent = 'Открой список на letterboxd.com.';
        return;
      }
      cb(tab);
    });
  }

  toggleBtn.addEventListener('click', () => {
    getActiveTab((tab) => {
      chrome.tabs.sendMessage(tab.id, { action: 'toggle' }, (resp) => {
        if (chrome.runtime.lastError) {
          status.textContent = 'Обнови страницу и попробуй снова.';
          return;
        }
        if (resp && resp.visible) {
          toggleBtn.textContent = 'Скрыть оценки';
          status.textContent = 'Оценки показаны.';
        } else {
          toggleBtn.textContent = 'Показать оценки';
          status.textContent = 'Оценки скрыты.';
        }
      });
    });
  });

  clearBtn.addEventListener('click', () => {
    getActiveTab((tab) => {
      chrome.tabs.sendMessage(tab.id, { action: 'clearCache' }, () => {
        status.textContent = 'Кэш очищен. Обнови страницу.';
      });
    });
  });
});
