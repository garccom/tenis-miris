import { fetchProducts } from './api.js';
import { detailUrl, thumbUrl } from './cloudinary.js';
import { formatMXN } from './utils.js';
import { openWhatsApp } from './whatsapp.js';

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
  setText('detail-precio', formatMXN(product.precio));
  setText('detail-descripcion', product.descripcion);
  if (!product.descripcion) document.getElementById('detail-descripcion-section')?.classList.add('hidden');

  renderGallery();
  renderSizeChips();
  updateCTA();
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
      mainImg.src = detailUrl(imgs[idx], window.innerWidth < 768);
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
    thumbsEl.innerHTML = imgs.map((img, i) => `
      <button class="g-thumb ${i === 0 ? 'opacity-100 ring-1 ring-[#0a0a0a] dark:ring-[#fafafa]' : 'opacity-40'} transition-all duration-150 overflow-hidden" data-i="${i}">
        <img src="${thumbUrl(img)}" alt="Vista ${i + 1}" class="w-full aspect-square object-cover" />
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
  document.querySelectorAll('.btn-whatsapp').forEach(btn => {
    btn.addEventListener('click', () => {
      if (product && selectedTalla !== null) {
        openWhatsApp(product, selectedTalla, whatsappNumber);
      }
    });
  });

  init();
});
