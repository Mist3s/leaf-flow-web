import { applyIcons } from '../icons.js';

export function renderHeader(container, { theme, cartCount, user, onToggleTheme, onNavigate, onLogout }) {
  container.innerHTML = `
    <nav class="nav">
      <a class="brand" href="#/">
        <span class="brand-badge"><i class="lucide lucide-cup-soda"></i></span>
        Zavarka39
      </a>
      <div class="nav-actions">
        <button class="pill" data-action="theme">
          <i class="lucide ${theme === 'dark' ? 'lucide-moon' : 'lucide-sun'}"></i>
          ${theme === 'dark' ? 'Тёмная' : 'Светлая'}
        </button>
        ${
          user
            ? `<span class="nav-user"><i class="lucide lucide-user-round"></i>${user.firstName || 'Профиль'}</span>
               <button class="pill" data-action="logout"><i class="lucide lucide-log-out"></i>Выйти</button>`
            : `<button class="pill" data-action="auth"><i class="lucide lucide-log-in"></i>Войти</button>`
        }
        <button class="pill" data-action="cart"><i class="lucide lucide-shopping-bag"></i>Корзина <span class="badge">${cartCount}</span></button>
      </div>
    </nav>
  `;

  container.querySelector('[data-action="theme"]').addEventListener('click', onToggleTheme);
  container.querySelector('[data-action="cart"]').addEventListener('click', (e) => {
    e.preventDefault();
    onNavigate('/cart');
  });
  const authBtn = container.querySelector('[data-action="auth"]');
  if (authBtn) {
    authBtn.addEventListener('click', (e) => {
      e.preventDefault();
      onNavigate('/auth');
    });
  }
  const logoutBtn = container.querySelector('[data-action="logout"]');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', onLogout);
  }

  applyIcons(container);
}
