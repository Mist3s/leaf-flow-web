export function renderHeader(container, { theme, cartCount, onToggleTheme, onNavigate }) {
  container.innerHTML = `
    <nav class="nav">
      <a class="brand" href="#/">
        <span class="brand-badge">茶</span>
        Zavarka39
      </a>
      <div class="nav-actions">
        <button class="pill" data-action="theme">
          ${theme === 'dark' ? '🌙 Тёмная' : '🌞 Светлая'}
        </button>
        <button class="pill" data-action="cart">
          🧺 Корзина
          <span class="badge">${cartCount}</span>
        </button>
      </div>
    </nav>
  `;

  container.querySelector('[data-action="theme"]').addEventListener('click', onToggleTheme);
  container.querySelector('[data-action="cart"]').addEventListener('click', (e) => {
    e.preventDefault();
    onNavigate('/cart');
  });
}
