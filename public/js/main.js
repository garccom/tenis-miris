import { fetchProducts } from './api.js';
import { state, applyFilters } from './state.js';
import { renderGrid, renderSkeleton } from './grid.js';
import { initFilters } from './filters.js';
import { initTheme, toggleTheme, onThemeChange } from './theme.js';

async function init() {
  renderSkeleton();
  try {
    const data = await fetchProducts();
    state.allProducts = data.products;
    state.meta = data.meta;
    initFilters(data.meta);
    renderGrid(applyFilters());
  } catch (err) {
    console.error('Init error:', err);
    const grid = document.getElementById('grid');
    if (grid) grid.innerHTML = `
      <div class="col-span-2 sm:col-span-3 lg:col-span-4 text-center py-20">
        <p class="text-[#525252] dark:text-[#a3a3a3] text-sm mb-4">No se pudieron cargar los productos.</p>
        <button onclick="location.reload()" class="text-sm underline text-[#0a0a0a] dark:text-[#fafafa]">Reintentar</button>
      </div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  document.getElementById('btn-theme')?.addEventListener('click', toggleTheme);

  // Re-render grid when theme toggles so Cloudinary image URLs update
  onThemeChange(() => renderGrid(applyFilters()));

  document.getElementById('grid')?.addEventListener('click', e => {
    const card = e.target.closest('[data-codigo]');
    if (card) location.href = `/producto.html?codigo=${encodeURIComponent(card.dataset.codigo)}`;
  });

  init();
});
