// MultiView License
// Wraps ExtensionPay (https://extensionpay.com). Single source of truth for
// "is this user paid?" and the per-tier stream limit.
//
// Loads in two contexts:
//   - Background service worker (Chrome MV3): preceded by importScripts('../shared/ExtPay.js')
//   - Popup / pricing page: preceded by <script src="../shared/ExtPay.js"></script>
//
// In both cases `ExtPay` is expected to be a global by the time this file runs.

const MultiViewLicense = (() => {
  const EXTENSION_ID = 'multiview'; // matches the slug registered at extensionpay.com
  const FREE_LIMIT = 4;
  const PRO_LIMIT = 32;
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5min — short enough that a missed onPaid event resolves quickly
  const GRACE_MS = 7 * 24 * 60 * 60 * 1000; // offline grace

  const api = typeof browser !== 'undefined' ? browser : chrome;
  let extpay = null;
  let cached = null; // { paid, checkedAt }

  function ensure() {
    if (extpay) return extpay;
    if (typeof ExtPay === 'undefined') {
      throw new Error('ExtPay SDK not loaded — include src/shared/ExtPay.js first');
    }
    extpay = ExtPay(EXTENSION_ID);
    return extpay;
  }

  async function readCache() {
    const r = await api.storage.local.get('mv_license');
    return r.mv_license || null;
  }

  async function writeCache(entry) {
    await api.storage.local.set({ mv_license: entry });
  }

  async function fetchFresh() {
    const ep = ensure();
    const user = await ep.getUser(); // throws on network failure
    const entry = { paid: !!user.paid, paidAt: user.paidAt || null, checkedAt: Date.now() };
    await writeCache(entry);
    cached = entry;
    return entry;
  }

  // Returns { tier, limit, paid, stale } — never throws. Falls back to cache,
  // then to free tier, so a network blip doesn't lock paying users out.
  async function getStatus() {
    const now = Date.now();
    if (!cached) cached = await readCache();

    const fresh = cached && now - cached.checkedAt < CACHE_TTL_MS;
    if (!fresh) {
      try { await fetchFresh(); }
      catch (e) { /* keep cached */ }
    }

    const entry = cached;
    if (!entry) return { tier: 'free', limit: FREE_LIMIT, paid: false, stale: false };

    const withinGrace = now - entry.checkedAt < GRACE_MS;
    if (entry.paid && withinGrace) {
      return { tier: 'pro', limit: PRO_LIMIT, paid: true, stale: !fresh };
    }
    return { tier: 'free', limit: FREE_LIMIT, paid: false, stale: !fresh };
  }

  async function invalidate() {
    cached = null;
    try { await api.storage.local.remove('mv_license'); } catch (e) {}
  }

  async function openPaymentPage() {
    // Invalidate the cache so the next getStatus() refetches — catches cases
    // where the onPaid listener misses the post-checkout event.
    await invalidate();
    ensure().openPaymentPage();
  }
  async function openLoginPage() {
    await invalidate();
    ensure().openLoginPage();
  }

  // Background-only: subscribes to payment events so getUser() syncs after a
  // successful checkout. Must be called once at service-worker startup.
  function startBackground() {
    const ep = ensure();
    if (typeof ep.startBackground === 'function') ep.startBackground();
    if (typeof ep.onPaid === 'object' && ep.onPaid.addListener) {
      ep.onPaid.addListener(() => { fetchFresh().catch(() => {}); });
    }
  }

  return {
    getStatus,
    openPaymentPage,
    openLoginPage,
    startBackground,
    FREE_LIMIT,
    PRO_LIMIT,
  };
})();

if (typeof self !== 'undefined') self.MultiViewLicense = MultiViewLicense;
