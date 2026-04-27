import { fetchProducts } from './api.js';
import { detailUrl, thumbUrl } from './cloudinary.js';
import { formatMXN } from './utils.js';
import { openWhatsApp } from './whatsapp.js';
import { initTheme, toggleTheme, onThemeChange } from './theme.js';

let product = null;
let selectedTalla = null;
let whatsappNumber = null;
let currentImgIdx = 0;

async function init() {
  const codigo = new URLSearchParams(location.search).get('codigo');
  if (!codigo) { location.href = '/'; return; }

  try {
    showSkeleton(true);
    const data = await fetchProducts();
    whatsappNumber = data.meta.whatsapp_number;
    product = data.products.find(p => p.codigo === codigo);

    if (!product) { showError(); return; }

    document.title = `${product.nombre} — Tenis Miri`;
    renderDetail();
    showSkeleton(false);
  } catch {
    showError();
  }
}

function renderDetail() {
  // Text
  setText('detail-marca', product.marca);
  setText('detail-nombre', product.nombre);
  renderPrice();
  setText('detail-descripcion', product.descripcion);
  if (!product.descripcion) document.getElementById('detail-descripcion-section')?.classList.add('hidden');

  renderGallery();
  renderSizeChips();
  updateCTA();
}

function renderPrice() {
  const el = document.getElementById('detail-precio');
  if (!el) return;

  const isOnSale = product.precio_real && product.precio_real > product.precio;

  if (isOnSale) {
    const pct = Math.round((1 - product.precio / product.precio_real) * 100);
    el.innerHTML = `
      <div class="space-y-1.5">
        <div class="flex items-center gap-3">
          <span class="text-2xl md:text-3xl font-bold font-tabular text-[#0a0a0a] dark:text-[#fafafa]">${formatMXN(product.precio)}</span>
          <span class="inline-flex items-center text-xs font-semibold bg-[#e05656] text-white rounded-full px-2.5 py-1 tracking-wide">−${pct}%</span>
        </div>
        <p class="text-sm font-tabular text-[#a3a3a3] dark:text-[#525252]">
          Antes: <span class="line-through">${formatMXN(product.precio_real)}</span>
        </p>
      </div>`;
  } else {
    el.innerHTML = `<span class="text-2xl md:text-3xl font-bold font-tabular text-[#0a0a0a] dark:text-[#fafafa]">${formatMXN(product.precio)}</span>`;
  }
}

function renderGallery() {
  const imgs = product.imagenes;
  const mainImg = document.getElementById('gallery-main');
  const dotsEl = document.getElementById('gallery-dots');
  const thumbsEl = document.getElementById('gallery-thumbs');

  if (!imgs.length) return;

  const show = idx => {
    currentImgIdx = idx;
    if (mainImg) {
      mainImg.src = detailUrl(imgs[idx], document.documentElement.classList.contains('dark'), window.innerWidth < 768);
      mainImg.alt = product.nombre;
    }
    // Dots
    document.querySelectorAll('.g-dot').forEach((d, i) => {
      d.classList.toggle('bg-[#0a0a0a]', i === idx);
      d.classList.toggle('dark:bg-[#fafafa]', i === idx);
      d.classList.toggle('bg-[#d4d4d4]', i !== idx);
      d.classList.toggle('dark:bg-[#404040]', i !== idx);
    });
    // Thumbs
    document.querySelectorAll('.g-thumb').forEach((t, i) => {
      t.classList.toggle('opacity-100', i === idx);
      t.classList.toggle('ring-1', i === idx);
      t.classList.toggle('ring-[#0a0a0a]', i === idx);
      t.classList.toggle('dark:ring-[#fafafa]', i === idx);
      t.classList.toggle('opacity-40', i !== idx);
    });
  };

  show(0);

  // Dots (mobile)
  if (dotsEl && imgs.length > 1) {
    dotsEl.innerHTML = imgs.map((_, i) => `
      <button class="g-dot w-2 h-2 rounded-full transition-colors duration-150 ${i === 0 ? 'bg-[#0a0a0a] dark:bg-[#fafafa]' : 'bg-[#d4d4d4] dark:bg-[#404040]'}" data-i="${i}" aria-label="Imagen ${i + 1}"></button>
    `).join('');
    dotsEl.addEventListener('click', e => {
      const btn = e.target.closest('.g-dot');
      if (btn) show(+btn.dataset.i);
    });
  }

  // Thumbnails (desktop)
  if (thumbsEl && imgs.length > 1) {
    const isDark = document.documentElement.classList.contains('dark');
    thumbsEl.innerHTML = imgs.map((img, i) => `
      <button class="g-thumb ${i === 0 ? 'opacity-100 ring-1 ring-[#0a0a0a] dark:ring-[#fafafa]' : 'opacity-40'} transition-all duration-150 overflow-hidden" data-i="${i}">
        <img src="${thumbUrl(img, isDark)}" alt="Vista ${i + 1}" class="w-full aspect-square object-cover" />
      </button>
    `).join('');
    thumbsEl.addEventListener('click', e => {
      const btn = e.target.closest('.g-thumb');
      if (btn) show(+btn.dataset.i);
    });
  }

  // Swipe (mobile)
  let startX = 0;
  mainImg?.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  mainImg?.addEventListener('touchend', e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 50) return;
    if (diff > 0 && currentImgIdx < imgs.length - 1) show(currentImgIdx + 1);
    else if (diff < 0 && currentImgIdx > 0) show(currentImgIdx - 1);
  }, { passive: true });
}

function renderSizeChips() {
  const container = document.getElementById('size-chips');
  if (!container) return;

  container.innerHTML = product.tallas.map(t => `
    <button
      class="chip-size w-14 h-14 text-sm font-medium border border-[#e5e5e5] dark:border-[#262626] rounded transition-all duration-150"
      data-talla="${t}"
      aria-label="Talla ${t}"
    >${t}</button>
  `).join('');

  container.addEventListener('click', e => {
    const btn = e.target.closest('.chip-size');
    if (!btn) return;

    selectedTalla = parseFloat(btn.dataset.talla);

    container.querySelectorAll('.chip-size').forEach(b => {
      const active = parseFloat(b.dataset.talla) === selectedTalla;
      b.classList.toggle('bg-[#0a0a0a]', active);
      b.classList.toggle('dark:bg-[#fafafa]', active);
      b.classList.toggle('text-white', active);
      b.classList.toggle('dark:text-[#0a0a0a]', active);
      b.classList.toggle('border-[#0a0a0a]', active);
      b.classList.toggle('dark:border-[#fafafa]', active);
    });

    updateCTA();
  });

  // Auto-select when only one size is available
  if (product.tallas.length === 1) {
    container.querySelector('.chip-size')?.click();
  }
}

function updateCTA() {
  const ready = selectedTalla !== null;
  const label = ready ? 'Consultar por WhatsApp' : 'Selecciona una talla';

  document.querySelectorAll('.btn-whatsapp').forEach(btn => {
    btn.disabled = !ready;
    btn.classList.toggle('opacity-40', !ready);
    btn.classList.toggle('cursor-not-allowed', !ready);
    btn.classList.toggle('cursor-pointer', ready);
    btn.style.transition = 'opacity 200ms';
  });

  document.querySelectorAll('.btn-whatsapp-text').forEach(txt => {
    txt.textContent = label;
  });
}

function showSkeleton(show) {
  document.getElementById('detail-skeleton')?.classList.toggle('hidden', !show);
  document.getElementById('detail-content')?.classList.toggle('hidden', show);
}

function showError() {
  showSkeleton(false);
  document.getElementById('detail-error')?.classList.remove('hidden');
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || '';
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  document.getElementById('btn-theme')?.addEventListener('click', toggleTheme);

  // Re-render current gallery image so Cloudinary bg color matches theme
  onThemeChange(() => {
    if (product) {
      const imgs = product.imagenes;
      const mainImg = document.getElementById('gallery-main');
      if (mainImg && imgs.length) {
        mainImg.src = detailUrl(imgs[currentImgIdx], document.documentElement.classList.contains('dark'), window.innerWidth < 768);
      }
      // Update thumbnails
      document.querySelectorAll('.g-thumb img').forEach((img, i) => {
        if (imgs[i]) img.src = thumbUrl(imgs[i], document.documentElement.classList.contains('dark'));
      });
    }
  });

  document.querySelectorAll('.btn-whatsapp').forEach(btn => {
    btn.addEventListener('click', () => {
      if (product && selectedTalla !== null) {
        openWhatsApp(product, selectedTalla, whatsappNumber);
      }
    });
  });

  init();
});
