const CACHE_KEY = 'tm_products_v1';
const CACHE_TTL = 15 * 60 * 1000; // 15 min

export async function fetchProducts() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts < CACHE_TTL) return data;
    }
  } catch (_) {}

  const res = await fetch('/.netlify/functions/products');
  if (!res.ok) throw new Error(`API error ${res.status}`);

  const data = await res.json();

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch (_) {}

  return data;
}

export function clearCache() {
  localStorage.removeItem(CACHE_KEY);
}
