import { renderCard } from './card.js';

const gridEl = () => document.getElementById('grid');
const emptyEl = () => document.getElementById('empty-state');
const countEl = () => document.getElementById('results-count');
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function renderSkeleton(count = 8) {
  const el = gridEl();
  if (!el) return;
  el.innerHTML = Array.from({ length: count }, () => `
    <div class="animate-pulse">
      <div class="aspect-square bg-[#e5e5e5] dark:bg-[#262626]"></div>
      <div class="pt-2 space-y-2">
        <div class="h-3 bg-[#e5e5e5] dark:bg-[#262626] rounded w-3/4"></div>
        <div class="h-4 bg-[#e5e5e5] dark:bg-[#262626] rounded w-1/3"></div>
      </div>
    </div>`).join('');
}

export function renderGrid(products) {
  const el = gridEl();
  const empty = emptyEl();
  const count = countEl();

  if (!el) return;

  if (count) count.textContent = `${products.length} ${products.length === 1 ? 'modelo' : 'modelos'}`;

  if (products.length === 0) {
    el.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }

  empty?.classList.add('hidden');
  el.innerHTML = products.map(renderCard).join('');

  setupLazyImages(el);
  if (!reducedMotion()) animateCards(el);
}

function setupLazyImages(container) {
  const imgs = container.querySelectorAll('img.img-lazy');
  if (!('IntersectionObserver' in window)) {
    imgs.forEach(img => { if (img.dataset.src) img.src = img.dataset.src; });
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const img = entry.target;
      if (!img.dataset.src) return;

      const loader = new Image();
      loader.onload = () => {
        img.src = img.dataset.src;
        img.style.opacity = '1';
      };
      loader.src = img.dataset.src;
      observer.unobserve(img);
    });
  }, { rootMargin: '300px' });

  imgs.forEach(img => {
    img.style.opacity = '0.5';
    img.style.transition = 'opacity 300ms';
    observer.observe(img);
  });
}

function animateCards(container) {
  const cards = container.querySelectorAll('article');
  cards.forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(8px)';
    card.style.transition = `opacity 240ms ease-out ${Math.min(i * 30, 300)}ms, transform 240ms ease-out ${Math.min(i * 30, 300)}ms`;

    requestAnimationFrame(() => requestAnimationFrame(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }));
  });
}
