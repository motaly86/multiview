// MultiView Background Service Worker
const api = typeof browser !== 'undefined' ? browser : chrome;

// License (ExtensionPay). importScripts only exists in MV3 service workers;
// in Firefox MV2 the same files are loaded via <script> tags from the
// background page, so we guard.
try {
  if (typeof importScripts === 'function') {
    importScripts('../shared/ExtPay.js', '../shared/license.js');
  }
} catch (e) {
  console.error('MultiView: failed to load license SDK', e);
}

try { MultiViewLicense.startBackground(); } catch (e) {
  console.error('MultiView: license init failed', e);
}

// Storage helpers
const Storage = {
  async getQueue() {
    const result = await api.storage.local.get('multiview_queue');
    return result.multiview_queue || [];
  },
  async setQueue(queue) {
    await api.storage.local.set({ multiview_queue: queue });
  }
};

// Update badge count
async function updateBadge() {
  const queue = await Storage.getQueue();
  const count = queue.length;
  (api.action || api.browserAction).setBadgeText({ text: count > 0 ? String(count) : '' });
  (api.action || api.browserAction).setBadgeBackgroundColor({ color: '#6366f1' });
}

// Single message handler for ALL actions
api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Pass sender info into the message for handlers that need it
  msg._senderWindowId = sender.tab ? sender.tab.windowId : null;
  handleMessage(msg).then(sendResponse).catch(err => {
    console.error('MultiView message error:', err);
    sendResponse({ error: err.message });
  });
  return true; // async response
});

async function handleMessage(msg) {
  switch (msg.action) {
    case 'addVideo': {
      const queue = await Storage.getQueue();
      const license = await MultiViewLicense.getStatus();
      if (queue.length >= license.limit) {
        if (license.tier === 'free') {
          return { error: 'limit', tier: 'free', limit: license.limit, message: 'Free plan limit (' + license.limit + ' streams). Upgrade to add more.' };
        }
        return { error: 'full', message: 'Queue is full (max ' + license.limit + ')' };
      }
      const video = msg.video;
      if (queue.some(v => v.url === video.url)) return { error: 'duplicate', message: 'Already in queue' };
      video.id = video.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      video.addedAt = Date.now();
      queue.push(video);
      await Storage.setQueue(queue);
      await updateBadge();
      // Show brief notification on the badge
      (api.action || api.browserAction).setBadgeText({ text: '+1' });
      (api.action || api.browserAction).setBadgeBackgroundColor({ color: '#22c55e' });
      setTimeout(function() { updateBadge(); }, 1500);
      return { ok: true, queue };
    }
    case 'removeVideo': {
      const queue = await Storage.getQueue();
      const filtered = queue.filter(v => v.id !== msg.id);
      await Storage.setQueue(filtered);
      await updateBadge();
      return { ok: true, queue: filtered };
    }
    case 'getQueue': {
      const queue = await Storage.getQueue();
      return { ok: true, queue };
    }
    case 'clearQueue': {
      await closeTiledWindows();
      await Storage.setQueue([]);
      await updateBadge();
      return { ok: true, queue: [] };
    }
    case 'openGrid': {
      await openGridPage();
      return { ok: true };
    }
    case 'tileWindows': {
      await tileWindows();
      return { ok: true };
    }
    case 'closeTiles': {
      await closeTiledWindows();
      return { ok: true };
    }
    case 'getLicense': {
      const license = await MultiViewLicense.getStatus();
      return { ok: true, license };
    }
    case 'openUpgrade': {
      try { await MultiViewLicense.openPaymentPage(); }
      catch (e) {
        // Fallback: open our local pricing page if SDK isn't available
        await api.tabs.create({ url: api.runtime.getURL('src/popup/upgrade.html') });
      }
      return { ok: true };
    }
    case 'amIaTile': {
      var tileResult = await api.storage.local.get('multiview_tile_windows');
      var tileIds = tileResult.multiview_tile_windows || [];
      // Check if the sender's window is in our tile list
      var senderWindowId = msg._senderWindowId;
      return { isTile: tileIds.indexOf(senderWindowId) !== -1 };
    }
    default:
      return { error: 'Unknown action: ' + msg.action };
  }
}

// Context menu: register on install
api.runtime.onInstalled.addListener(() => {
  api.contextMenus.create({
    id: 'multiview-add',
    title: 'Add to MultiView',
    contexts: ['link', 'video', 'page'],
  });
});

api.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'multiview-add') return;
  var url = info.linkUrl || info.srcUrl || info.pageUrl;
  if (!url) return;
  var video = parseVideoUrl(url);
  var result = await handleMessage({ action: 'addVideo', video: video });

  // Send toast notification to the active tab
  try {
    if (result.ok) {
      var count = result.queue ? result.queue.length : '?';
      api.tabs.sendMessage(tab.id, {
        action: 'showToast',
        message: '✓ Added to MultiView (' + count + '/32)',
        type: 'success',
      });
    } else if (result.error === 'duplicate') {
      api.tabs.sendMessage(tab.id, {
        action: 'showToast',
        message: 'Already in queue',
        type: 'warning',
      });
    } else if (result.error === 'full') {
      api.tabs.sendMessage(tab.id, {
        action: 'showToast',
        message: 'Queue is full (' + (result.limit || 32) + ' max)',
        type: 'error',
      });
    } else if (result.error === 'limit') {
      api.tabs.sendMessage(tab.id, {
        action: 'showToast',
        message: 'Free plan: ' + result.limit + ' streams. Click extension icon to upgrade.',
        type: 'warning',
      });
    }
  } catch (e) {}
});

// Parse YouTube, Twitch, or generic URLs
function parseVideoUrl(url) {
  var ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    var id = ytMatch[1];
    return {
      url: url,
      embedUrl: 'https://www.youtube.com/embed/' + id + '?autoplay=1&mute=1&enablejsapi=1',
      thumbnail: 'https://img.youtube.com/vi/' + id + '/mqdefault.jpg',
      title: 'YouTube ' + id,
      site: 'youtube',
      videoId: id,
    };
  }

  var twMatch = url.match(/twitch\.tv\/([a-zA-Z0-9_]{3,25})(?:\/|$)/);
  if (twMatch) {
    var channel = twMatch[1];
    var reserved = ['directory', 'videos', 'settings', 'subscriptions', 'inventory', 'drops', 'wallet', 'search'];
    if (reserved.indexOf(channel.toLowerCase()) === -1) {
      return {
        url: url,
        embedUrl: 'https://player.twitch.tv/?channel=' + channel + '&parent=www.twitch.tv&muted=true&autoplay=true',
        thumbnail: '',
        title: channel,
        site: 'twitch',
        channel: channel,
      };
    }
  }

  return {
    url: url,
    embedUrl: url,
    title: url.split('/').pop() || url,
    site: 'generic',
    isDirectVideo: true,
  };
}

// Open or focus the grid page
async function openGridPage() {
  var gridUrl = api.runtime.getURL('src/grid/grid.html');
  var tabs = await api.tabs.query({ url: gridUrl });
  if (tabs.length > 0) {
    await api.tabs.update(tabs[0].id, { active: true });
    await api.windows.update(tabs[0].windowId, { focused: true });
  } else {
    await api.tabs.create({ url: gridUrl });
  }
}

// Tile windows — open each video in its own window arranged in a grid
async function tileWindows() {
  var fullQueue = await Storage.getQueue();
  if (fullQueue.length === 0) return;
  var license = await MultiViewLicense.getStatus();
  var queue = fullQueue.slice(0, license.limit);

  // Close any existing tiles first
  await closeTiledWindows();

  // Get current window for screen dimensions
  var currentWin = await api.windows.getCurrent();
  var totalW = currentWin.width || 1440;
  var totalH = currentWin.height || 900;
  var offsetLeft = currentWin.left || 0;
  var offsetTop = currentWin.top || 0;

  // Calculate grid
  var count = queue.length;
  var cols, rows;
  if (count === 1) { cols = 1; rows = 1; }
  else if (count === 2) { cols = 2; rows = 1; }
  else if (count <= 4) { cols = 2; rows = 2; }
  else if (count <= 6) { cols = 3; rows = 2; }
  else if (count <= 9) { cols = 3; rows = 3; }
  else if (count <= 12) { cols = 4; rows = 3; }
  else if (count <= 16) { cols = 4; rows = 4; }
  else if (count <= 20) { cols = 5; rows = 4; }
  else if (count <= 25) { cols = 5; rows = 5; }
  else { cols = 6; rows = Math.ceil(count / 6); }

  var cellW = Math.floor(totalW / cols);
  var cellH = Math.floor(totalH / rows);
  var windowIds = [];

  for (var i = 0; i < queue.length; i++) {
    var video = queue[i];
    var col = i % cols;
    var row = Math.floor(i / cols);
    var left = offsetLeft + (col * cellW);
    var top = offsetTop + (row * cellH);

    // Build the best URL for tiling
    var tileUrl = video.url;
    if (video.site === 'twitch' && video.channel) {
      // Theater mode for less clutter
      tileUrl = 'https://www.twitch.tv/' + video.channel + '?theatre=true';
    } else if (video.site === 'youtube' && video.videoId) {
      // Autoplay for YouTube
      tileUrl = 'https://www.youtube.com/watch?v=' + video.videoId + '&autoplay=1';
    }

    try {
      var win = await api.windows.create({
        url: tileUrl,
        type: 'popup',
        left: left,
        top: top,
        width: cellW,
        height: cellH,
      });
      windowIds.push(win.id);
    } catch (e) {
      console.warn('MultiView: failed to create window for', video.url, e);
    }
  }

  await api.storage.local.set({ multiview_tile_windows: windowIds });
}

// Close all tiled windows
async function closeTiledWindows() {
  var result = await api.storage.local.get('multiview_tile_windows');
  var windowIds = result.multiview_tile_windows || [];
  for (var i = 0; i < windowIds.length; i++) {
    try { await api.windows.remove(windowIds[i]); } catch (e) {}
  }
  await api.storage.local.remove('multiview_tile_windows');
}

// Keyboard shortcut: open grid page
api.commands.onCommand.addListener(async function(command) {
  if (command === 'toggle-grid') {
    await openGridPage();
  }
});

// Initialize badge on startup
updateBadge();
