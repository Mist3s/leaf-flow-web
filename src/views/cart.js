import { changeCartQuantity, clearLocalCart, removeFromCart } from '../state.js';
import { formatCurrency } from '../utils/format.js';

function renderRow(item) {
  return `
    <tr data-key="${item.productId}:${item.variantId}">
      <td>
        <div class="stack">
          <strong>${item.productName}</strong>
          <span class="muted">${item.variantLabel}</span>
        </div>
      </td>
      <td>${formatCurrency(item.price)}</td>
      <td>
        <div class="row">
          <button class="pill" data-action="dec">−</button>
          <input class="input" data-field="qty" type="number" min="1" value="${item.quantity}" style="width:80px" />
          <button class="pill" data-action="inc">+</button>
        </div>
      </td>
      <td>${formatCurrency(parseFloat(item.price) * item.quantity)}</td>
      <td><button class="pill danger" data-action="remove">Удалить</button></td>
    </tr>
  `;
}

export function renderCart(container, { cart, lastSyncError, onNavigate }) {
  if (!cart.items.length) {
    container.innerHTML = `
      <div class="surface stack" style="align-items:flex-start">
        <h2 style="margin:0">Корзина пуста</h2>
        <p class="muted">Добавьте чай в каталогe, чтобы оформить заказ.</p>
        <button class="button" data-back>К каталогу</button>
      </div>
    `;
    container.querySelector('[data-back]').addEventListener('click', () => onNavigate('/'));
    return;
  }

  container.innerHTML = `
    <div class="stack">
      <div class="row justify-between">
        <h2 style="margin:0">Корзина</h2>
        <button class="pill" data-clear>Очистить</button>
      </div>
      ${lastSyncError ? `<div class="alert danger">${lastSyncError}</div>` : ''}
      <table class="table">
        <thead>
          <tr>
            <th>Товар</th>
            <th>Цена</th>
            <th>Кол-во</th>
            <th>Сумма</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${cart.items.map((item) => renderRow(item)).join('')}
        </tbody>
      </table>
      <div class="row justify-between" style="align-items:center">
        <div class="stack" style="gap:0.15rem">
          <span class="muted">Всего</span>
          <h2 style="margin:0">${formatCurrency(cart.totalPrice)}</h2>
        </div>
        <button class="button" data-checkout>Перейти к оформлению</button>
      </div>
    </div>
  `;

  container.querySelector('[data-clear]').addEventListener('click', () => clearLocalCart());
  container.querySelector('[data-checkout]').addEventListener('click', () => onNavigate('/checkout'));

  container.querySelectorAll('tbody tr').forEach((row) => {
    const [productId, variantId] = row.dataset.key.split(':');
    const qtyInput = row.querySelector('[data-field="qty"]');

    row.querySelector('[data-action="inc"]').addEventListener('click', () => {
      const next = Number(qtyInput.value) + 1;
      qtyInput.value = next;
      changeCartQuantity(productId, variantId, next);
    });
    row.querySelector('[data-action="dec"]').addEventListener('click', () => {
      const next = Math.max(1, Number(qtyInput.value) - 1);
      qtyInput.value = next;
      changeCartQuantity(productId, variantId, next);
    });
    qtyInput.addEventListener('input', (e) => {
      const next = Math.max(1, Number(e.target.value) || 1);
      e.target.value = next;
      changeCartQuantity(productId, variantId, next);
    });
    row.querySelector('[data-action="remove"]').addEventListener('click', () => removeFromCart(productId, variantId));
  });
}
