import { createOrder } from '../api.js';
import { clearLocalCart } from '../state.js';
import { formatCurrency } from '../utils/format.js';

export function renderCheckout(container, { cart, onNavigate }) {
  if (!cart.items.length) {
    container.innerHTML = `
      <div class="surface stack" style="align-items:flex-start">
        <h2 style="margin:0">Корзина пуста</h2>
        <p class="muted">Добавьте товары перед оформлением заказа.</p>
        <button class="button" data-back>К каталогу</button>
      </div>
    `;
    container.querySelector('[data-back]').addEventListener('click', () => onNavigate('/'));
    return;
  }

  container.innerHTML = `
    <div class="stack">
      <div class="row" style="gap:0.75rem">
        <button class="pill" data-back>← Назад</button>
        <h2 style="margin:0">Оформление заказа</h2>
      </div>
      <div class="section surface">
        <form id="order-form" class="stack">
          <label class="stack">
            <span class="muted">Имя и фамилия</span>
            <input class="input" name="customerName" required placeholder="Например, Иван Петров" />
          </label>
          <label class="stack">
            <span class="muted">Телефон</span>
            <input class="input" name="phone" type="tel" required placeholder="+7" />
          </label>
          <div class="stack">
            <span class="muted">Доставка</span>
            <div class="row" style="flex-wrap:wrap; gap:0.5rem">
              <label class="pill"><input type="radio" name="delivery" value="pickup" checked /> Самовывоз</label>
              <label class="pill"><input type="radio" name="delivery" value="courier" /> Курьер</label>
              <label class="pill"><input type="radio" name="delivery" value="cdek" /> СДЭК</label>
            </div>
          </div>
          <label class="stack" data-address>
            <span class="muted">Адрес</span>
            <input class="input" name="address" placeholder="Город, улица, дом, квартира" />
          </label>
          <label class="stack">
            <span class="muted">Комментарий (необязательно)</span>
            <textarea class="input" name="comment" rows="3" placeholder="Пожелания к доставке или сборке"></textarea>
          </label>
          <hr class="divider" />
          <div class="row justify-between" style="align-items:center">
            <div class="stack" style="gap:0.15rem">
              <span class="muted">${cart.totalCount} позиций</span>
              <strong>${formatCurrency(cart.totalPrice)}</strong>
            </div>
            <button class="button" type="submit">Отправить заказ</button>
          </div>
          <div class="alert danger" id="order-error" style="display:none"></div>
        </form>
      </div>
      <div class="surface stack">
        <h3 style="margin:0">Состав заказа</h3>
        ${cart.items
          .map(
            (item) => `
              <div class="row justify-between">
                <div class="stack" style="gap:0.1rem">
                  <strong>${item.productName}</strong>
                  <span class="muted">${item.variantLabel} · ${formatCurrency(item.price)}</span>
                </div>
                <span>× ${item.quantity}</span>
              </div>
            `,
          )
          .join('')}
      </div>
    </div>
  `;

  const form = container.querySelector('#order-form');
  const errorEl = container.querySelector('#order-error');
  const addressBlock = container.querySelector('[data-address]');

  const toggleAddress = (delivery) => {
    addressBlock.style.display = delivery === 'pickup' ? 'none' : 'flex';
    if (delivery === 'pickup') {
      form.address.value = '';
    }
  };

  form.addEventListener('change', (e) => {
    if (e.target.name === 'delivery') {
      toggleAddress(e.target.value);
    }
  });
  toggleAddress('pickup');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';
    const formData = new FormData(form);
    const delivery = formData.get('delivery');
    const payload = {
      customerName: formData.get('customerName'),
      phone: formData.get('phone'),
      delivery,
      address: delivery === 'pickup' ? null : formData.get('address'),
      comment: formData.get('comment') || null,
      expectedTotal: cart.totalPrice,
    };

    form.querySelector('button[type="submit"]').disabled = true;
    form.querySelector('button[type="submit"]').textContent = 'Отправляем...';

    try {
      const summary = await createOrder(payload);
      clearLocalCart();
      container.innerHTML = `
        <div class="surface stack">
          <div class="alert">Заказ создан</div>
          <h2 style="margin:0">Спасибо! Ваш заказ №${summary.orderId}</h2>
          <p class="muted">Метод доставки: ${summary.deliveryMethod}. Сумма: ${formatCurrency(summary.total)}.</p>
          <button class="button" data-home>Вернуться в каталог</button>
        </div>
      `;
      container.querySelector('[data-home]').addEventListener('click', () => onNavigate('/'));
    } catch (error) {
      errorEl.style.display = 'block';
      errorEl.textContent = 'Не удалось отправить заказ. Проверьте данные и попробуйте снова.';
      form.querySelector('button[type="submit"]').disabled = false;
      form.querySelector('button[type="submit"]').textContent = 'Отправить заказ';
      console.error(error);
    }
  });

  container.querySelector('[data-back]').addEventListener('click', () => onNavigate('/cart'));
}
