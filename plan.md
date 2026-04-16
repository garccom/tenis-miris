# PLAN DE EJECUCIÓN — Tenis Miri (Catálogo Web)

## Resumen arquitectónico

```
┌─────────────────────────────────────────────────────────────┐
│  ADMIN (tú)                                                 │
│  Edita Google Sheet desde navegador o app móvil             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  GOOGLE SHEET (privado)                                     │
│  Source of truth. Estados: disponible / vendido / oculto    │
└──────────────────────┬──────────────────────────────────────┘
                       │ Service Account (OAuth2)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  NETLIFY FUNCTION  /.netlify/functions/products             │
│  • Lee Sheet con credenciales privadas                      │
│  • Filtra estado=disponible                                 │
│  • Elimina notas_internas                                   │
│  • Agrupa variantes por `codigo`                            │
│  • Cache 15 min (Netlify Edge Cache)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │ JSON limpio
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (Netlify static hosting)                          │
│  HTML + Tailwind + JS vanilla                               │
│  Cloudinary para imágenes (lazy + WebP + responsive)        │
└─────────────────────────────────────────────────────────────┘
```

---

## FASE 0 — Prerequisitos (cuentas y accesos)

**Orden exacto:**

1. **Cuenta Google** activa (para Sheet y Google Cloud Console)
2. **Cuenta Cloudinary** (plan gratis ≤ 25GB es suficiente para 200 × 4 imágenes)
3. **Cuenta Netlify** conectada a tu GitHub
4. **Repo Git local** inicializado en `/Users/carlosgarcia/Documents/Carlos Docs/Tenis/tenis-miri/`
5. **Node.js 20+** instalado (verifica: `node -v`)
6. **Netlify CLI** instalado globalmente (`npm i -g netlify-cli`)

**Verificación antes de avanzar**: las 4 cuentas responden + Node corre.

---

## FASE 1 — Google Sheet (estructura exacta)

**Nombre del Sheet**: `tenis-miri-catalogo`

**Hoja única**: `Productos`

**Columnas (fila 1 = headers, exactamente en este orden):**

| Col | Nombre | Tipo | Ejemplo | Obligatorio |
|-----|--------|------|---------|-------------|
| A | `id` | string | `TM-001` | ✅ único por fila |
| B | `codigo` | string | `NIKE-DUNK-PANDA` | ✅ clave de agrupación |
| C | `nombre` | string | `Nike Dunk Low Panda` | ✅ |
| D | `marca` | string | `Nike` | ✅ |
| E | `modelo` | string | `Dunk Low` | ✅ |
| F | `talla` | number | `8.5` | ✅ |
| G | `precio` | number | `2499` | ✅ MXN sin signo ni comas |
| H | `color` | string | `Blanco/Negro` | ✅ |
| I | `estado` | enum | `disponible` / `vendido` / `oculto` | ✅ |
| J | `descripcion` | string | `Silueta icónica...` | opcional |
| K | `notas_internas` | string | `Comprado en $1800` | NUNCA se expone |
| L | `imagen_1` | string | `tenis-miri/nike-dunk-panda-01` | ✅ Cloudinary public_id |
| M | `imagen_2` | string | `tenis-miri/nike-dunk-panda-02` | opcional |
| N | `imagen_3` | string | `tenis-miri/nike-dunk-panda-03` | opcional |
| O | `imagen_4` | string | `tenis-miri/nike-dunk-panda-04` | opcional |
| P | `fecha_entrada` | date | `2026-04-10` (YYYY-MM-DD) | ✅ |

**Reglas:**
- Filas con el **mismo `codigo`** son variantes de talla del mismo modelo (comparten imágenes, descripción, marca, modelo, color)
- Solo filas con `estado = disponible` se muestran en el frontend
- `notas_internas` se elimina en la Netlify Function, nunca llega al frontend

**Validaciones a configurar en el Sheet (Data > Validación):**
- Columna `estado`: dropdown con 3 valores
- Columna `talla`: número positivo
- Columna `precio`: número positivo
- Columna `fecha_entrada`: formato fecha

---

## FASE 2 — Google Cloud & Service Account

**Pasos exactos:**

1. Ir a `console.cloud.google.com` → crear proyecto `tenis-miri`
2. **APIs & Services → Library**: habilitar `Google Sheets API`
3. **IAM & Admin → Service Accounts**: crear cuenta `tenis-miri-reader`
4. En la cuenta → **Keys** → **Add Key** → **JSON** → descargar archivo
5. Abrir el JSON descargado, copiar el `client_email` (algo como `tenis-miri-reader@tenis-miri.iam.gserviceaccount.com`)
6. En el Google Sheet: **Compartir** → pegar ese email con permiso **Viewer**
7. Guardar el JSON en **local, fuera del repo** (lo usaremos como variable de entorno)

**Variables de entorno que guardaremos en Netlify (panel web, no en repo):**

```
GOOGLE_SHEET_ID=<id del sheet, extraído de la URL>
GOOGLE_SERVICE_ACCOUNT_EMAIL=<client_email del JSON>
GOOGLE_SERVICE_ACCOUNT_KEY=<private_key del JSON, una sola línea con \n>
WHATSAPP_NUMBER=3317042020
CACHE_TTL_SECONDS=900
```

---

## FASE 3 — Cloudinary (organización de imágenes)

**Convención de subida:**

- **Folder raíz**: `tenis-miri`
- **public_id por imagen**: `tenis-miri/<codigo>-<num>` (ej: `tenis-miri/NIKE-DUNK-PANDA-01`)
- **Formato de upload**: JPEG o PNG originales; Cloudinary convierte a WebP/AVIF en delivery
- **Transformaciones que usaremos desde el frontend** (URL dinámicas, NO se guardan):

| Uso | Transformación |
|-----|----------------|
| Thumbnail grid (card) | `w_400,c_fill,ar_1:1,f_auto,q_auto` |
| Detalle (desktop) | `w_1200,f_auto,q_auto` |
| Detalle (móvil) | `w_800,f_auto,q_auto` |
| Preview LQIP | `w_20,e_blur:200,f_auto,q_auto` |

En el Sheet **solo guardas `public_id`**, el frontend arma las URLs.

---

## FASE 4 — Estructura de carpetas del proyecto

```
tenis-miri/
├── public/
│   ├── index.html              # Grid + filtros
│   ├── producto.html           # Vista detalle (routing por ?codigo=X)
│   ├── favicon.ico
│   ├── og-image.jpg            # 1200x630 para link preview
│   └── robots.txt              # Disallow all (no SEO público)
├── src/
│   ├── css/
│   │   ├── input.css           # @tailwind directives
│   │   └── output.css          # Generado (en .gitignore)
│   └── js/
│       ├── main.js             # Entry punto, bootstrapping
│       ├── api.js              # fetch('/.netlify/functions/products')
│       ├── state.js            # Store simple (productos, filtros activos)
│       ├── grid.js             # Render del grid + skeleton
│       ├── card.js             # Componente card (plantilla string)
│       ├── filters.js          # UI + lógica de filtros (marca/talla/precio)
│       ├── search.js           # Búsqueda (debounced)
│       ├── detail.js           # Vista detalle + selector talla
│       ├── whatsapp.js         # Construcción del link wa.me
│       ├── cloudinary.js       # Helper para URLs con transforms
│       └── utils.js            # formatMXN, debounce, etc.
├── netlify/
│   └── functions/
│       └── products.js         # Service Account → Sheet → JSON limpio
├── tailwind.config.js
├── postcss.config.js
├── netlify.toml                # Build + redirects + cache headers
├── package.json
├── .env.example                # Documenta vars (sin valores)
├── .gitignore                  # node_modules, src/css/output.css, .env
└── README.md                   # Instrucciones de setup local
```

**package.json dependencias principales:**
- Dev: `tailwindcss`, `@netlify/functions`, `netlify-cli`
- Prod (en Function): `google-auth-library`, `googleapis`

---

## FASE 5 — Netlify Function (backend proxy)

**Archivo**: `netlify/functions/products.js`

**Responsabilidades (en orden):**

1. Autenticar con Google vía Service Account (JWT)
2. Leer rango `Productos!A2:P` del Sheet
3. Parsear filas a objetos
4. **Filtrar**: solo `estado === 'disponible'`
5. **Eliminar campo**: `notas_internas` nunca sale
6. **Agrupar por `codigo`**:
   - Campos compartidos (nombre, marca, modelo, color, precio, descripcion, imágenes): se toman del primero
   - `tallas`: array único ordenado ascendente
   - `ids_por_talla`: mapa `{ talla → id }` para trackear la variante exacta
7. Ordenar por `fecha_entrada` descendente (lo más nuevo primero)
8. Devolver con headers de cache

**Estructura del JSON de respuesta:**

```json
{
  "products": [
    {
      "codigo": "NIKE-DUNK-PANDA",
      "nombre": "Nike Dunk Low Panda",
      "marca": "Nike",
      "modelo": "Dunk Low",
      "color": "Blanco/Negro",
      "precio": 2499,
      "descripcion": "Silueta icónica...",
      "imagenes": ["tenis-miri/NIKE-DUNK-PANDA-01", "..."],
      "tallas": [7, 7.5, 8, 8.5, 9],
      "ids_por_talla": { "7": "TM-001", "7.5": "TM-002" },
      "fecha_entrada": "2026-04-10"
    }
  ],
  "meta": {
    "total_modelos": 87,
    "total_variantes": 213,
    "marcas": ["Nike", "Adidas", "New Balance"],
    "tallas_disponibles": [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 11],
    "precio_min": 890,
    "precio_max": 4500,
    "whatsapp_number": "3317042020",
    "updated_at": "2026-04-16T14:30:00Z"
  }
}
```

**Headers de respuesta:**
```
Cache-Control: public, max-age=0, s-maxage=900, stale-while-revalidate=86400
Netlify-CDN-Cache-Control: public, s-maxage=900
```

Esto significa: browsers no cachean, pero la CDN de Netlify cachea 15 min y sirve stale por 24h mientras regenera.

**Endpoint secundario opcional** (para forzar refresh):
`/.netlify/functions/products?refresh=<secret>` — limpia cache. Secret en env var.

---

## FASE 6 — Diseño UX (Design System)

**Perfil del proyecto:**
- Product type: E-commerce catalog (sin checkout)
- Style keywords: minimalism, Nike-style, product-first, content-first, high-performance
- Target: C-end Mexican consumers, mobile-first
- Stack: HTML + Tailwind + vanilla JS

### Estilo

**Minimalismo** (como Nike/SSENSE/End Clothing):
- Zero decoración innecesaria
- Producto = protagonista absoluto
- Tipografía como jerarquía (no colores)

### Paleta (monocromática + acento único)

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `bg-primary` | `#ffffff` | `#0a0a0a` | fondo app |
| `bg-surface` | `#f5f5f5` | `#171717` | fondo card |
| `text-primary` | `#0a0a0a` | `#fafafa` | títulos, precio |
| `text-secondary` | `#525252` | `#a3a3a3` | meta, descripción |
| `text-tertiary` | `#a3a3a3` | `#525252` | placeholders |
| `border` | `#e5e5e5` | `#262626` | separadores |
| `accent` | `#25D366` | `#25D366` | botón WhatsApp únicamente |
| `status-unavailable` | `#d4d4d4` | `#404040` | talla agotada |

Respeta `prefers-color-scheme` del sistema.

### Tipografía

- **Display/Headings**: `Inter` peso 700/800 (Google Fonts, `display: swap`)
- **Body**: `Inter` peso 400/500
- **Números**: `Inter` con `font-variant-numeric: tabular-nums`

Escala (mobile / desktop):
- H1 (hero): 32px / 48px, bold
- H2 (nombre producto detalle): 24px / 32px
- Card título: 14px / 14px, medium
- Card precio: 16px / 18px, bold
- Body: 15px / 16px
- Meta/chips: 13px / 13px

### Espaciado y radios

- **Espaciado**: ritmo 4/8 (`4, 8, 12, 16, 24, 32, 48, 64`)
- **Border radius**: 0 en cards (estilo crudo Nike), 8px en chips y botones

### Layout — Home (grid)

**Mobile (≤ 640px):**
- Header sticky: logo text "TENIS MIRI" + ícono búsqueda (abre overlay)
- Chips de filtros rápidos horizontales scrollables
- Botón flotante "Filtros" abajo-derecha → abre **bottom sheet**
- Grid: **2 columnas** (`gap-1` para look editorial tipo Nike)
- Card: imagen 1:1 full-bleed + debajo: nombre (truncado 1 línea), precio bold

**Tablet (641-1024px):**
- Grid: 3 columnas
- Filtros: barra horizontal superior (chips + precio slider)

**Desktop (≥ 1025px):**
- Grid: 4 columnas, `max-w-7xl` centrado
- Filtros: chips superiores (más simple, menos JS)
- Búsqueda inline en header

### Card (componente)

```
┌──────────────────┐
│                  │
│   [imagen 1:1]   │   ← Cloudinary, lazy, LQIP blur placeholder
│                  │
├──────────────────┤
│  Nombre producto │   ← text-sm, text-secondary, 1 línea truncada
│  $2,499          │   ← text-base font-bold text-primary
└──────────────────┘
```

**Interacciones:**
- Hover (desktop): scale imagen 1.03 en 200ms ease-out
- Press (mobile): scale card 0.98 en 100ms
- Tap → navega a `producto.html?codigo=<codigo>`

### Vista detalle

**Mobile:**
```
┌──────────────────────────┐
│ ← volver                 │  ← sticky top
├──────────────────────────┤
│                          │
│  [Carrusel swipeable]    │  ← 1:1, dots indicadores
│                          │
├──────────────────────────┤
│ Nike                     │  ← marca, text-secondary text-sm
│ Dunk Low Panda           │  ← nombre, text-2xl font-bold
│ $2,499                   │  ← text-xl font-bold
├──────────────────────────┤
│ Selecciona tu talla      │
│ [7] [7.5] [8] [8.5̶] [9]  │  ← chips clickables, 8.5 tachada si agotada
├──────────────────────────┤
│ Descripción              │
│ Silueta icónica...       │
├──────────────────────────┤
│                          │
│  (espacio para CTA fijo) │
└──────────────────────────┘
│ [  Consultar WhatsApp  ] │  ← fixed bottom, deshabilitado hasta seleccionar talla
└──────────────────────────┘
```

**Desktop**: 2 columnas (60/40). Izq: galería (imagen principal + thumbnails). Der: info + selector talla + CTA (inline, no fijo).

**Selector de talla:**
- Chip 44×44 mínimo (touch target)
- Estados: `default`, `selected` (fondo negro, texto blanco), `unavailable` (tachado, text-tertiary, no clickable)
- Al seleccionar: se activa CTA, se llena mensaje WhatsApp con esa talla

**CTA WhatsApp:**
- Texto: `"Consultar por WhatsApp"`
- Ícono de WhatsApp a la izquierda (SVG, NO emoji)
- Color accent `#25D366` solo aquí
- Disabled hasta que haya talla seleccionada: opacity 0.4, cursor not-allowed, texto cambia a `"Selecciona una talla"`
- Min height 48px

### Microinteracciones (respetan `prefers-reduced-motion`)

| Evento | Animación | Duración |
|--------|-----------|----------|
| Entrada de card en viewport | Fade-in + slide-up 8px | 240ms ease-out, stagger 30ms |
| Tap sobre card | Scale 0.98 | 100ms |
| Abrir bottom sheet filtros | Slide up desde bottom | 300ms ease-out |
| Cambio de talla | Border color transition | 150ms |
| CTA habilitado (al seleccionar talla) | Fade background 0.4 → 1 | 200ms |
| Imagen cargada | Crossfade desde LQIP blur | 300ms |

### Checklist pre-entrega UX

- [ ] Contraste 4.5:1 en todos los text pairs (verificar texto secundario sobre bg-surface)
- [ ] Touch targets ≥ 44×44 en todos los chips/botones/cards
- [ ] Sin emoji como íconos (SVG de Lucide o Heroicons)
- [ ] `prefers-reduced-motion` respetado
- [ ] Focus rings visibles en navegación teclado
- [ ] Imágenes con `alt` descriptivo + `width`/`height` declarados
- [ ] Dark mode testeado independientemente

---

## FASE 7 — Lógica de filtros y búsqueda

### Filtros disponibles

1. **Marca** (multi-select chips): derivada de `meta.marcas`
2. **Talla** (multi-select chips): derivada de `meta.tallas_disponibles`
3. **Precio** (range slider): min/max de `meta.precio_min/max`

**Combinables**: todos se aplican con AND lógico.

### Búsqueda

- Input único en header
- Debounce 200ms
- Busca en: `nombre`, `marca`, `modelo`, `color`, `codigo` (case-insensitive, sin acentos)
- Filtros + búsqueda compatibles (también AND)

### Lógica (pseudocódigo)

```
filtrar(productos, filtros, query):
  resultado = productos
  si filtros.marca.length > 0:
    resultado = resultado.filter(p => filtros.marca.includes(p.marca))
  si filtros.tallas.length > 0:
    resultado = resultado.filter(p => p.tallas.some(t => filtros.tallas.includes(t)))
  si filtros.precio:
    resultado = resultado.filter(p => p.precio >= filtros.precio.min && p.precio <= filtros.precio.max)
  si query:
    qn = normalize(query)
    resultado = resultado.filter(p => normalize(`${p.nombre} ${p.marca} ${p.modelo} ${p.color} ${p.codigo}`).includes(qn))
  return resultado
```

**Normalización**: `lowercase + normalize('NFD').replace(/[\u0300-\u036f]/g, '')` para quitar acentos.

**URL sync**: filtros y búsqueda se reflejan en query string (ej: `?marca=Nike&talla=8.5&q=dunk`) para compartir resultados filtrados.

---

## FASE 8 — Agrupación de variantes (detalle técnico)

**Input**: ~213 filas en el Sheet (filtradas por `estado = disponible`)

**Algoritmo (en la Netlify Function):**

```
groups = {}
for row in rows:
  if row.estado != 'disponible': skip

  if row.codigo not in groups:
    groups[row.codigo] = {
      codigo, nombre, marca, modelo, color, precio, descripcion,
      imagenes: [row.imagen_1, row.imagen_2, row.imagen_3, row.imagen_4].filter(x => x),
      tallas: [],
      ids_por_talla: {},
      fecha_entrada: row.fecha_entrada
    }

  groups[row.codigo].tallas.push(row.talla)
  groups[row.codigo].ids_por_talla[row.talla] = row.id

  if row.fecha_entrada > groups[row.codigo].fecha_entrada:
    groups[row.codigo].fecha_entrada = row.fecha_entrada

for group in groups:
  group.tallas = unique(group.tallas).sort(ascending)

return values(groups).sort(by fecha_entrada desc)
```

**Resultado esperado**: ~87 modelos (de 213 variantes).

---

## FASE 9 — Flujo WhatsApp

**En frontend (`whatsapp.js`):**

1. Usuario abre detalle de un producto
2. Selecciona talla → se guarda en state local `selectedSize`
3. CTA se habilita
4. Al tap, construye URL:

```
https://wa.me/52{NUMERO}?text={mensajeURLEncoded}
```

**El número `52{NUMERO}`** viene de `meta.whatsapp_number` que la Netlify Function lee de env var. NO hardcoded en repo.

**Mensaje (template):**

```
Hola, me interesa este tenis:

*{nombre}*
Modelo: {modelo}
Talla: {talla_seleccionada}
Precio: ${precio} MXN

{URL_imagen_principal}

¿Sigue disponible?
```

- `URL_imagen_principal`: URL pública de Cloudinary con transform `w_800,f_auto,q_auto` (preview bonito al compartir en WhatsApp)
- Todo encodeado con `encodeURIComponent`

**Abrir en:**
- Móvil: `window.location.href = url` (app de WhatsApp nativa)
- Desktop: `window.open(url, '_blank')` (web.whatsapp.com)

---

## FASE 10 — Estrategia de performance

### Críticas (no negociables)

1. **Imágenes Cloudinary:**
   - `f_auto` → WebP/AVIF automático según browser
   - `q_auto` → calidad adaptativa
   - `loading="lazy"` en todas excepto las primeras 4 visibles (eager)
   - `width`/`height` declarados (evita CLS)
   - LQIP: `<img src="blur_url" data-src="full_url">` con IntersectionObserver para swap

2. **JS:**
   - Sin frameworks, solo vanilla
   - Total bundle objetivo: **< 20 KB gzipped**
   - Sin polyfills (browsers modernos solamente — declarar en README)
   - Event delegation para grid (un solo listener en el contenedor)

3. **CSS:**
   - Tailwind JIT + purge: solo clases usadas
   - CSS final objetivo: **< 15 KB gzipped**
   - Fonts: `font-display: swap` + preload de `Inter` 400 y 700 solamente

4. **HTML:**
   - Crítico inline si pesa poco
   - Preconnect a `res.cloudinary.com`
   - Preconnect a `fonts.gstatic.com`

5. **Netlify Function:**
   - Cache CDN 15 min (configurado con headers)
   - Reduce invocaciones: 1 request / 15 min por región
   - Function time objetivo: < 800ms cold, < 100ms warm

### Lighthouse targets

| Métrica | Target |
|---------|--------|
| Performance | ≥ 95 mobile |
| LCP | < 1.8s |
| CLS | < 0.05 |
| INP | < 200ms |
| Total JS | < 20 KB gzip |
| Total CSS | < 15 KB gzip |

---

## FASE 11 — Deploy en Netlify

**Pasos exactos:**

1. `git init` + primer commit (con `.gitignore` correcto: `node_modules`, `src/css/output.css`, `.env`, JSON de service account)
2. Push a repo GitHub `tenis-miri`
3. En Netlify: **Add new site → Import from Git** → selecciona el repo
4. **Build settings** (autodetecta del `netlify.toml`):
   ```
   Build command: npm run build
   Publish directory: public
   Functions directory: netlify/functions
   ```
5. **Environment variables**: copiar las 5 variables de Fase 2 al panel de Netlify
6. **Deploy** → revisar logs
7. **Custom subdomain Netlify**: `tenis-miri.netlify.app` (en Site settings → Domain management)
8. **Configurar robots**: `public/robots.txt` con `Disallow: /` (no queremos SEO público)
9. **Test de producción:**
   - Abrir `https://tenis-miri.netlify.app`
   - Verificar que el grid carga
   - Verificar filtros y búsqueda
   - Seleccionar talla → CTA abre WhatsApp con mensaje correcto
   - Lighthouse ≥ 95 en mobile

### `netlify.toml` (estructura)

```toml
[build]
  command = "npm run build"
  publish = "public"
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "DENY"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/src/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[redirects]]
  from = "/api/products"
  to = "/.netlify/functions/products"
  status = 200
```

---

## FASE 12 — Verificación final

**Checklist técnico:**

- [ ] Function responde con JSON limpio (sin `notas_internas`)
- [ ] Sheet privado — intentar acceder al JSON sin auth debe fallar
- [ ] Cache funciona: segunda request < 100ms
- [ ] 200 productos cargan sin lag
- [ ] Filtros combinables dan resultado correcto
- [ ] Búsqueda sin acentos funciona (`panda` = `Panda`)
- [ ] URL sync de filtros (compartir link mantiene filtros)
- [ ] Talla agotada: se muestra tachada, no clickable
- [ ] CTA WhatsApp deshabilitado sin talla seleccionada
- [ ] Mensaje WhatsApp incluye: nombre, modelo, talla, precio, URL imagen
- [ ] Número de WhatsApp viene de env var, no hardcoded
- [ ] `robots.txt` bloquea indexación

**Checklist UX:**

- [ ] Lighthouse Performance ≥ 95 mobile
- [ ] Lighthouse Accessibility = 100
- [ ] Test en iPhone SE (375px) y Pixel 7
- [ ] Test en landscape
- [ ] Test con `prefers-reduced-motion`
- [ ] Test con Dynamic Type (iOS) / tamaño texto grande (Android)
- [ ] Dark mode validado independientemente del claro

---

## Orden de ejecución recomendado

```
1. Fase 0 (cuentas)                        ───  30 min
2. Fase 1 (Sheet)                          ───  45 min
3. Fase 2 (Service Account)                ───  30 min
4. Fase 3 (Cloudinary setup)               ───  20 min
5. Fase 4 (estructura proyecto + Tailwind) ───  45 min
6. Fase 5 (Netlify Function + JSON)        ───  2 hrs
7. Fase 11 (deploy inicial mock)           ───  30 min  ← deploy temprano
8. Fase 6 (diseño + tokens Tailwind)       ───  1.5 hrs
9. Fase 7 + 8 (frontend grid + filtros)    ───  3 hrs
10. Fase 9 (detalle + WhatsApp)            ───  2 hrs
11. Fase 10 (performance pass)             ───  1 hr
12. Fase 12 (verificación)                 ───  1 hr
```

**Total estimado**: ~13 horas de trabajo neto.
