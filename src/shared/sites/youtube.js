// YouTube site handler
const YouTubeHandler = (() => {
  const HOSTNAME_RE = /^(www\.)?youtube\.com$/;

  function isYouTube() {
    return HOSTNAME_RE.test(location.hostname);
  }

  function extractVideoId(url) {
    try {
      const u = new URL(url, location.origin);
      if (u.pathname === '/watch') return u.searchParams.get('v');
      const m = u.pathname.match(/^\/(?:embed|shorts|v)\/([a-zA-Z0-9_-]{11})/);
      return m ? m[1] : null;
    } catch { return null; }
  }

  function getEmbedUrl(videoId) {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&enablejsapi=1`;
  }

  function getThumbnail(videoId) {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  }

  function detect() {
    if (!isYouTube()) return [];
    const found = [];
    const seen = new Set();

    // Video links (thumbnails, titles, etc.)
    document.querySelectorAll('a[href*="watch?v="], a[href*="/shorts/"]').forEach(a => {
      const id = extractVideoId(a.href);
      if (!id || seen.has(id)) return;
      seen.add(id);

      // Find the thumbnail container
      const thumb = a.querySelector('ytd-thumbnail, yt-image, img, #thumbnail');
      const container = thumb || a;
      const title = a.getAttribute('title') ||
        a.closest('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer')
          ?.querySelector('#video-title')?.textContent?.trim() || `YouTube ${id}`;

      found.push({
        element: container,
        anchor: a,
        video: {
          url: `https://www.youtube.com/watch?v=${id}`,
          embedUrl: getEmbedUrl(id),
          thumbnail: getThumbnail(id),
          title,
          site: 'youtube',
          videoId: id,
        }
      });
    });

    return found;
  }

  return { isYouTube, extractVideoId, getEmbedUrl, getThumbnail, detect };
})();

if (typeof window !== 'undefined') window.YouTubeHandler = YouTubeHandler;
