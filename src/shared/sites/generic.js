// Generic video handler - works on any site with <video> elements
const GenericHandler = (() => {
  function detect() {
    // Skip on YouTube/Twitch where specific handlers work better
    if (window.YouTubeHandler?.isYouTube() || window.TwitchHandler?.isTwitch()) return [];

    const found = [];
    const videos = document.querySelectorAll('video');

    videos.forEach((video, i) => {
      // Skip tiny videos (likely UI elements, ads)
      if (video.offsetWidth < 100 || video.offsetHeight < 60) return;

      const src = video.src || video.querySelector('source')?.src || '';
      if (!src || src.startsWith('blob:')) {
        // For blob URLs, we can't embed them cross-context, so skip
        // unless we can find a page URL to use
        return;
      }

      const title = video.getAttribute('title') ||
        document.title ||
        `Video ${i + 1}`;

      found.push({
        element: video.parentElement || video,
        anchor: null,
        video: {
          url: src,
          embedUrl: src,
          thumbnail: '',
          title,
          site: 'generic',
          isDirectVideo: true,
        }
      });
    });

    return found;
  }

  // Parse pasted URLs - detect YouTube/Twitch URLs and convert
  function parseUrl(url) {
    try {
      const u = new URL(url);

      // YouTube
      const ytId = window.YouTubeHandler?.extractVideoId(url);
      if (ytId) {
        return {
          url,
          embedUrl: window.YouTubeHandler.getEmbedUrl(ytId),
          thumbnail: window.YouTubeHandler.getThumbnail(ytId),
          title: `YouTube ${ytId}`,
          site: 'youtube',
          videoId: ytId,
        };
      }

      // Twitch
      const channel = window.TwitchHandler?.extractChannel(url);
      if (channel) {
        return {
          url,
          embedUrl: window.TwitchHandler.getEmbedUrl(channel),
          thumbnail: '',
          title: channel,
          site: 'twitch',
          channel,
        };
      }

      // Generic URL - try as direct video
      return {
        url,
        embedUrl: url,
        thumbnail: '',
        title: u.hostname + u.pathname.split('/').pop(),
        site: 'generic',
        isDirectVideo: true,
      };
    } catch { return null; }
  }

  return { detect, parseUrl };
})();

if (typeof window !== 'undefined') window.GenericHandler = GenericHandler;
