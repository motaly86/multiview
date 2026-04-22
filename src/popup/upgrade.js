// MultiView upgrade page
const api = typeof browser !== 'undefined' ? browser : chrome;
const statusEl = document.getElementById('status');

async function refresh() {
  try {
    const s = await MultiViewLicense.getStatus();
    if (s.tier === 'pro') {
      statusEl.textContent = '✓ You\'re on MultiView Pro. Thanks for supporting the project!';
      statusEl.classList.add('visible');
      document.getElementById('buyLifetime').textContent = 'Manage subscription';
    }
  } catch (e) { /* not fatal */ }
}

document.getElementById('buyLifetime').addEventListener('click', () => {
  MultiViewLicense.openPaymentPage();
});
document.getElementById('loginLink').addEventListener('click', () => {
  MultiViewLicense.openLoginPage();
});
document.getElementById('closeBtn').addEventListener('click', () => window.close());

refresh();
