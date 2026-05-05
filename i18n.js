import { translations } from './translations.js';

let currentLang = 'ms';

export function initI18n() {
  const saved = localStorage.getItem('kenal-lang');
  if (saved && translations[saved]) {
    currentLang = saved;
  } else {
    const browserLang = navigator.language?.slice(0, 2);
    if (browserLang === 'id') currentLang = 'id';
    else if (browserLang === 'en') currentLang = 'en';
    else currentLang = 'ms';
  }
  applyTranslations();
  updateLangSelector();
}

export function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  localStorage.setItem('kenal-lang', lang);
  applyTranslations();
  updateLangSelector();
}

function applyTranslations() {
  const t = translations[currentLang];
  // Update html lang attribute
  document.documentElement.lang = currentLang === 'ms' ? 'ms' : currentLang === 'id' ? 'id' : 'en';

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) {
      if (el.tagName === 'INPUT') {
        el.placeholder = t[key];
      } else {
        el.textContent = t[key];
      }
    }
  });
}

function updateLangSelector() {
  const selector = document.getElementById('lang-selector');
  if (selector) selector.value = currentLang;
}

export function t(key) {
  return translations[currentLang]?.[key] || key;
}
