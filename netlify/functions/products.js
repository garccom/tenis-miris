import { JWT } from 'google-auth-library';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

const COLS = {
  ID: 0,
  CODIGO: 1,
  NOMBRE: 2,
  MARCA: 3,
  MODELO: 4,
  TALLA: 5,
  PRECIO: 6,
  COLOR: 7,
  ESTADO: 8,
  DESCRIPCION: 9,
  // NOTAS_INTERNAS: 10 — never exposed
  IMAGEN_1: 11,
  IMAGEN_2: 12,
  IMAGEN_3: 13,
  IMAGEN_4: 14,
  FECHA_ENTRADA: 15,
};

async function getAccessToken() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY.replace(/\\n/g, '\n');
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  const client = new JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const { token } = await client.getAccessToken();
  return token;
}

async function getSheetRows(sheetId, accessToken) {
  const range = encodeURIComponent('Productos!A2:P');
  const url = `${SHEETS_API}/${sheetId}/values/${range}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheets API ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.values || [];
}

function parseRows(rows) {
  return rows
    .filter(row => row[COLS.CODIGO] && row[COLS.ESTADO] === 'disponible')
    .map(row => ({
      id: row[COLS.ID] || '',
      codigo: (row[COLS.CODIGO] || '').trim(),
      nombre: row[COLS.NOMBRE] || '',
      marca: row[COLS.MARCA] || '',
      modelo: row[COLS.MODELO] || '',
      talla: parseFloat(row[COLS.TALLA]) || 0,
      precio: parseFloat(row[COLS.PRECIO]) || 0,
      color: row[COLS.COLOR] || '',
      descripcion: row[COLS.DESCRIPCION] || '',
      imagenes: [
        row[COLS.IMAGEN_1],
        row[COLS.IMAGEN_2],
        row[COLS.IMAGEN_3],
        row[COLS.IMAGEN_4],
      ].filter(Boolean),
      fecha_entrada: row[COLS.FECHA_ENTRADA] || '',
    }));
}

function groupByCodigo(rows) {
  const groups = {};

  for (const row of rows) {
    if (!groups[row.codigo]) {
      groups[row.codigo] = {
        codigo: row.codigo,
        nombre: row.nombre,
        marca: row.marca,
        modelo: row.modelo,
        color: row.color,
        precio: row.precio,
        descripcion: row.descripcion,
        imagenes: row.imagenes,
        tallas: [],
        ids_por_talla: {},
        fecha_entrada: row.fecha_entrada,
      };
    }

    const g = groups[row.codigo];

    if (!g.tallas.includes(row.talla)) {
      g.tallas.push(row.talla);
    }

    g.ids_por_talla[row.talla] = row.id;

    if (row.fecha_entrada > g.fecha_entrada) {
      g.fecha_entrada = row.fecha_entrada;
    }
  }

  return Object.values(groups).map(g => ({
    ...g,
    tallas: g.tallas.sort((a, b) => a - b),
  }));
}

function buildMeta(products, rawCount, whatsappNumber) {
  const marcas = [...new Set(products.map(p => p.marca))].sort();
  const tallas = [...new Set(products.flatMap(p => p.tallas))].sort((a, b) => a - b);
  const precios = products.map(p => p.precio).filter(Boolean);

  return {
    total_modelos: products.length,
    total_variantes: rawCount,
    marcas,
    tallas_disponibles: tallas,
    precio_min: precios.length ? Math.min(...precios) : 0,
    precio_max: precios.length ? Math.max(...precios) : 0,
    whatsapp_number: whatsappNumber,
    updated_at: new Date().toISOString(),
  };
}

export const handler = async () => {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const whatsappNumber = process.env.WHATSAPP_NUMBER;

    if (!sheetId || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing environment variables' }),
      };
    }

    const accessToken = await getAccessToken();
    const rows = await getSheetRows(sheetId, accessToken);
    const parsed = parseRows(rows);
    const grouped = groupByCodigo(parsed);
    const products = grouped.sort((a, b) => b.fecha_entrada.localeCompare(a.fecha_entrada));
    const meta = buildMeta(products, parsed.length, whatsappNumber);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=0, s-maxage=900, stale-while-revalidate=86400',
        'Netlify-CDN-Cache-Control': 'public, s-maxage=900',
      },
      body: JSON.stringify({ products, meta }),
    };
  } catch (err) {
    console.error('products function error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Error fetching products', detail: err.message }),
    };
  }
};
