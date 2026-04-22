// Twitch site handler
const TwitchHandler = (() => {
  const HOSTNAME_RE = /^(www\.)?twitch\.tv$/;

  function isTwitch() {
    return HOSTNAME_RE.test(location.hostname);
  }

  function extractChannel(url) {
    try {
      const u = new URL(url, location.origin);
      if (!HOSTNAME_RE.test(u.hostname)) return null;
      const m = u.pathname.match(/^\/([a-zA-Z0-9_]{3,25})(?:\/|$)/);
      if (!m) return null;
      // Exclude non-channel paths
      const reserved = ['directory', 'videos', 'settings', 'subscriptions', 'inventory', 'drops', 'wallet', 'search'];
      if (reserved.includes(m[1].toLowerCase())) return null;
      return m[1];
    } catch { return null; }
  }

  function getEmbedUrl(channel) {
    const parent = location.hostname;
    return `https://player.twitch.tv/?channel=${channel}&parent=${parent}&muted=true&autoplay=true`;
  }

  function detect() {
    if (!isTwitch()) return [];
    const found = [];
    const seen = new Set();

    // Channel links on directory/browse pages
    document.querySelectorAll('a[href]').forEach(a => {
      const channel = extractChannel(a.href);
      if (!channel || seen.has(channel.toLowerCase())) return;

      // Only pick links that look like stream cards (have an image nearby)
      const card = a.closest('[data-a-target="preview-card-channel-link"], .tw-tower, article') ||
        a.querySelector('img') ? a : null;
      if (!card && !a.querySelector('img')) return;

      seen.add(channel.toLowerCase());
      const title = a.getAttribute('title') || a.textContent?.trim()?.slice(0, 60) || channel;

      found.push({
        element: a.querySelector('img')?.parentElement || a,
        anchor: a,
        video: {
          url: `https://www.twitch.tv/${channel}`,
          embedUrl: getEmbedUrl(channel),
          thumbnail: '',
          title,
          site: 'twitch',
          channel,
        }
      });
    });

    return found;
  }

  return { isTwitch, extractChannel, getEmbedUrl, detect };
})();

if (typeof window !== 'undefined') window.TwitchHandler = TwitchHandler;
