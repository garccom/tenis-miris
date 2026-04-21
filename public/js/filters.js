import { state, applyFilters } from './state.js';
import { renderGrid } from './grid.js';
import { formatMXN } from './utils.js';

export function initFilters(meta) {
  state.filters.precioMin = meta.precio_min;
  state.filters.precioMax = meta.precio_max;

  renderMarcaChips(meta.marcas);
  renderTallaChips(meta.tallas_disponibles);
  initPriceRange(meta.precio_min, meta.precio_max);
  initBottomSheet();
  syncFromUrl();
  syncPriceUI();
  syncChipsFromState();
  applyAndRender();
}

// ─── Chips ────────────────────────────────────────────────────────────────────

function renderMarcaChips(marcas) {
  const container = document.getElementById('filter-marcas');
  if (!container) return;

  container.innerHTML = marcas.map(m => chipHTML('chip-marca', 'data-marca', m, m)).join('');

  container.addEventListener('click', e => {
    const btn = e.target.closest('.chip-marca');
    if (!btn) return;
    toggleArray(state.filters.marcas, btn.dataset.marca);
    updateChips(container, '.chip-marca', 'data-marca', state.filters.marcas);
    applyAndRender();
  });
}

function renderTallaChips(tallas) {
  const container = document.getElementById('filter-tallas');
  if (!container) return;

  container.innerHTML = tallas.map(t => chipHTML('chip-talla w-12 h-12', 'data-talla', String(t), String(t))).join('');

  container.addEventListener('click', e => {
    const btn = e.target.closest('.chip-talla');
    if (!btn) return;
    toggleArray(state.filters.tallas, parseFloat(btn.dataset.talla));
    updateChips(container, '.chip-talla', 'data-talla', state.filters.tallas.map(String));
    applyAndRender();
  });
}

// ─── Price range ──────────────────────────────────────────────────────────────

function initPriceRange(min, max) {
  const minInput = document.getElementById('precio-min');
  const maxInput = document.getElementById('precio-max');
  const minLabel = document.getElementById('precio-min-label');
  const maxLabel = document.getElementById('precio-max-label');

  if (!minInput || !maxInput) return;

  [minInput, maxInput].forEach(input => {
    input.min = min;
    input.max = max;
  });
  minInput.value = min;
  maxInput.value = max;
  if (minLabel) minLabel.textContent = formatMXN(min);
  if (maxLabel) maxLabel.textContent = formatMXN(max);

  minInput.addEventListener('input', () => {
    const val = parseFloat(minInput.value);
    if (val > parseFloat(maxInput.value)) { minInput.value = maxInput.value; return; }
    state.filters.precioMin = val;
    if (minLabel) minLabel.textContent = formatMXN(val);
  });

  maxInput.addEventListener('input', () => {
    const val = parseFloat(maxInput.value);
    if (val < parseFloat(minInput.value)) { maxInput.value = minInput.value; return; }
    state.filters.precioMax = val;
    if (maxLabel) maxLabel.textContent = formatMXN(val);
  });
}

// ─── Bottom sheet ─────────────────────────────────────────────────────────────

function initBottomSheet() {
  const sheet = document.getElementById('filter-sheet');
  const overlay = document.getElementById('filter-overlay');
  const openBtn = document.getElementById('btn-open-filters');
  const closeBtn = document.getElementById('btn-close-filters');
  const applyBtn = document.getElementById('btn-apply-filters');
  const clearBtn = document.getElementById('btn-clear-filters');

  if (!sheet) return;

  const open = () => {
    sheet.classList.remove('translate-y-full');
    overlay?.classList.remove('opacity-0', 'pointer-events-none');
    document.body.classList.add('overflow-hidden');
  };

  const close = () => {
    sheet.classList.add('translate-y-full');
    overlay?.classList.add('opacity-0', 'pointer-events-none');
    document.body.classList.remove('overflow-hidden');
  };

  openBtn?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  overlay?.addEventListener('click', close);

  applyBtn?.addEventListener('click', () => { applyAndRender(); close(); });

  clearBtn?.addEventListener('click', () => {
    state.filters.marcas = [];
    state.filters.tallas = [];
    state.filters.precioMin = state.meta?.precio_min ?? null;
    state.filters.precioMax = state.meta?.precio_max ?? null;

    document.querySelectorAll('.chip-marca, .chip-talla').forEach(deactivateChip);

    const minInput = document.getElementById('precio-min');
    const maxInput = document.getElementById('precio-max');
    const minLabel = document.getElementById('precio-min-label');
    const maxLabel = document.getElementById('precio-max-label');
    if (minInput && state.meta) { minInput.value = state.meta.precio_min; if (minLabel) minLabel.textContent = formatMXN(state.meta.precio_min); }
    if (maxInput && state.meta) { maxInput.value = state.meta.precio_max; if (maxLabel) maxLabel.textContent = formatMXN(state.meta.precio_max); }

    applyAndRender();
    close();
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function chipHTML(classes, attr, value, label) {
  return `<button class="${classes} chip flex items-center justify-center text-sm border border-[#e5e5e5] dark:border-[#262626] rounded-full px-3 py-1.5 transition-colors duration-150 whitespace-nowrap" ${attr}="${value}">${label}</button>`;
}

function toggleArray(arr, value) {
  const idx = arr.indexOf(value);
  idx >= 0 ? arr.splice(idx, 1) : arr.push(value);
}

function updateChips(container, selector, attr, activeValues) {
  container.querySelectorAll(selector).forEach(btn => {
    const isActive = activeValues.includes(btn.getAttribute(attr));
    isActive ? activateChip(btn) : deactivateChip(btn);
  });
}

function activateChip(btn) {
  btn.classList.add('bg-[#0a0a0a]', 'dark:bg-[#fafafa]', 'text-white', 'dark:text-[#0a0a0a]', 'border-[#0a0a0a]', 'dark:border-[#fafafa]');
}

function deactivateChip(btn) {
  btn.classList.remove('bg-[#0a0a0a]', 'dark:bg-[#fafafa]', 'text-white', 'dark:text-[#0a0a0a]', 'border-[#0a0a0a]', 'dark:border-[#fafafa]');
}

function applyAndRender() {
  const results = applyFilters();
  renderGrid(results);
  syncToUrl();
  updateFilterIndicators();
}

function updateFilterIndicators() {
  const badge = document.getElementById('filter-badge');
  const bar = document.getElementById('active-filters-bar');
  if (!bar) return;

  const { marcas, tallas, precioMin, precioMax } = state.filters;
  const meta = state.meta;
  const priceChanged = meta && (precioMin !== meta.precio_min || precioMax !== meta.precio_max);
  const hasFilters = marcas.length > 0 || tallas.length > 0 || priceChanged;

  if (badge) badge.classList.toggle('hidden', !hasFilters);

  if (!hasFilters) {
    bar.classList.add('hidden');
    bar.classList.remove('flex');
    bar.innerHTML = '';
    return;
  }

  const parts = [];
  if (marcas.length) parts.push(marcas.join(', '));
  if (tallas.length) parts.push(tallas.join(' · '));
  if (priceChanged) parts.push(`${formatMXN(precioMin)} – ${formatMXN(precioMax)}`);

  bar.innerHTML = parts.map(p =>
    `<span class="inline-flex items-center px-2.5 py-1 rounded-full bg-[#f5f5f5] dark:bg-[#171717] border border-[#e5e5e5] dark:border-[#262626] font-medium text-[#0a0a0a] dark:text-[#fafafa]">${p}</span>`
  ).join('');
  bar.classList.remove('hidden');
  bar.classList.add('flex');
}

function syncPriceUI() {
  const minInput = document.getElementById('precio-min');
  const maxInput = document.getElementById('precio-max');
  const minLabel = document.getElementById('precio-min-label');
  const maxLabel = document.getElementById('precio-max-label');
  if (minInput && state.filters.precioMin !== null) {
    minInput.value = state.filters.precioMin;
    if (minLabel) minLabel.textContent = formatMXN(state.filters.precioMin);
  }
  if (maxInput && state.filters.precioMax !== null) {
    maxInput.value = state.filters.precioMax;
    if (maxLabel) maxLabel.textContent = formatMXN(state.filters.precioMax);
  }
}

function syncChipsFromState() {
  const marcaContainer = document.getElementById('filter-marcas');
  const tallaContainer = document.getElementById('filter-tallas');
  if (marcaContainer && state.filters.marcas.length) {
    updateChips(marcaContainer, '.chip-marca', 'data-marca', state.filters.marcas);
  }
  if (tallaContainer && state.filters.tallas.length) {
    updateChips(tallaContainer, '.chip-talla', 'data-talla', state.filters.tallas.map(String));
  }
}

// ─── URL sync ─────────────────────────────────────────────────────────────────

function syncToUrl() {
  const params = new URLSearchParams();
  const { marcas, tallas, precioMin, precioMax } = state.filters;
  const meta = state.meta;

  if (marcas.length) params.set('marca', marcas.join(','));
  if (tallas.length) params.set('talla', tallas.join(','));
  if (meta && precioMin !== meta.precio_min) params.set('pmin', precioMin);
  if (meta && precioMax !== meta.precio_max) params.set('pmax', precioMax);

  const url = params.toString() ? `${location.pathname}?${params}` : location.pathname;
  history.replaceState({}, '', url);
}

function syncFromUrl() {
  const params = new URLSearchParams(location.search);
  if (params.has('marca')) state.filters.marcas = params.get('marca').split(',');
  if (params.has('talla')) state.filters.tallas = params.get('talla').split(',').map(parseFloat);
  if (params.has('pmin')) state.filters.precioMin = parseFloat(params.get('pmin'));
  if (params.has('pmax')) state.filters.precioMax = parseFloat(params.get('pmax'));
}
