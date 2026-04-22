// MultiView Grid Overlay - the main viewing experience
const MultiViewGrid = (() => {
  const api = typeof browser !== 'undefined' ? browser : chrome;
  let overlay = null;
  let gridEl = null;
  let countEl = null;
  let currentLayout = 'auto';
  let maximizedId = null;

  function createOverlay() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.className = 'multiview-overlay';
    overlay.innerHTML = `
      <div class="multiview-toolbar">
        <span class="multiview-toolbar-title">MultiView</span>
        <span class="multiview-toolbar-count"></span>
        <button class="multiview-btn" data-action="playAll" title="Play All">&#9654; All</button>
        <button class="multiview-btn" data-action="pauseAll" title="Pause All">&#10074;&#10074; All</button>
        <button class="multiview-btn" data-action="muteAll" title="Mute All">&#128263; Mute</button>
        <button class="multiview-btn" data-action="unmuteAll" title="Unmute All">&#128266; Unmute</button>
        <select class="multiview-layout-select" title="Layout">
          <option value="auto">Auto Layout</option>
          <option value="1x1">1x1</option>
          <option value="2x2">2x2</option>
          <option value="3x3">3x3</option>
          <option value="4x4">4x4</option>
          <option value="5x5">5x5</option>
          <option value="6x6">6x6</option>
        </select>
        <button class="multiview-btn danger" data-action="clearAll">Clear All</button>
        <button class="multiview-btn-close" data-action="close" title="Close (Esc)">&times;</button>
      </div>
      <div class="multiview-grid"></div>
      <div class="multiview-paste-bar">
        <input class="multiview-paste-input" placeholder="Paste a YouTube, Twitch, or video URL and press Enter..." />
        <button class="multiview-btn" data-action="addUrl">Add</button>
      </div>
    `;

    gridEl = overlay.querySelector('.multiview-grid');
    countEl = overlay.querySelector('.multiview-toolbar-count');

    // Toolbar actions
    overlay.addEventListener('click', (e) => {
      const action = e.target.dataset?.action || e.target.closest('[data-action]')?.dataset?.action;
      if (!action) return;

      switch (action) {
        case 'close': hide(); break;
        case 'playAll': sendToAllIframes('play'); break;
        case 'pauseAll': sendToAllIframes('pause'); break;
        case 'muteAll': sendToAllIframes('mute'); break;
        case 'unmuteAll': sendToAllIframes('unmute'); break;
        case 'clearAll': clearAll(); break;
        case 'addUrl': addFromInput(); break;
      }
    });

    // Layout selector
    overlay.querySelector('.multiview-layout-select').addEventListener('change', (e) => {
      currentLayout = e.target.value;
      render();
    });

    // Paste URL on Enter
    overlay.querySelector('.multiview-paste-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addFromInput();
    });

    // Escape to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('active')) {
        hide();
      }
    });

    document.body.appendChild(overlay);
  }

  async function addFromInput() {
    const input = overlay.querySelector('.multiview-paste-input');
    const url = input.value.trim();
    if (!url) return;

    const video = window.GenericHandler?.parseUrl(url);
    if (!video) return;

    const result = await api.runtime.sendMessage({ action: 'addVideo', video });
    if (result?.ok) {
      input.value = '';
      render();
    }
  }

  async function render() {
    if (!gridEl) return;

    const queue = await MultiViewStorage.getQueue();
    countEl.textContent = `${queue.length} / ${MultiViewStorage.MAX_VIDEOS} videos`;

    if (queue.length === 0) {
      gridEl.innerHTML = `
        <div class="multiview-empty">
          <div class="multiview-empty-icon">&#128250;</div>
          <div>No videos yet</div>
          <div style="font-size:13px;">Close this overlay, browse videos, and click the + badge to add them.<br>Or paste a URL below.</div>
        </div>
      `;
      gridEl.style.gridTemplateColumns = '1fr';
      gridEl.style.gridTemplateRows = '1fr';
      return;
    }

    // Calculate layout
    const layout = currentLayout === 'auto'
      ? GridEngine.getLayout(queue.length)
      : GridEngine.PRESETS[currentLayout] || GridEngine.getLayout(queue.length);

    gridEl.style.gridTemplateColumns = `repeat(${layout.cols}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${layout.rows}, 1fr)`;

    // Build cells
    const existingCells = new Map();
    gridEl.querySelectorAll('.multiview-cell').forEach(cell => {
      existingCells.set(cell.dataset.id, cell);
    });

    // Remove cells not in queue
    existingCells.forEach((cell, id) => {
      if (!queue.find(v => v.id === id)) {
        cell.remove();
      }
    });

    queue.forEach(video => {
      let cell = existingCells.get(video.id);
      if (!cell) {
        cell = createCell(video);
        gridEl.appendChild(cell);
      }
      // Handle maximized state
      if (maximizedId && maximizedId === video.id) {
        cell.classList.add('maximized');
      } else {
        cell.classList.remove('maximized');
      }
      // Hide non-maximized cells when one is maximized
      if (maximizedId && maximizedId !== video.id) {
        cell.style.display = 'none';
      } else {
        cell.style.display = '';
      }
    });
  }

  function createCell(video) {
    const cell = document.createElement('div');
    cell.className = 'multiview-cell';
    cell.dataset.id = video.id;

    // Create the video/iframe element
    if (video.isDirectVideo) {
      const vid = document.createElement('video');
      vid.src = video.embedUrl;
      vid.autoplay = true;
      vid.muted = true;
      vid.loop = true;
      vid.playsInline = true;
      cell.appendChild(vid);
    } else {
      const iframe = document.createElement('iframe');
      iframe.src = video.embedUrl;
      iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.loading = 'lazy';
      cell.appendChild(iframe);
    }

    // Controls overlay
    const controls = document.createElement('div');
    controls.className = 'multiview-cell-controls';
    controls.innerHTML = `
      <span class="multiview-cell-title">${escapeHtml(video.title)}</span>
      <button class="multiview-cell-btn" data-cell-action="maximize" title="Maximize">&#9974;</button>
      <button class="multiview-cell-btn remove" data-cell-action="remove" title="Remove">&times;</button>
    `;

    controls.addEventListener('click', async (e) => {
      const action = e.target.dataset?.cellAction;
      if (!action) return;
      e.stopPropagation();

      if (action === 'remove') {
        await api.runtime.sendMessage({ action: 'removeVideo', id: video.id });
        if (maximizedId === video.id) maximizedId = null;
        render();
      } else if (action === 'maximize') {
        maximizedId = maximizedId === video.id ? null : video.id;
        render();
      }
    });

    // Double-click to maximize
    cell.addEventListener('dblclick', (e) => {
      if (e.target.closest('.multiview-cell-controls')) return;
      maximizedId = maximizedId === video.id ? null : video.id;
      render();
    });

    cell.appendChild(controls);
    return cell;
  }

  function sendToAllIframes(command) {
    if (!gridEl) return;
    // For YouTube embeds, use postMessage API
    gridEl.querySelectorAll('iframe').forEach(iframe => {
      try {
        if (iframe.src.includes('youtube.com/embed')) {
          const cmd = {
            play: '{"event":"command","func":"playVideo","args":""}',
            pause: '{"event":"command","func":"pauseVideo","args":""}',
            mute: '{"event":"command","func":"mute","args":""}',
            unmute: '{"event":"command","func":"unMute","args":""}',
          }[command];
          if (cmd) iframe.contentWindow.postMessage(cmd, '*');
        }
      } catch { /* cross-origin, expected */ }
    });

    // For direct video elements
    gridEl.querySelectorAll('video').forEach(video => {
      if (command === 'play') video.play();
      else if (command === 'pause') video.pause();
      else if (command === 'mute') video.muted = true;
      else if (command === 'unmute') video.muted = false;
    });
  }

  async function clearAll() {
    await api.runtime.sendMessage({ action: 'clearQueue' });
    maximizedId = null;
    render();
  }

  function show() {
    createOverlay();
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    render();
  }

  function hide() {
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function toggle() {
    if (overlay?.classList.contains('active')) {
      hide();
    } else {
      show();
    }
  }

  function isVisible() {
    return overlay?.classList.contains('active') || false;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Listen for storage changes to auto-refresh grid
  api.storage?.onChanged?.addListener((changes) => {
    if (changes.multiview_queue && overlay?.classList.contains('active')) {
      render();
    }
  });

  return { show, hide, toggle, isVisible, render };
})();

if (typeof window !== 'undefined') window.MultiViewGrid = MultiViewGrid;
