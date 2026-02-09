import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { extname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '..', 'dist');
// Используем случайный порт или переменную окружения для избежания конфликтов
const PORT = process.env.PRERENDER_PORT || 3000;
const SITE_URL = `http://localhost:${PORT}`;
const API_URL = 'https://app.zavarka39.ru/api/v1/catalog/products';

// Статические страницы для pre-rendering (пути со слешем)
// Примечание: 404.html — статичный файл в public/, копируется автоматически
const STATIC_PAGES = [
  { path: '/', output: 'index.html' },
  { path: '/delivery/', output: 'delivery/index.html' },
  { path: '/privacy/', output: 'privacy/index.html' },
  { path: '/offer/', output: 'offer/index.html' },
  { path: '/about/', output: 'about/index.html' },
];

// Категории для pre-rendering (должны соответствовать src/utils/categories.ts)
const CATEGORY_PAGES = [
  { path: '/catalog/shu-puer/', output: 'catalog/shu-puer/index.html' },
  { path: '/catalog/sheng-puer/', output: 'catalog/sheng-puer/index.html' },
  { path: '/catalog/ulun/', output: 'catalog/ulun/index.html' },
  { path: '/catalog/krasnyj-chaj/', output: 'catalog/krasnyj-chaj/index.html' },
  { path: '/catalog/zelenyj-chaj/', output: 'catalog/zelenyj-chaj/index.html' },
  { path: '/catalog/belyj-chaj/', output: 'catalog/belyj-chaj/index.html' },
  { path: '/catalog/chajnyj-napitok/', output: 'catalog/chajnyj-napitok/index.html' },
  { path: '/catalog/posuda/', output: 'catalog/posuda/index.html' },
];

// Получение всех продуктов из API
async function fetchAllProducts() {
  const products = [];
  let offset = 0;
  const limit = 100;

  console.log('📦 Получение списка продуктов из API...');
  
  while (true) {
    try {
      const response = await fetch(`${API_URL}?limit=${limit}&offset=${offset}`);
      const data = await response.json();
      products.push(...data.items);

      if (products.length >= data.total || data.items.length < limit) {
        break;
      }
      offset += limit;
    } catch (error) {
      console.error('❌ Ошибка при получении продуктов:', error);
      break;
    }
  }

  console.log(`✅ Найдено ${products.length} продуктов`);
  return products;
}

// Простой HTTP сервер для раздачи статических файлов
function createStaticServer() {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  };

  return createServer((req, res) => {
    let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);
    
    // Убираем query string
    filePath = filePath.split('?')[0];
    
    // Если это директория, добавляем index.html
    if (!extname(filePath)) {
      filePath = path.join(filePath, 'index.html');
    }

    fs.readFile(filePath)
      .then((data) => {
        const ext = path.extname(filePath);
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      })
      .catch(() => {
        // Fallback на index.html для SPA роутинга
        const indexPath = path.join(DIST_DIR, 'index.html');
        fs.readFile(indexPath)
          .then((data) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
          })
          .catch(() => {
            res.writeHead(404);
            res.end('Not Found');
          });
      });
  });
}

// Pre-render страницы с помощью Puppeteer
async function prerenderPage(browser, url, outputPath) {
  // Проверяем, что браузер еще открыт
  if (!browser || !browser.isConnected()) {
    throw new Error('Браузер закрыт или не подключен');
  }
  
  const page = await browser.newPage();
  
  try {
    console.log(`🔄 Рендеринг: ${url}`);
    
    // Переходим на страницу
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Ждем, пока React загрузится и обновит title
    // Для страниц продуктов ждем дольше, так как нужно загрузить данные
    const isProductPage = url.includes('/product/');
    const timeout = isProductPage ? 15000 : 10000;
    
    try {
      await page.waitForFunction(
        () => {
          const title = document.title;
          // Проверяем, что title обновился (не дефолтный)
          const defaultTitle = 'Zavarka39 — Китайский чай в Калининграде | Купить чай с доставкой';
          return title && title !== defaultTitle && title !== 'Загрузка товара... — Zavarka39';
        },
        { timeout }
      );
    } catch {
      // Если title не изменился, продолжаем (возможно, это главная страница)
      const currentTitle = await page.title();
      if (isProductPage) {
        console.warn(`⚠️  Title не обновился для ${url}, текущий: ${currentTitle}`);
      }
    }

    // Дополнительная задержка для завершения всех асинхронных операций
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Получаем HTML с обновленным title
    const html = await page.content();
    
    // Создаем директорию если нужно
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });
    
    // Сохраняем HTML
    await fs.writeFile(outputPath, html, 'utf-8');
    
    // Получаем title для отчета
    const title = await page.title();
    console.log(`✅ Сохранено: ${outputPath} (title: ${title})`);
    
    return { success: true, title };
  } catch (error) {
    console.error(`❌ Ошибка при рендеринге ${url}:`, error.message);
    return { success: false, error: error.message };
  } finally {
    await page.close();
  }
}

// Основная функция
async function main() {
  console.log('🚀 Запуск pre-rendering...\n');

  // Проверяем, что dist директория существует
  try {
    await fs.access(DIST_DIR);
  } catch {
    console.error('❌ Директория dist не найдена. Сначала выполните: npm run build');
    process.exit(1);
  }

  // Запускаем локальный сервер
  const server = createStaticServer();
  await new Promise((resolve) => {
    server.listen(PORT, () => {
      console.log(`📡 Локальный сервер запущен на порту ${PORT}\n`);
      resolve();
    });
  });

  try {
    // Получаем список продуктов
    const products = await fetchAllProducts();
    
    // Запускаем браузер
    console.log('\n🌐 Запуск браузера...');
    
    // Используем системный Chromium в Docker или загруженный локально
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
    
    console.log(`   Путь к браузеру: ${executablePath || 'встроенный Puppeteer'}`);
    
    let browser;
    try {
      // Флаги для работы в Docker
      const launchArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
      ];
      
      browser = await puppeteer.launch({
        headless: 'new',
        executablePath,
        args: launchArgs,
        ignoreHTTPSErrors: true,
        timeout: 60000,
      });
      
      console.log('✅ Браузер успешно запущен');
      
      // Проверяем, что браузер действительно работает
      try {
        const testPage = await browser.newPage();
        await testPage.goto('about:blank', { waitUntil: 'domcontentloaded', timeout: 5000 });
        await testPage.close();
        console.log('✅ Браузер работает корректно');
      } catch (testError) {
        console.warn('⚠️  Предупреждение при тестировании браузера:', testError.message);
        // Продолжаем работу, возможно браузер все равно работает
      }
      
    } catch (error) {
      console.error('❌ Ошибка при запуске браузера:', error.message);
      if (executablePath) {
        console.error(`   Используемый путь: ${executablePath}`);
        console.error(`   Проверьте, что файл существует и исполняемый`);
      }
      console.error('   Полная ошибка:', error);
      throw error;
    }

    const results = {
      success: 0,
      failed: 0,
      pages: [],
    };

    try {
      // Проверяем, что браузер все еще работает перед началом рендеринга
      if (!browser || !browser.isConnected()) {
        throw new Error('Браузер закрыт перед началом рендеринга');
      }
      
      // Pre-render статических страниц
      console.log('\n📄 Рендеринг статических страниц...');
      for (const page of STATIC_PAGES) {
        // Проверяем браузер перед каждой страницей
        if (!browser || !browser.isConnected()) {
          console.error('❌ Браузер закрыт во время рендеринга');
          break;
        }
        
        const outputPath = path.join(DIST_DIR, page.output);
        const result = await prerenderPage(browser, `${SITE_URL}${page.path}`, outputPath);
        
        if (result.success) {
          results.success++;
          results.pages.push({ path: page.path, title: result.title });
        } else {
          results.failed++;
        }
      }

      // Pre-render страниц категорий
      console.log(`\n📂 Рендеринг страниц категорий (${CATEGORY_PAGES.length} шт.)...`);
      for (const page of CATEGORY_PAGES) {
        if (!browser || !browser.isConnected()) {
          console.error('❌ Браузер закрыт во время рендеринга категорий');
          break;
        }
        
        const outputPath = path.join(DIST_DIR, page.output);
        const result = await prerenderPage(browser, `${SITE_URL}${page.path}`, outputPath);
        
        if (result.success) {
          results.success++;
          results.pages.push({ path: page.path, title: result.title });
        } else {
          results.failed++;
        }
      }

      // Pre-render страниц продуктов
      console.log(`\n🛍️  Рендеринг страниц продуктов (${products.length} шт.)...`);
      let processed = 0;
      
      for (const product of products) {
        // Проверяем браузер перед каждой страницей
        if (!browser || !browser.isConnected()) {
          console.error('❌ Браузер закрыт во время рендеринга продуктов');
          break;
        }
        
        const productPath = `/product/${product.id}/`;
        const outputPath = path.join(DIST_DIR, 'product', product.id, 'index.html');
        const result = await prerenderPage(browser, `${SITE_URL}${productPath}`, outputPath);
        
        if (result.success) {
          results.success++;
          results.pages.push({ path: productPath, title: result.title });
        } else {
          results.failed++;
        }
        
        processed++;
        if (processed % 10 === 0) {
          console.log(`   Прогресс: ${processed}/${products.length}`);
        }
      }

      console.log('\n📊 Результаты:');
      console.log(`   ✅ Успешно: ${results.success}`);
      console.log(`   ❌ Ошибок: ${results.failed}`);
      console.log(`   📄 Всего страниц: ${results.success + results.failed}`);

      // Сохраняем отчет
      const reportPath = path.join(DIST_DIR, 'prerender-report.json');
      await fs.writeFile(
        reportPath,
        JSON.stringify(results, null, 2),
        'utf-8'
      );
      console.log(`\n📋 Отчет сохранен: ${reportPath}`);

    } finally {
      if (browser) {
        try {
          await browser.close();
          console.log('✅ Браузер закрыт');
        } catch (error) {
          console.warn('⚠️  Ошибка при закрытии браузера:', error.message);
        }
      }
    }
  } finally {
    server.close();
    console.log('\n✅ Pre-rendering завершен!');
  }
}

main().catch((error) => {
  console.error('❌ Критическая ошибка:', error);
  if (error.stack) {
    console.error('Stack trace:', error.stack);
  }
  process.exit(1);
});
