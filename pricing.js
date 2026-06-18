import { initI18n, setLanguage } from './i18n.js';

window.__setLang = setLanguage;

document.addEventListener('DOMContentLoaded', () => {
  initI18n();
  initMobileMenu();
  initSubscribeModal();
});

function initMobileMenu() {
  const toggle = document.getElementById('menu-toggle');
  const menu = document.getElementById('mobile-menu');
  if (!toggle || !menu) return;
  toggle.addEventListener('click', () => menu.classList.toggle('active'));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.remove('active')));
}

function initSubscribeModal() {
  const modal = document.getElementById('pr-modal');
  if (!modal) return;

  const open = () => {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };
  const close = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  document.querySelectorAll('.js-subscribe').forEach(btn => btn.addEventListener('click', open));
  document.querySelectorAll('.js-modal-close').forEach(el => el.addEventListener('click', close));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}
