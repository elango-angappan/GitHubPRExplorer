// popup.js
// Enhanced popup: file/viewed counts, PR metadata, reload, mark all as viewed/unviewed, toast

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 2000);
}

function updateCounts(tabId) {
  chrome.tabs.sendMessage(tabId, {type: 'GET_PR_COUNTS'}, (res) => {
    // Handle potential errors or null responses (e.g., if chrome.runtime.lastError)
    if (chrome.runtime.lastError || !res) {
      const countsSection = document.getElementById('section-counts');
      const counts = document.getElementById('file-counts');
      counts.textContent = '';
      countsSection.style.display = 'none';
      return;
    }
    
    const counts = document.getElementById('file-counts');
    const countsSection = document.getElementById('section-counts');
    
    if (res && typeof res.total === 'number' && res.total > 0) {
      counts.textContent = `Visible files: ${res.total} | Viewed: ${res.viewed}`;
      countsSection.style.display = 'block';
    } else {
      counts.textContent = '';
      countsSection.style.display = 'none';
    }
  });
}

function updatePRMeta(tabId) {
  chrome.tabs.sendMessage(tabId, {type: 'GET_PR_META'}, (res) => {
    const meta = document.getElementById('pr-meta');
    if (res && res.title) {
      meta.innerHTML = `<strong>${res.title}</strong><br>By ${res.author} | #${res.number}`;
    } else {
      meta.textContent = 'PR info unavailable.';
    }
  });
}

function startLiveCounts(tabId) {
  updateCounts(tabId);
  if (window._liveCountsInterval) clearInterval(window._liveCountsInterval);
  window._liveCountsInterval = setInterval(() => {
    updateCounts(tabId);
  }, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
  const markAll = document.getElementById('mark-all');
  const unmarkAll = document.getElementById('unmark-all');
  const reloadBtn = document.getElementById('reload-btn');
  const countsSection = document.getElementById('section-counts');
  
  // Initially hide the counts section until we confirm there's data
  countsSection.style.display = 'none';

  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const tabId = tabs[0].id;
    const isPRPage = /https:\/\/github\.com\/.+\/.+\/pull\//.test(tabs[0].url);
    if (!isPRPage) {
      markAll.disabled = true;
      unmarkAll.disabled = true;
      reloadBtn.disabled = true;
      document.getElementById('pr-meta').textContent = 'Not a GitHub PR page.';
      return;
    }
    markAll.checked = false;
    unmarkAll.checked = false;
    markAll.disabled = false;
    unmarkAll.disabled = false;
    reloadBtn.disabled = false;

    function tryUpdateMetaAndCounts(retries = 6) {
      updateCounts(tabId);
      updatePRMeta(tabId);
      if (retries > 0) {
        setTimeout(() => {
          const meta = document.getElementById('pr-meta');
          const counts = document.getElementById('file-counts');
          const countsSection = document.getElementById('section-counts');
          
          // Check both textContent and innerHTML for fallback/empty/placeholder
          const metaContent = (meta.textContent || '').trim();
          const metaHTML = (meta.innerHTML || '').trim();
          const countContent = (counts.textContent || '').trim();
          
          // If meta data is not ready, try again
          if (
            !metaContent ||
            metaContent === 'PR info unavailable.' ||
            metaContent === 'Loading PR info...' ||
            metaHTML === '' ||
            /Loading PR info|PR info unavailable/.test(metaHTML)
          ) {
            tryUpdateMetaAndCounts(retries - 1);
          }
          
          // Handle counts section visibility
          if (!countContent) {
            countsSection.style.display = 'none';
          } else {
            countsSection.style.display = 'block';
          }
        }, 500);
      } else {
        // Fallback: show unavailable if still not loaded
        const meta = document.getElementById('pr-meta');
        if (!meta.textContent || meta.textContent === 'Loading PR info...') {
          meta.textContent = 'PR info unavailable.';
        }
        
        // Final check for counts section visibility
        const counts = document.getElementById('file-counts');
        const countsSection = document.getElementById('section-counts');
        if (!counts.textContent || counts.textContent.trim() === '') {
          countsSection.style.display = 'none';
        }
      }
    }
    tryUpdateMetaAndCounts();

    startLiveCounts(tabId);

    markAll.addEventListener('change', () => {
      if (markAll.checked) {
        chrome.tabs.sendMessage(tabId, {type: 'MARK_ALL_VIEWED'}, (res) => {
          showToast(`Marked ${res && res.count ? res.count : 0} files as viewed`);
          updateCounts(tabId);
          markAll.checked = false;
        });
      }
    });
    unmarkAll.addEventListener('change', () => {
      if (unmarkAll.checked) {
        chrome.tabs.sendMessage(tabId, {type: 'UNMARK_ALL_VIEWED'}, (res) => {
          showToast(`Marked ${res && res.count ? res.count : 0} files as unviewed`);
          updateCounts(tabId);
          unmarkAll.checked = false;
        });
      }
    });
    reloadBtn.addEventListener('click', () => {
      chrome.tabs.reload(tabId, {}, () => {
        showToast('PR page reloaded');
        setTimeout(() => {
          window.close();
        }, 800);
      });
    });

    // On popup close, clear interval
    window.addEventListener('unload', () => {
      if (window._liveCountsInterval) clearInterval(window._liveCountsInterval);
    });
  });
});
