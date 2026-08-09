document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggle');
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

  function updateButton(visible) {
    toggleBtn.textContent = visible ? 'Скрыть оценки' : 'Показать оценки';
  }

  // Синхронизируем кнопку с текущим состоянием страницы
  getActiveTab((tab) => {
    chrome.tabs.sendMessage(tab.id, { action: 'getState' }, (resp) => {
      if (!chrome.runtime.lastError && resp) {
        updateButton(resp.visible);
      }
    });
  });

  toggleBtn.addEventListener('click', () => {
    getActiveTab((tab) => {
      chrome.tabs.sendMessage(tab.id, { action: 'toggle' }, (resp) => {
        if (chrome.runtime.lastError) {
          status.textContent = 'Обнови страницу и попробуй снова.';
          return;
        }
        if (resp) updateButton(resp.visible);
      });
    });
  });
});
