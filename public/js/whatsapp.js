import { whatsappImageUrl } from './cloudinary.js';
import { formatMXN } from './utils.js';

export function openWhatsApp(product, talla, whatsappNumber) {
  const imgUrl = product.imagenes[0] ? whatsappImageUrl(product.imagenes[0]) : '';

  const lines = [
    'Hola, me interesa este tenis:',
    '',
    `*${product.nombre}*`,
    `Modelo: ${product.modelo}`,
    `Talla: ${talla}`,
    `Precio: ${formatMXN(product.precio)} MXN`,
  ];

  if (imgUrl) { lines.push('', imgUrl); }
  lines.push('', '¿Sigue disponible?');

  const url = `https://wa.me/52${whatsappNumber}?text=${encodeURIComponent(lines.join('\n'))}`;

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = url;
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
