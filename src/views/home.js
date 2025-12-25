import { listCategories, listProducts } from '../api.js';
import { addCartItem } from '../state.js';
import { formatCurrency, priceRange } from '../utils/format.js';

let cachedCategories = [];

function renderProductCard(product) {
  const heroVariant = product.variants[0];
  return `
    <article class="card" data-id="${product.id}">
      <img src="${product.image}" alt="${product.name}" loading="lazy" />
      <div class="row justify-between">
        <h3 style="margin:0">${product.name}</h3>
        <span class="badge">${product.category}</span>
      </div>
      <p class="muted" style="min-height:48px">${product.description.slice(0, 90)}...</p>
      <div class="row justify-between">
        <div class="stack" style="gap:0.15rem">
          <strong>${priceRange(product.variants)}</strong>
          <span class="muted">от ${heroVariant?.weight}</span>
        </div>
        <div class="row">
          <button class="button ghost" data-action="view">Открыть</button>
          <button class="button" data-action="add">В корзину</button>
        </div>
      </div>
    </article>
  `;
}

function debounce(fn, delay = 350) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

async function ensureCategories() {
  if (cachedCategories.length) return cachedCategories;
  const response = await listCategories();
  cachedCategories = response.items;
  return cachedCategories;
}

export async function renderHome(container, { filters, onFiltersChange, onNavigate }) {
  const updateFilters = (next) => {
    filters = { ...filters, ...next };
    onFiltersChange(filters);
  };

  container.innerHTML = `
    <section class="hero">
      <h1>Каталог китайского чая</h1>
      <p>Выберите любимый улун, пуэр или белый чай. Поиск работает по названию и тегам.</p>
      <input class="input" type="search" value="${filters.search ?? ''}" placeholder="Поиск по каталогу..." />
    </section>
    <section class="section" id="categories"></section>
    <section class="section">
      <div class="row justify-between" style="margin-bottom:0.5rem">
        <h2 style="margin:0">Товары</h2>
        <span class="muted" id="count"></span>
      </div>
      <div id="products" class="grid"></div>
      <div id="products-error" class="alert" style="display:none"></div>
    </section>
  `;

  const searchInput = container.querySelector('input[type="search"]');
  const productsGrid = container.querySelector('#products');
  const productsError = container.querySelector('#products-error');
  const countEl = container.querySelector('#count');
  const categoryHolder = container.querySelector('#categories');

  const renderCategories = (categories) => {
    categoryHolder.innerHTML = `
      <div class="row" style="flex-wrap:wrap; gap:0.5rem">
        <button class="pill ${!filters.category ? 'active' : ''}" data-category="">Все</button>
        ${categories
          .map(
            (cat) =>
              `<button class="pill ${filters.category === cat.id ? 'active' : ''}" data-category="${cat.id}">${cat.label}</button>`,
          )
          .join('')}
      </div>
    `;
    categoryHolder.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        updateFilters({ category: btn.dataset.category });
        loadProducts();
      });
    });
  };

  ensureCategories()
    .then(renderCategories)
    .catch(() => {
      categoryHolder.innerHTML = `<div class="alert">Не удалось загрузить категории</div>`;
    });

  const loadProducts = async () => {
    productsGrid.innerHTML = '<p class="muted">Загружаем подборку...</p>';
    productsError.style.display = 'none';
    try {
      const data = await listProducts({
        search: filters.search || undefined,
        category: filters.category || undefined,
        limit: 60,
      });
      if (!data.items.length) {
        productsGrid.innerHTML = '<p class="muted">Товары не найдены. Попробуйте изменить запрос.</p>';
        countEl.textContent = '';
        return;
      }
      countEl.textContent = `${data.total} предложений`;
      productsGrid.innerHTML = data.items.map((product) => renderProductCard(product)).join('');

      productsGrid.querySelectorAll('.card').forEach((card, index) => {
        const product = data.items[index];
        card.querySelector('[data-action="view"]').addEventListener('click', (e) => {
          e.preventDefault();
          onNavigate(`/product/${product.id}`);
        });
        card.querySelector('[data-action="add"]').addEventListener('click', () => {
          const variant = product.variants[0];
          if (variant) {
            addCartItem(product, variant, 1);
          }
        });
      });
    } catch (error) {
      productsGrid.innerHTML = '';
      productsError.style.display = 'block';
      productsError.textContent = 'Не удалось загрузить товары. Попробуйте позже.';
      console.error(error);
    }
  };

  searchInput.addEventListener(
    'input',
    debounce((e) => {
      updateFilters({ search: e.target.value });
      loadProducts();
    }, 350),
  );

  loadProducts();
}
