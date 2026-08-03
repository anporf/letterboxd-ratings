document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggle');
  const status = document.getElementById('status');

  toggleBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.url || !tab.url.includes('letterboxd.com')) {
        status.textContent = 'Открой список на letterboxd.com.';
        return;
      }
      chrome.tabs.sendMessage(tab.id, { action: 'toggle' }, (resp) => {
        if (chrome.runtime.lastError) {
          status.textContent = 'Обнови страницу и попробуй снова.';
          return;
        }
        if (resp && resp.visible) {
          toggleBtn.textContent = 'Скрыть оценки';
          status.textContent = '';
        } else {
          toggleBtn.textContent = 'Показать оценки';
          status.textContent = '';
        }
      });
    });
  });
});
