// MultiView Popup Script
const api = typeof browser !== 'undefined' ? browser : chrome;

const queueEl = document.getElementById('queue');
const countEl = document.getElementById('count');
const pasteInput = document.getElementById('pasteUrl');
const tierPill = document.getElementById('tierPill');
const upsellEl = document.getElementById('upsell');
const audioRow = document.getElementById('audioRow');
const audioBtn = document.getElementById('audioToggle');
const audioIcon = document.getElementById('audioIcon');
const audioLabel = document.getElementById('audioLabel');

let licenseState = { tier: 'free', limit: 4 };

async function refreshLicense() {
  const r = await api.runtime.sendMessage({ action: 'getLicense' });
  licenseState = r?.license || licenseState;
  if (licenseState.tier === 'pro') {
    tierPill.textContent = 'Pro';
    tierPill.className = 'tier-pill pro';
  } else {
    tierPill.textContent = 'Upgrade';
    tierPill.className = 'tier-pill free';
  }
  tierPill.hidden = false;
}

function showUpsell(show) {
  upsellEl.classList.toggle('visible', !!show && licenseState.tier === 'free');
}

async function refreshAudioRow() {
  const r = await api.runtime.sendMessage({ action: 'getMuteState' });
  if (!r?.anyTiles) { audioRow.hidden = true; return; }
  audioRow.hidden = false;
  if (r.allMuted) {
    audioIcon.innerHTML = '&#128264;'; // speaker (muted via lack of waves)
    audioLabel.textContent = 'Unmute all';
    audioBtn.className = 'btn audio-btn muted';
    audioBtn.dataset.next = 'unmute';
  } else {
    audioIcon.innerHTML = '&#128266;'; // speaker with waves
    audioLabel.textContent = 'Mute all';
    audioBtn.className = 'btn audio-btn live';
    audioBtn.dataset.next = 'mute';
  }
}

async function loadQueue() {
  const result = await api.runtime.sendMessage({ action: 'getQueue' });
  const queue = result?.queue || [];
  countEl.textContent = `${queue.length} / ${licenseState.limit}`;
  showUpsell(queue.length >= licenseState.limit);

  if (queue.length === 0) {
    queueEl.innerHTML = `
      <div class="empty">
        <div class="empty-icon">&#128250;</div>
        <div>No videos in queue</div>
        <div style="font-size:11px;color:#444;margin-top:4px;">Browse videos and click the + badge to add them</div>
      </div>
    `;
    return;
  }

  queueEl.innerHTML = queue.map(v => `
    <div class="queue-item" data-id="${v.id}">
      ${v.thumbnail
        ? `<img class="queue-thumb" src="${v.thumbnail}" alt="" />`
        : `<div class="queue-thumb"></div>`
      }
      <div class="queue-info">
        <div class="queue-title" title="${escapeAttr(v.title)}">${escapeHtml(v.title)}</div>
        <div class="queue-site">${escapeHtml(v.site)}</div>
      </div>
      <button class="queue-remove" data-remove="${v.id}" title="Remove">&times;</button>
    </div>
  `).join('');
}

// Remove video
queueEl.addEventListener('click', async (e) => {
  const id = e.target.dataset?.remove;
  if (!id) return;
  await api.runtime.sendMessage({ action: 'removeVideo', id });
  loadQueue();
});

// Open grid
document.getElementById('openGrid').addEventListener('click', async () => {
  await api.runtime.sendMessage({ action: 'openGrid' });
  window.close();
});

// Tile windows
document.getElementById('tileWindows').addEventListener('click', async () => {
  await api.runtime.sendMessage({ action: 'tileWindows' });
  window.close();
});

// Mute / unmute all tiles
audioBtn.addEventListener('click', async () => {
  const next = audioBtn.dataset.next === 'mute' ? 'muteAll' : 'unmuteAll';
  await api.runtime.sendMessage({ action: next });
  refreshAudioRow();
});

// Close tiles
document.getElementById('closeTiles').addEventListener('click', async () => {
  await api.runtime.sendMessage({ action: 'closeTiles' });
});

// Clear all (also closes tiles)
document.getElementById('clearAll').addEventListener('click', async () => {
  await api.runtime.sendMessage({ action: 'clearQueue' });
  loadQueue();
});

// Add URL
async function addUrl() {
  const url = pasteInput.value.trim();
  if (!url) return;

  // Parse URL - basic detection
  let video = null;

  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    const id = ytMatch[1];
    video = {
      url,
      embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&enablejsapi=1`,
      thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
      title: `YouTube ${id}`,
      site: 'youtube',
      videoId: id,
    };
  }

  // Twitch
  if (!video) {
    const twMatch = url.match(/twitch\.tv\/([a-zA-Z0-9_]{3,25})(?:\/|$)/);
    if (twMatch) {
      const channel = twMatch[1];
      const reserved = ['directory', 'videos', 'settings', 'subscriptions', 'inventory', 'drops', 'wallet', 'search'];
      if (!reserved.includes(channel.toLowerCase())) {
        video = {
          url,
          embedUrl: `https://player.twitch.tv/?channel=${channel}&parent=${location.hostname}&muted=true&autoplay=true`,
          thumbnail: '',
          title: channel,
          site: 'twitch',
          channel,
        };
      }
    }
  }

  // Generic
  if (!video) {
    try {
      const u = new URL(url);
      video = {
        url,
        embedUrl: url,
        thumbnail: '',
        title: u.hostname + ' ' + u.pathname.split('/').pop(),
        site: 'generic',
        isDirectVideo: true,
      };
    } catch { return; }
  }

  const result = await api.runtime.sendMessage({ action: 'addVideo', video });
  if (result?.ok) {
    pasteInput.value = '';
    loadQueue();
  } else if (result?.error === 'limit') {
    showUpsell(true);
  }
}

tierPill.addEventListener('click', () => {
  if (licenseState.tier === 'free') api.runtime.sendMessage({ action: 'openUpgrade' });
});
document.getElementById('upsellCta').addEventListener('click', () => {
  api.runtime.sendMessage({ action: 'openUpgrade' });
});

document.getElementById('addUrl').addEventListener('click', addUrl);
pasteInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addUrl();
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// Load on open
(async () => {
  await refreshLicense();
  await loadQueue();
  await refreshAudioRow();
})();
