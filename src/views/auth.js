import { loginUser, registerUser } from '../state.js';

export function renderAuth(container, { onNavigate }) {
  let mode = 'login';

  const render = (error) => {
    container.innerHTML = `
      <div class="stack">
        <div class="row" style="gap:0.5rem">
          <button class="pill" data-back>← Назад</button>
          <h2 style="margin:0">${mode === 'login' ? 'Вход' : 'Регистрация'}</h2>
        </div>
        <div class="surface">
          <div class="row" style="gap:0.5rem; margin-bottom:1rem">
            <button class="pill ${mode === 'login' ? 'active' : ''}" data-mode="login">Войти</button>
            <button class="pill ${mode === 'register' ? 'active' : ''}" data-mode="register">Создать аккаунт</button>
          </div>
          <form id="auth-form" class="stack">
            ${mode === 'register' ? '<label class="stack"><span class="muted">Имя</span><input name="firstName" class="input" required /></label>' : ''}
            <label class="stack">
              <span class="muted">Email</span>
              <input class="input" type="email" name="email" required placeholder="you@example.com" />
            </label>
            <label class="stack">
              <span class="muted">Пароль</span>
              <input class="input" type="password" name="password" required minlength="8" placeholder="••••••••" />
            </label>
            ${mode === 'register' ? '<label class="stack"><span class="muted">Фамилия (опционально)</span><input class="input" name="lastName" /></label>' : ''}
            ${error ? `<div class="alert danger">${error}</div>` : ''}
            <button class="button" type="submit">${mode === 'login' ? 'Войти' : 'Зарегистрироваться'}</button>
          </form>
        </div>
      </div>
    `;

    container.querySelector('[data-back]').addEventListener('click', () => onNavigate('/'));
    container.querySelectorAll('[data-mode]').forEach((btn) =>
      btn.addEventListener('click', () => {
        mode = btn.dataset.mode;
        render();
      }),
    );

    const form = container.querySelector('#auth-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      form.querySelector('button[type="submit"]').disabled = true;
      form.querySelector('button[type="submit"]').textContent = 'Сохраняем...';
      try {
        if (mode === 'login') {
          await loginUser({ email: payload.email, password: payload.password });
        } else {
          await registerUser({
            email: payload.email,
            password: payload.password,
            firstName: payload.firstName,
            lastName: payload.lastName || null,
          });
        }
        onNavigate('/');
      } catch (err) {
        render('Не удалось выполнить запрос. Проверьте данные и попробуйте снова.');
      }
    });
  };

  render();
}
