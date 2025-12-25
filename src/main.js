import { renderHeader } from './components/header.js';
import { getState, hydrateCart, initAuth, initTheme, logoutUser, setTheme, subscribe } from './state.js';
import { renderCart } from './views/cart.js';
import { renderCheckout } from './views/checkout.js';
import { renderHome } from './views/home.js';
import { renderProduct } from './views/product.js';
import { renderAuth } from './views/auth.js';

const app = document.getElementById('app');
const headerSlot = document.createElement('div');
const viewSlot = document.createElement('div');
app.append(headerSlot, viewSlot);

let homeFilters = {
  search: '',
  category: '',
};

let currentRoute = null;
let currentState = getState();

function navigate(path) {
  const normalized = path.startsWith('#') ? path : `#${path}`;
  if (location.hash === normalized) {
    renderCurrentRoute();
  } else {
    location.hash = normalized;
  }
}

function matchRoute() {
  const path = location.hash.replace(/^#/, '') || '/';
  const matchers = [
    { name: 'home', pattern: /^\/$/, params: {} },
    { name: 'product', pattern: /^\/product\/([^/]+)$/, params: ['id'] },
    { name: 'cart', pattern: /^\/cart$/, params: {} },
    { name: 'checkout', pattern: /^\/checkout$/, params: {} },
    { name: 'auth', pattern: /^\/auth$/, params: {} },
  ];

  for (const m of matchers) {
    const res = path.match(m.pattern);
    if (res) {
      const params = {};
      if (m.params) {
        m.params.forEach((key, index) => {
          params[key] = res[index + 1];
        });
      }
      return { name: m.name, params };
    }
  }
  return { name: 'home', params: {} };
}

function renderHeaderUI() {
  renderHeader(headerSlot, {
    theme: currentState.theme,
    cartCount: currentState.cart.totalCount,
    user: currentState.auth.user,
    onToggleTheme: () => setTheme(currentState.theme === 'dark' ? 'light' : 'dark'),
    onNavigate: navigate,
    onLogout: logoutUser,
  });
}

async function renderCurrentRoute() {
  currentRoute = matchRoute();
  const { name, params } = currentRoute;

  if (name === 'home') {
    renderHome(viewSlot, {
      filters: homeFilters,
      onFiltersChange: (next) => {
        homeFilters = { ...homeFilters, ...next };
      },
      onNavigate: navigate,
    });
  } else if (name === 'product') {
    renderProduct(viewSlot, { id: params.id, onNavigate: navigate });
  } else if (name === 'cart') {
    renderCart(viewSlot, { cart: currentState.cart, lastSyncError: currentState.lastSyncError, onNavigate: navigate });
  } else if (name === 'checkout') {
    renderCheckout(viewSlot, { cart: currentState.cart, onNavigate: navigate });
  } else if (name === 'auth') {
    renderAuth(viewSlot, { onNavigate: navigate });
  }
}

window.addEventListener('hashchange', renderCurrentRoute);

subscribe((nextState) => {
  currentState = nextState;
  renderHeaderUI();
  if (currentRoute?.name === 'cart' || currentRoute?.name === 'checkout') {
    renderCurrentRoute();
  }
});

initTheme();
initAuth().finally(() => renderCurrentRoute());
renderHeaderUI();
hydrateCart().finally(() => renderCurrentRoute());
renderCurrentRoute();
