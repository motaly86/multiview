// Storage wrapper - works in both Chrome and Firefox
const MultiViewStorage = (() => {
  const api = typeof browser !== 'undefined' ? browser : chrome;
  const MAX_VIDEOS = 32;

  async function getQueue() {
    const result = await api.storage.local.get('multiview_queue');
    return result.multiview_queue || [];
  }

  async function setQueue(queue) {
    await api.storage.local.set({ multiview_queue: queue });
  }

  async function addVideo(video) {
    const queue = await getQueue();
    if (queue.length >= MAX_VIDEOS) return { error: 'Queue is full (max 32)' };
    if (queue.some(v => v.url === video.url)) return { error: 'Already in queue' };
    video.id = video.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    video.addedAt = Date.now();
    queue.push(video);
    await setQueue(queue);
    return { ok: true, queue };
  }

  async function removeVideo(id) {
    const queue = await getQueue();
    const filtered = queue.filter(v => v.id !== id);
    await setQueue(filtered);
    return { ok: true, queue: filtered };
  }

  async function clearQueue() {
    await setQueue([]);
    return { ok: true, queue: [] };
  }

  return { getQueue, setQueue, addVideo, removeVideo, clearQueue, MAX_VIDEOS };
})();

if (typeof window !== 'undefined') window.MultiViewStorage = MultiViewStorage;
