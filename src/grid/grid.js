// MultiView Grid Page — queue manager + tile launcher
var api = typeof browser !== 'undefined' ? browser : chrome;

var contentEl = document.getElementById('content');
var countEl = document.getElementById('count');
var pasteInput = document.getElementById('pasteInput');

async function getQueue() {
  var result = await api.runtime.sendMessage({ action: 'getQueue' });
  return (result && result.queue) ? result.queue : [];
}

async function render() {
  var queue = await getQueue();
  countEl.textContent = queue.length + ' / 32 videos';

  if (queue.length === 0) {
    contentEl.innerHTML =
      '<div class="empty">' +
        '<div class="empty-icon">&#128250;</div>' +
        '<div style="font-size:18px;color:#888;">No videos in queue</div>' +
        '<div class="empty-steps">' +
          '<strong>Step 1:</strong> Go to YouTube, Twitch, or any video site<br>' +
          '<strong>Step 2:</strong> Right-click a video link &rarr; "Add to MultiView"<br>' +
          '<strong>Step 3:</strong> Come back here and click <strong>Tile Windows</strong>' +
        '</div>' +
      '</div>';
    return;
  }

  var html = '<div class="queue-list">';
  for (var i = 0; i < queue.length; i++) {
    var v = queue[i];
    var thumbHtml = v.thumbnail
      ? '<img class="queue-thumb" src="' + escapeAttr(v.thumbnail) + '" alt="" />'
      : '<div class="queue-thumb-placeholder">&#127909;</div>';

    html +=
      '<div class="queue-card" data-id="' + escapeAttr(v.id) + '">' +
        thumbHtml +
        '<div class="queue-card-info">' +
          '<span class="queue-card-title" title="' + escapeAttr(v.title) + '">' + escapeHtml(v.title) + '</span>' +
          '<span class="queue-card-site">' + escapeHtml(v.site) + '</span>' +
        '</div>' +
        '<button class="queue-card-remove" data-remove="' + escapeAttr(v.id) + '" title="Remove">&times;</button>' +
      '</div>';
  }
  html += '</div>';
  contentEl.innerHTML = html;
}

// Remove video on click
contentEl.addEventListener('click', async function(e) {
  var removeId = e.target.getAttribute('data-remove');
  if (!removeId) return;
  await api.runtime.sendMessage({ action: 'removeVideo', id: removeId });
  render();
});

// Tile Windows
document.getElementById('tileWindows').addEventListener('click', async function() {
  await api.runtime.sendMessage({ action: 'tileWindows' });
});

// Close Tiles
document.getElementById('closeTiles').addEventListener('click', async function() {
  await api.runtime.sendMessage({ action: 'closeTiles' });
});

// Clear All
document.getElementById('clearAll').addEventListener('click', async function() {
  await api.runtime.sendMessage({ action: 'clearQueue' });
  render();
});

// Parse pasted URL
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
        embedUrl: 'https://player.twitch.tv/?channel=' + channel + '&parent=' + location.hostname + '&muted=true&autoplay=true',
        thumbnail: '',
        title: channel,
        site: 'twitch',
        channel: channel,
      };
    }
  }

  try {
    var u = new URL(url);
    return {
      url: url,
      embedUrl: url,
      thumbnail: '',
      title: u.hostname + ' ' + u.pathname.split('/').pop(),
      site: 'generic',
      isDirectVideo: true,
    };
  } catch(e) { return null; }
}

async function addFromPaste() {
  var url = pasteInput.value.trim();
  if (!url) return;
  var video = parseVideoUrl(url);
  if (!video) return;
  var result = await api.runtime.sendMessage({ action: 'addVideo', video: video });
  if (result && result.ok) {
    pasteInput.value = '';
    render();
  }
}

document.getElementById('addUrlBtn').addEventListener('click', addFromPaste);
pasteInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') addFromPaste();
});

// Auto-refresh on storage changes
api.storage.onChanged.addListener(function(changes) {
  if (changes.multiview_queue) render();
});

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// Initial render
render();
