import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = 'https://zavarka39.ru';
const API_URL = 'https://app.zavarka39.ru/api/v1/catalog/products';

async function fetchAllProducts() {
  const products = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await fetch(`${API_URL}?limit=${limit}&offset=${offset}`);
    const data = await response.json();
    products.push(...data.items);

    if (products.length >= data.total || data.items.length < limit) {
      break;
    }
    offset += limit;
  }

  return products;
}

// Статические страницы сайта (со слешем в конце для консистентности)
const STATIC_PAGES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/delivery/', changefreq: 'monthly', priority: '0.6' },
  { path: '/privacy/', changefreq: 'yearly', priority: '0.3' },
  { path: '/offer/', changefreq: 'yearly', priority: '0.3' },
  { path: '/about/', changefreq: 'monthly', priority: '0.5' },
];

function generateSitemap(products) {
  const today = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  // Статические страницы
  for (const page of STATIC_PAGES) {
    xml += `
  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
  }

  // Страницы товаров (со слешем в конце)
  for (const product of products) {
    xml += `
  <url>
    <loc>${SITE_URL}/product/${product.id}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }

  xml += '\n</urlset>';
  return xml;
}

async function main() {
  console.log('Fetching products from API...');
  const products = await fetchAllProducts();
  console.log(`Found ${products.length} products`);

  const sitemap = generateSitemap(products);

  const outputPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
  await fs.writeFile(outputPath, sitemap, 'utf-8');
  console.log(`Sitemap generated at ${outputPath}`);
  console.log(`Total URLs: ${products.length + STATIC_PAGES.length}`);
}

main().catch(console.error);
