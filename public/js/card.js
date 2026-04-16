import { thumbUrl, thumbBlurUrl } from './cloudinary.js';
import { formatMXN } from './utils.js';

const PLACEHOLDER_SVG = `
  <div class="w-full h-full flex items-center justify-center bg-[#f5f5f5] dark:bg-[#171717]">
    <svg width="40" height="40" fill="none" stroke="#a3a3a3" stroke-width="1.5" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
  </div>`;

export function renderCard(product) {
  const hasImage = product.imagenes.length > 0;
  const thumb = hasImage ? thumbUrl(product.imagenes[0]) : '';
  const blur = hasImage ? thumbBlurUrl(product.imagenes[0]) : '';

  return `
    <article class="group cursor-pointer active:scale-[0.98] transition-transform duration-100" data-codigo="${product.codigo}">
      <div class="relative aspect-square overflow-hidden bg-[#f5f5f5] dark:bg-[#171717]">
        ${hasImage ? `
          <img
            src="${blur}"
            data-src="${thumb}"
            alt="${product.nombre}"
            width="400"
            height="400"
            loading="lazy"
            class="w-full h-full object-cover transition-all duration-300 group-hover:scale-[1.03] img-lazy"
          />
        ` : PLACEHOLDER_SVG}
      </div>
      <div class="pt-2 pb-3">
        <p class="text-[13px] text-[#525252] dark:text-[#a3a3a3] truncate leading-snug">${product.nombre}</p>
        <p class="text-[15px] font-bold text-[#0a0a0a] dark:text-[#fafafa] font-tabular mt-0.5">${formatMXN(product.precio)}</p>
      </div>
    </article>`;
}
