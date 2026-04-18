const STORAGE_KEY = 'tenis-miri-theme';

function getSystemPref() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getTheme() {
  return localStorage.getItem(STORAGE_KEY) || getSystemPref();
}

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

function updateButton(theme) {
  const btn = document.getElementById('btn-theme');
  if (!btn) return;
  const isDark = theme === 'dark';
  btn.setAttribute('aria-label', isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  btn.querySelector('.icon-sun')?.classList.toggle('hidden', !isDark);
  btn.querySelector('.icon-moon')?.classList.toggle('hidden', isDark);
}

export function initTheme() {
  const theme = getTheme();
  applyTheme(theme);       // idempotent — safe even if inline script already ran
  updateButton(theme);     // requires DOM: called inside DOMContentLoaded

  // Sync with OS if no manual override stored
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const t = e.matches ? 'dark' : 'light';
      applyTheme(t);
      updateButton(t);
      _onChangeCallback?.();
    }
  });
}

let _onChangeCallback = null;

export function onThemeChange(fn) {
  _onChangeCallback = fn;
}

export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  localStorage.setItem(STORAGE_KEY, next);
  applyTheme(next);
  updateButton(next);
  _onChangeCallback?.();
}
