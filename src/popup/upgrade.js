// MultiView upgrade page
const api = typeof browser !== 'undefined' ? browser : chrome;
const statusEl = document.getElementById('status');

let isPro = false;

async function refresh() {
  try {
    const s = await MultiViewLicense.getStatus();
    if (s.tier === 'pro') {
      isPro = true;
      statusEl.textContent = '✓ You\'re on MultiView Pro. Thanks for supporting the project!';
      statusEl.classList.add('visible');
      document.getElementById('buyLifetime').textContent = 'Manage account';
    }
  } catch (e) { /* not fatal */ }
}

document.getElementById('buyLifetime').addEventListener('click', () => {
  if (isPro) MultiViewLicense.openLoginPage();
  else MultiViewLicense.openPaymentPage();
});
document.getElementById('loginLink').addEventListener('click', () => {
  MultiViewLicense.openLoginPage();
});
document.getElementById('closeBtn').addEventListener('click', () => window.close());

refresh();
