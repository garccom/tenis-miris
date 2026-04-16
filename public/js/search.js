import { state, applyFilters } from './state.js';
import { renderGrid } from './grid.js';
import { debounce } from './utils.js';

export function initSearch() {
  const searchBtn = document.getElementById('btn-search');
  const overlay = document.getElementById('search-overlay');
  const input = document.getElementById('search-input');
  const closeBtn = document.getElementById('btn-close-search');
  const clearBtn = document.getElementById('btn-clear-search');

  const run = debounce(q => {
    state.query = q;
    renderGrid(applyFilters());
    syncQueryToUrl(q);
  }, 200);

  searchBtn?.addEventListener('click', () => {
    overlay?.classList.remove('hidden');
    input?.focus();
  });

  closeBtn?.addEventListener('click', () => overlay?.classList.add('hidden'));

  clearBtn?.addEventListener('click', () => {
    if (input) input.value = '';
    run('');
  });

  input?.addEventListener('input', e => run(e.target.value));
  input?.addEventListener('keydown', e => { if (e.key === 'Escape') overlay?.classList.add('hidden'); });
}

function syncQueryToUrl(q) {
  const params = new URLSearchParams(location.search);
  q ? params.set('q', q) : params.delete('q');
  const url = params.toString() ? `${location.pathname}?${params}` : location.pathname;
  history.replaceState({}, '', url);
}
