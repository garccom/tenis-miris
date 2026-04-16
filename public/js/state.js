import { normalizeText } from './utils.js';

export const state = {
  allProducts: [],
  meta: null,
  filters: { marcas: [], tallas: [], precioMin: null, precioMax: null },
  query: '',
};

export function applyFilters() {
  const { allProducts, filters, query } = state;
  let result = allProducts;

  if (filters.marcas.length) {
    result = result.filter(p => filters.marcas.includes(p.marca));
  }

  if (filters.tallas.length) {
    result = result.filter(p => p.tallas.some(t => filters.tallas.includes(t)));
  }

  if (filters.precioMin !== null) {
    result = result.filter(p => p.precio >= filters.precioMin);
  }

  if (filters.precioMax !== null) {
    result = result.filter(p => p.precio <= filters.precioMax);
  }

  if (query.trim()) {
    const q = normalizeText(query.trim());
    result = result.filter(p =>
      normalizeText(`${p.nombre} ${p.marca} ${p.modelo} ${p.color} ${p.codigo}`).includes(q)
    );
  }

  return result;
}
