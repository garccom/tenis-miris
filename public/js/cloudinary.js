const CLOUD_NAME = 'dzbbdc4vy';
const BASE = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload`;

function url(publicId, transform) {
  return `${BASE}/${transform}/${publicId}`;
}

export function thumbUrl(publicId) {
  return url(publicId, 'w_600,c_pad,ar_1:1,b_f5f5f5,f_auto,q_auto');
}

export function thumbBlurUrl(publicId) {
  return url(publicId, 'w_20,e_blur:200,f_auto,q_1');
}

export function detailUrl(publicId, mobile = true) {
  return url(publicId, mobile ? 'w_800,f_auto,q_auto' : 'w_1200,f_auto,q_auto');
}

export function whatsappImageUrl(publicId) {
  return url(publicId, 'w_800,f_auto,q_auto');
}
