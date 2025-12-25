import { getProduct } from '../api.js';
import { addCartItem } from '../state.js';
import { formatCurrency } from '../utils/format.js';

export async function renderProduct(container, { id, onNavigate }) {
  container.innerHTML = `<p class="muted">Загружаем описание чая...</p>`;

  try {
    const product = await getProduct(id);
    let activeVariant = product.variants[0];
    let quantity = 1;

    container.innerHTML = `
      <div class="row" style="margin-bottom:0.75rem">
        <button class="pill" data-back>← Назад</button>
      </div>
      <section class="product-header">
        <div class="product-visual">
          <img src="${product.image}" alt="${product.name}" />
        </div>
        <div class="stack">
          <div class="row" style="gap:0.5rem; flex-wrap:wrap">
            ${product.tags.map((tag) => `<span class="badge">#${tag}</span>`).join('')}
          </div>
          <h1 style="margin:0">${product.name}</h1>
          <p class="muted">${product.description}</p>
          <div class="stack">
            <span class="muted">Выберите фасовку</span>
            <div class="variant-list">
              ${product.variants
                .map(
                  (variant) => `
                <button class="variant ${variant.id === activeVariant.id ? 'active' : ''}" data-variant="${variant.id}">
                  <strong>${variant.weight}</strong>
                  <span class="muted">${formatCurrency(variant.price)}</span>
                </button>`,
                )
                .join('')}
            </div>
          </div>
          <div class="row justify-between" style="align-items:flex-end">
            <div class="stack" style="gap:0.15rem">
              <span class="muted">Стоимость</span>
              <h2 style="margin:0">${formatCurrency(activeVariant.price)}</h2>
            </div>
            <div class="row">
              <input type="number" min="1" value="1" class="input" style="width:90px" />
              <button class="button" data-add>В корзину</button>
            </div>
          </div>
        </div>
      </section>
    `;

    container.querySelector('[data-back]').addEventListener('click', () => onNavigate('/'));

    const qtyInput = container.querySelector('input[type="number"]');
    qtyInput.addEventListener('input', (e) => {
      quantity = Math.max(1, Number(e.target.value) || 1);
      e.target.value = quantity;
    });

    container.querySelectorAll('.variant').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = product.variants.find((v) => v.id === btn.dataset.variant);
        if (!next) return;
        activeVariant = next;
        container.querySelectorAll('.variant').forEach((v) => v.classList.remove('active'));
        btn.classList.add('active');
        container.querySelector('h2').textContent = formatCurrency(next.price);
      });
    });

    container.querySelector('[data-add]').addEventListener('click', () => {
      addCartItem(product, activeVariant, quantity);
    });
  } catch (error) {
    container.innerHTML = `<div class="alert danger">Не удалось загрузить товар. Попробуйте обновить страницу.</div>`;
    console.error(error);
  }
}
