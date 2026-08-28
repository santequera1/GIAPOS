# GIA Gelatería — Brand Kit

Referencia de personalización de la marca **Gia Gelatería** (Cartagena, Colombia).
Pensado para que cualquier software futuro (app, POS, menú digital, campañas, etc.)
lea de aquí la identidad, el catálogo y los assets sin tener que reconstruirlos.

**Fuente de verdad: [`brand.json`](brand.json).** Todo lo demás (CSS, CSV) son
derivados para comodidad; si algo difiere, manda el JSON.

## Estructura

```
gia-brand-kit/
├── brand.json          ← TODO en un solo archivo: negocio, contacto, colores,
│                         tipografía, tamaños/precios, productos, textos, assets
├── colors.css          ← tokens de color como variables CSS (--gia-*)
├── fonts.css           ← @font-face listos para usar
├── productos.csv       ← catálogo de sabores (para hojas de cálculo / no-devs)
├── precios.csv         ← tamaños y precios
├── logo/
│   ├── gia-logo.png              logo horizontal azul (fondo transparente)
│   ├── favicon.ico
│   ├── og-image-1200x630.jpg     imagen para compartir en redes / WhatsApp
│   └── og-image2-alternativa.jpg
├── fonts/              Lapture (8 variantes), Playfair Display (3), Great Vibes
└── images/
    ├── gelatos/        12 sabores en WebP 1024px, fondo transparente, listos para web
    │   └── original/   PNG originales 1024x1536 (alta resolución, fondo transparente)
    ├── marca/          patrón zigzag, cono GIA, póster de ubicación
    └── instagram/      miniaturas de los 5 posts destacados
```

## Identidad en 30 segundos

| Elemento | Valor |
|---|---|
| Nombre | Gia Gelatería (corto: **GIA**) |
| Slogan | Auténtico *Gelato* artesanal — la palabra "Gelato" va en cursiva script |
| Descripción | Gelato artesanal con alma clásica y sabor inolvidable. Entre el cielo y GIA… me quedo aquí. ✨ |
| Fondo | Crema `#FEF3DE` (base exacta del patrón zigzag) |
| Color principal | Azul marino `#364266` (texto/títulos) · `#344268` (botones) |
| Acento | Oliva `#C6BF81` |
| Texto secundario | Café suave `#897863` |
| Tipografía | **Lapture** (cuerpo) · **Playfair Display** (títulos) · **Great Vibes** (acento cursivo) |
| Patrón | Zigzag oliva/crema (`images/marca/pattern-zigzag.jpg`) |
| Moneda | COP sin decimales, miles con punto: `$ 15.000` |

## Reglas de estilo (lo que aprendimos construyendo la app)

- **Crema como fondo siempre.** Cualquier banda con el patrón zigzag se funde sin bordes porque el patrón tiene el mismo crema de base.
- **Azul para lo interactivo.** Botones principales en `#344268` con texto crema `#FEF3DE`. El oliva `#C6BF81` es para acentos (bordes, subrayados, controles secundarios), **no** para precios: un precio con fondo se confunde con un botón.
- **Precios en texto plano** azul semibold, con prefijo "Desde " cuando aplica.
- **Fotos de gelato**: PNG/WebP con fondo transparente, el vaso azul GIA centrado. En tarjetas, mostrar completas (`contain`); nunca recortarlas.
- **Nombres de sabor** en Playfair Display bold; subtítulos en Playfair itálica.
- **Esquinas**: tarjetas grandes radio 36, compactas 24, chips 24, botones tipo píldora.
- El logo va **sin fondo** directamente sobre el patrón o sobre crema.

## Modelo de negocio (para el catálogo)

- El precio **no es por sabor sino por tamaño**: Pequeño (1 sabor) $15.000, Grande (2 sabores) $21.000, Litro (2 sabores) $70.000.
- Los sabores cambian por temporada; `productos` es el listado actual (12). Categorías: Clásicos, Frutales, Especiales.
- Pedidos: por WhatsApp (mensaje pre-armado) o Rappi. El domicilio se coordina por WhatsApp.

## Uso rápido

**Web (CSS):**
```html
<link rel="stylesheet" href="gia-brand-kit/fonts.css">
<link rel="stylesheet" href="gia-brand-kit/colors.css">
<style>
  body { background: var(--gia-crema); color: var(--gia-azul); font-family: var(--gia-font-cuerpo); }
  h1, h2 { font-family: var(--gia-font-titulos); }
</style>
```

**JavaScript / cualquier lenguaje:**
```js
const brand = require('./gia-brand-kit/brand.json');
brand.colores.principales.azulBoton.hex   // "#344268"
brand.tamanos.find(t => t.id === 'grande').precio   // 21000
brand.productos.filter(p => p.categoria === 'frutal')
```

**Hojas de cálculo:** abre `productos.csv` y `precios.csv` directamente.

## Licencias de fuentes

- **Lapture** (JAF): fuente comercial — los archivos están aquí para uso interno de la marca; verificar la licencia antes de redistribuir en un producto público.
- **Playfair Display** y **Great Vibes**: Open Font License (Google Fonts), uso libre.

## Origen

Extraído de giagelateria.com (sitio original), el menú impreso, el material de marca
entregado por GIA y la app web construida en 2026 (repositorio: santequera1/giagelateria).
