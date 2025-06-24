// content.js
// Extracts file names from the PR page DOM and responds to popup requests

function getPRFilesFromDOM() {
  // GitHub PR files are listed with the class 'file-info' inside 'js-file-list'
  const fileEls = document.querySelectorAll('.js-file-list .file-info a');
  return Array.from(fileEls).map(el => el.textContent.trim());
}

function getPRMetaFromDOM() {
  // Try to extract PR title, author, and number from the DOM
  const title = document.querySelector('.gh-header-title .js-issue-title')?.textContent?.trim() || '';
  const author = document.querySelector('.gh-header-meta .author')?.textContent?.trim() || '';
  const numberMatch = window.location.pathname.match(/\/pull\/(\d+)/);
  const number = numberMatch ? numberMatch[1] : '';
  return { title, author, number };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_PR_FILES') {
    const files = getPRFilesFromDOM();
    sendResponse({files});
  }
  if (request.type === 'MARK_ALL_VIEWED') {
    // Only mark visible (filtered) files as viewed
    const visibleCheckboxes = Array.from(document.querySelectorAll('.js-reviewed-checkbox')).filter(cb => {
      // Check if the checkbox or its parent file container is visible
      let el = cb;
      while (el && el !== document.body) {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          return false;
        }
        el = el.parentElement;
      }
      return true;
    });
    visibleCheckboxes.forEach(cb => {
      if (!cb.checked) {
        cb.click();
      }
    });
    sendResponse({success: true, count: visibleCheckboxes.length});
  }
  if (request.type === 'UNMARK_ALL_VIEWED') {
    // Only unmark visible (filtered) files
    const visibleCheckboxes = Array.from(document.querySelectorAll('.js-reviewed-checkbox')).filter(cb => {
      // Check if the checkbox or its parent file container is visible
      let el = cb;
      while (el && el !== document.body) {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          return false;
        }
        el = el.parentElement;
      }
      return true;
    });
    visibleCheckboxes.forEach(cb => {
      if (cb.checked) {
        cb.click();
      }
    });
    sendResponse({success: true, count: visibleCheckboxes.length});
  }
  if (request.type === 'GET_PR_COUNTS') {
    const visibleCheckboxes = Array.from(document.querySelectorAll('.js-reviewed-checkbox')).filter(cb => {
      // Check if the checkbox or its parent file container is visible
      let el = cb;
      while (el && el !== document.body) {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          return false;
        }
        el = el.parentElement;
      }
      return true;
    });
    const total = visibleCheckboxes.length;
    const viewed = visibleCheckboxes.filter(cb => cb.checked).length;
    sendResponse({total, viewed});
  }
  if (request.type === 'GET_PR_META') {
    sendResponse(getPRMetaFromDOM());
  }
});
