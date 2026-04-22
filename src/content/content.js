// MultiView Content Script - detects videos and injects "+" badges
(function() {
  var api = typeof browser !== 'undefined' ? browser : chrome;
  var badges = [];

  function scanForVideos() {
    // Remove stale badges
    badges = badges.filter(function(b) {
      if (!document.contains(b.element)) {
        if (b.badge && b.badge.parentNode) b.badge.remove();
        return false;
      }
      return true;
    });

    var handlers = [
      window.YouTubeHandler,
      window.TwitchHandler,
      window.GenericHandler,
    ].filter(Boolean);

    for (var h = 0; h < handlers.length; h++) {
      var detected = handlers[h].detect();
      for (var d = 0; d < detected.length; d++) {
        var item = detected[d];
        if (item.element.querySelector('.multiview-badge')) continue;
        injectBadge(item);
      }
    }
  }

  function injectBadge(item) {
    var el = item.element;

    // Make container relative if not already positioned
    var pos = getComputedStyle(el).position;
    if (pos === 'static') {
      el.classList.add('multiview-badge-container');
    }

    var badge = document.createElement('div');
    badge.className = 'multiview-badge';
    badge.innerHTML = '<span>+</span>';
    badge.title = 'Add to MultiView';

    badge.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      api.runtime.sendMessage({
        action: 'addVideo',
        video: item.video,
      }).then(function(result) {
        if (result && result.ok) {
          badge.classList.add('multiview-added', 'multiview-flash');
          setTimeout(function() { badge.classList.remove('multiview-flash'); }, 600);
          var count = result.queue ? result.queue.length : '?';
          showToast('✓ Added to MultiView (' + count + '/32)', 'success');
        } else if (result && result.error === 'duplicate') {
          showToast('Already in queue', 'warning');
        } else if (result && result.error === 'full') {
          showToast('Queue is full (32 max)', 'error');
        }
      }).catch(function(err) {
        console.warn('MultiView: failed to add video', err);
      });
    }, true);

    el.appendChild(badge);
    badges.push({ element: el, badge: badge, video: item.video });
  }

  // Initial scan (delay slightly to let page render)
  setTimeout(scanForVideos, 500);

  // Re-scan on DOM changes (YouTube SPA, infinite scroll, etc.)
  var scanTimer = null;
  var observer = new MutationObserver(function() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scanForVideos, 800);
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  // Show toast notification on the page
  function showToast(message, type) {
    // Remove existing toast
    var existing = document.getElementById('multiview-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'multiview-toast';
    toast.textContent = message;

    var colors = {
      success: { bg: '#065f46', border: '#10b981' },
      warning: { bg: '#78350f', border: '#f59e0b' },
      error:   { bg: '#7f1d1d', border: '#ef4444' },
    };
    var c = colors[type] || colors.success;

    toast.style.cssText =
      'position:fixed;top:20px;right:20px;z-index:2147483647;' +
      'background:' + c.bg + ';border:1px solid ' + c.border + ';' +
      'color:white;padding:10px 18px;border-radius:8px;font-size:14px;' +
      'font-family:system-ui,sans-serif;font-weight:600;' +
      'box-shadow:0 4px 20px rgba(0,0,0,0.4);' +
      'animation:multiview-toast-in 0.3s ease-out;' +
      'pointer-events:none;';

    document.body.appendChild(toast);
    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(function() { toast.remove(); }, 300);
    }, 2000);
  }

  // Listen for messages from background
  api.runtime.onMessage.addListener(function(msg) {
    if (msg.action === 'showToast') {
      showToast(msg.message, msg.type);
    }
    if (msg.action === 'markAsTile') {
      injectTileControl();
    }
  });

  // Check if this window is a tile (popup type window)
  function checkIfTile() {
    api.runtime.sendMessage({ action: 'amIaTile' }).then(function(result) {
      if (result && result.isTile) {
        injectTileControl();
      }
    }).catch(function() {});
  }

  // Inject floating MultiView control on tiled windows
  function injectTileControl() {
    if (document.getElementById('multiview-tile-control')) return;

    var control = document.createElement('div');
    control.id = 'multiview-tile-control';
    control.className = 'multiview-tile-control';
    control.innerHTML =
      '<button class="multiview-tile-btn">' +
        '<div class="multiview-tile-logo"><div></div><div></div><div></div><div></div></div>' +
        'MultiView' +
      '</button>' +
      '<button class="multiview-tile-btn close-all">✕ Close All</button>';

    var buttons = control.querySelectorAll('.multiview-tile-btn');

    // MultiView button — open queue manager
    buttons[0].addEventListener('click', function() {
      api.runtime.sendMessage({ action: 'openGrid' });
    });

    // Close All button
    buttons[1].addEventListener('click', function() {
      api.runtime.sendMessage({ action: 'closeTiles' });
    });

    document.body.appendChild(control);
  }

  // Check on load (slight delay for page to settle)
  setTimeout(checkIfTile, 500);
})();
