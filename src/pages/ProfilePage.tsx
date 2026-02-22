import React, { useEffect, useState, useCallback } from 'react';
import { User, Package, ChevronLeft, ChevronRight, MapPin, Clock, X, Loader2, ShoppingBag, LogOut, Mail, Send, Link2, Unlink, AlertTriangle, Edit3, Lock, Eye, EyeOff, Check, MessageSquare } from 'lucide-react';
import { UserProfile, TelegramLoginWidgetPayload } from '../types/auth';
import { listOrders, getOrder, OrderListItem, OrderDetails, UpdateProfilePayload, ChangePasswordPayload, SetEmailPayload } from '../api';
import { formatCurrency } from '../utils/format';
import { TelegramLoginButton } from '../components/TelegramLoginButton';
import { TELEGRAM_BOT_NAME } from '../config';
import { useChatContext } from '../store/ChatContext';

type ToastPayload = {
  tone: 'success' | 'warning' | 'error' | 'info';
  message: string;
  actions?: { label: string; onClick: () => void }[];
};

type Props = {
  user: UserProfile | null;
  authLoading?: boolean;
  onNavigate: (path: string) => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onShowToast?: (toast: ToastPayload) => void;
  onTelegramLink?: (payload: TelegramLoginWidgetPayload) => Promise<{ success?: boolean; conflict?: boolean; error?: string }>;
  onTelegramUnlink?: () => Promise<{ success?: boolean; error?: string }>;
  onTelegramMerge?: (payload: TelegramLoginWidgetPayload) => Promise<{ success?: boolean; error?: string }>;
  onUpdateProfile?: (payload: UpdateProfilePayload) => Promise<{ success?: boolean; error?: string }>;
  onChangePassword?: (payload: ChangePasswordPayload) => Promise<{ success?: boolean; error?: string }>;
  onSetEmail?: (payload: SetEmailPayload) => Promise<{ success?: boolean; error?: string }>;
};

const ORDERS_PER_PAGE = 6;

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  created: { label: 'Создан', color: 'var(--text-muted)' },
  processing: { label: 'В обработке', color: 'var(--accent)' },
  paid: { label: 'Оплачен', color: 'var(--primary)' },
  fulfilled: { label: 'Выполнен', color: 'var(--primary)' },
  cancelled: { label: 'Отменён', color: '#dc2626' },
};

const DELIVERY_LABELS: Record<string, string> = {
  pickup: 'Самовывоз',
  courier: 'Курьер',
  cdek: 'СДЭК',
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const ProfilePage: React.FC<Props> = ({
  user,
  authLoading = false,
  onNavigate,
  onOpenAuth,
  onLogout,
  onShowToast,
  onTelegramLink,
  onTelegramUnlink,
  onTelegramMerge,
  onUpdateProfile,
  onChangePassword,
  onSetEmail,
}) => {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const { conversations } = useChatContext();

  // Telegram link states
  const [tgLoading, setTgLoading] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [pendingTgPayload, setPendingTgPayload] = useState<TelegramLoginWidgetPayload | null>(null);
  const [showTgWidget, setShowTgWidget] = useState(false);
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);

  // Settings states
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', email: '' });
  const [profileLoading, setProfileLoading] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [showSetEmailForm, setShowSetEmailForm] = useState(false);
  const [setEmailForm, setSetEmailForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [setEmailLoading, setSetEmailLoading] = useState(false);
  const [showSetEmailPassword, setShowSetEmailPassword] = useState(false);

  const isTelegramLinked = Boolean(user?.telegramId);
  const canUnlink = isTelegramLinked && Boolean(user?.email);

  const handleTelegramAuth = useCallback(async (payload: TelegramLoginWidgetPayload) => {
    if (!onTelegramLink) return;

    // Сразу закрываем popup после получения данных от виджета
    setShowTgWidget(false);
    setTgLoading(true);

    try {
      const result = await onTelegramLink(payload);
      if (result.conflict) {
        setPendingTgPayload(payload);
        setShowMergeDialog(true);
        setTgLoading(false);
        return;
      }
      if (result.error) {
        onShowToast?.({ tone: 'error', message: result.error });
        setTgLoading(false);
        return;
      }
      if (result.success) {
        onShowToast?.({ tone: 'success', message: 'Telegram успешно привязан!' });
      }
    } catch (err: any) {
      onShowToast?.({ tone: 'error', message: err?.message || 'Не удалось привязать Telegram' });
    } finally {
      setTgLoading(false);
    }
  }, [onTelegramLink, onShowToast]);

  // Открыть диалог подтверждения отвязки
  const openUnlinkDialog = useCallback(() => {
    setShowUnlinkDialog(true);
  }, []);

  // Подтвердить отвязку Telegram
  const handleTelegramUnlinkConfirm = useCallback(async () => {
    if (!onTelegramUnlink || !canUnlink) return;
    setTgLoading(true);

    try {
      const result = await onTelegramUnlink();
      if (result.error) {
        onShowToast?.({ tone: 'error', message: result.error });
        return;
      }
      if (result.success) {
        onShowToast?.({ tone: 'success', message: 'Telegram отвязан' });
        setShowUnlinkDialog(false);
      }
    } catch (err: any) {
      onShowToast?.({ tone: 'error', message: err?.message || 'Не удалось отвязать Telegram' });
    } finally {
      setTgLoading(false);
    }
  }, [onTelegramUnlink, canUnlink, onShowToast]);

  const handleMergeConfirm = useCallback(async () => {
    if (!pendingTgPayload || !onTelegramMerge) return;
    setTgLoading(true);

    try {
      const result = await onTelegramMerge(pendingTgPayload);
      if (result.error) {
        onShowToast?.({ tone: 'error', message: result.error });
        return;
      }
      if (result.success) {
        onShowToast?.({ tone: 'success', message: 'Аккаунты успешно объединены!' });
      }
    } catch (err: any) {
      onShowToast?.({ tone: 'error', message: err?.message || 'Не удалось объединить аккаунты' });
    } finally {
      setTgLoading(false);
      setShowMergeDialog(false);
      setPendingTgPayload(null);
    }
  }, [pendingTgPayload, onTelegramMerge, onShowToast]);

  const handleMergeCancel = useCallback(() => {
    setShowMergeDialog(false);
    setPendingTgPayload(null);
  }, []);

  // Начать редактирование профиля
  const startEditingProfile = useCallback(() => {
    if (!user) return;
    setProfileForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
    });
    setEditingProfile(true);
  }, [user]);

  // Сохранить изменения профиля
  const handleSaveProfile = useCallback(async () => {
    if (!onUpdateProfile || !user) return;

    // Собираем только изменённые поля
    const payload: UpdateProfilePayload = {};
    if (profileForm.firstName !== user.firstName) payload.firstName = profileForm.firstName;
    if (profileForm.lastName !== (user.lastName || '')) payload.lastName = profileForm.lastName || null;
    if (profileForm.email !== (user.email || '')) payload.email = profileForm.email;

    if (Object.keys(payload).length === 0) {
      setEditingProfile(false);
      return;
    }

    setProfileLoading(true);
    try {
      const result = await onUpdateProfile(payload);
      if (result.error) {
        onShowToast?.({ tone: 'error', message: result.error });
        return;
      }
      if (result.success) {
        onShowToast?.({ tone: 'success', message: 'Профиль обновлён' });
        setEditingProfile(false);
      }
    } catch (err: any) {
      onShowToast?.({ tone: 'error', message: err?.message || 'Не удалось обновить профиль' });
    } finally {
      setProfileLoading(false);
    }
  }, [onUpdateProfile, user, profileForm, onShowToast]);

  // Изменение пароля (для пользователей с email)
  const handleChangePassword = useCallback(async () => {
    if (!onChangePassword) return;

    if (!passwordForm.currentPassword) {
      onShowToast?.({ tone: 'error', message: 'Введите текущий пароль' });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      onShowToast?.({ tone: 'error', message: 'Пароль должен содержать минимум 8 символов' });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      onShowToast?.({ tone: 'error', message: 'Пароли не совпадают' });
      return;
    }

    setPasswordLoading(true);
    try {
      const payload: ChangePasswordPayload = {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      };

      const result = await onChangePassword(payload);
      if (result.error) {
        onShowToast?.({ tone: 'error', message: result.error });
        return;
      }
      if (result.success) {
        onShowToast?.({ tone: 'success', message: 'Пароль изменён' });
        setShowPasswordForm(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err: any) {
      onShowToast?.({ tone: 'error', message: err?.message || 'Не удалось изменить пароль' });
    } finally {
      setPasswordLoading(false);
    }
  }, [onChangePassword, passwordForm, onShowToast]);

  // Установка email для Telegram-пользователей
  const handleSetEmail = useCallback(async () => {
    if (!onSetEmail) return;

    if (!setEmailForm.email) {
      onShowToast?.({ tone: 'error', message: 'Введите email' });
      return;
    }

    if (setEmailForm.password.length < 8) {
      onShowToast?.({ tone: 'error', message: 'Пароль должен содержать минимум 8 символов' });
      return;
    }

    if (setEmailForm.password !== setEmailForm.confirmPassword) {
      onShowToast?.({ tone: 'error', message: 'Пароли не совпадают' });
      return;
    }

    setSetEmailLoading(true);
    try {
      const result = await onSetEmail({
        email: setEmailForm.email,
        password: setEmailForm.password,
      });
      if (result.error) {
        onShowToast?.({ tone: 'error', message: result.error });
        return;
      }
      if (result.success) {
        onShowToast?.({ tone: 'success', message: 'Email установлен! Теперь вы можете входить по email' });
        setShowSetEmailForm(false);
        setSetEmailForm({ email: '', password: '', confirmPassword: '' });
      }
    } catch (err: any) {
      onShowToast?.({ tone: 'error', message: err?.message || 'Не удалось установить email' });
    } finally {
      setSetEmailLoading(false);
    }
  }, [onSetEmail, setEmailForm, onShowToast]);

  const loadOrders = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      // Запрашиваем на 1 больше, чтобы понять есть ли следующая страница
      const items = await listOrders({
        limit: ORDERS_PER_PAGE + 1,
        offset: pageNum * ORDERS_PER_PAGE,
      });
      // Если получили больше ORDERS_PER_PAGE — есть ещё страницы
      setHasMore(items.length > ORDERS_PER_PAGE);
      // Показываем только ORDERS_PER_PAGE элементов
      setOrders(items.slice(0, ORDERS_PER_PAGE));
    } catch (err) {
      console.error('Ошибка загрузки заказов:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadOrders(page);
    }
  }, [user, page, loadOrders]);

  const openOrderDetails = async (orderId: string) => {
    setLoadingOrder(true);
    try {
      const details = await getOrder(orderId);
      setSelectedOrder(details);
    } catch (err) {
      console.error('Ошибка загрузки заказа:', err);
    } finally {
      setLoadingOrder(false);
    }
  };

  // Показываем загрузку пока проверяем авторизацию
  if (authLoading) {
    return (
      <div className="profile-empty">
        <Loader2 size={48} className="spinner" />
        <p>Загрузка профиля...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-empty">
        <User size={64} strokeWidth={1} />
        <h2>Войдите в аккаунт</h2>
        <p>Чтобы просматривать свои заказы и управлять профилем</p>
        <button className="button button--primary" onClick={onOpenAuth}>
          Войти
        </button>
      </div>
    );
  }

  const initials = user.firstName.charAt(0).toUpperCase();

  return (
    <div className="profile">
      {/* Шапка профиля */}
      <header className="profile-header">
        <div className="profile-header__main">
          <div className="profile-avatar">
            <span>{initials}</span>
          </div>
          <div className="profile-info">
            <h1 className="profile-name">
              {user.firstName} {user.lastName || ''}
            </h1>
            <div className="profile-meta">
              {user.email && (
                <span className="profile-meta__item">
                  <Mail size={14} />
                  {user.email}
                </span>
              )}
              {/* Telegram статус inline */}
              {isTelegramLinked ? (
                <span className="profile-meta__item profile-meta__item--tg">
                  <Send size={14} />
                  @{user.username || 'Telegram'}
                  {canUnlink && onTelegramUnlink && (
                    <button
                      className="profile-meta__tg-unlink"
                      onClick={openUnlinkDialog}
                      disabled={tgLoading}
                      title="Отвязать Telegram"
                    >
                      <Unlink size={12} />
                    </button>
                  )}
                </span>
              ) : onTelegramLink && (
                <button
                  className="profile-meta__item profile-meta__item--tg-link"
                  onClick={() => setShowTgWidget(true)}
                  disabled={tgLoading}
                >
                  <Send size={14} />
                  Привязать Telegram
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="profile-header__actions">
          {/* Редактировать профиль */}
          {onUpdateProfile && (
            <button className="profile-action-btn" onClick={startEditingProfile} title="Редактировать профиль">
              <Edit3 size={16} />
              <span>Редактировать</span>
            </button>
          )}

          {/* Для пользователей с email — изменить пароль */}
          {user.email && onChangePassword && (
            <button className="profile-action-btn" onClick={() => setShowPasswordForm(true)} title="Изменить пароль">
              <Lock size={16} />
              <span>Пароль</span>
            </button>
          )}

          {/* Для Telegram-пользователей без email — добавить email */}
          {!user.email && onSetEmail && (
            <button className="profile-action-btn profile-action-btn--accent" onClick={() => setShowSetEmailForm(true)} title="Добавить email для входа">
              <Mail size={16} />
              <span>Добавить Email</span>
            </button>
          )}

          <button className="profile-action-btn profile-action-btn--danger" onClick={onLogout} title="Выйти из аккаунта">
            <LogOut size={16} />
            <span>Выйти</span>
          </button>
        </div>
      </header>

      {/* Telegram Widget Popup */}
      {showTgWidget && onTelegramLink && (
        <div className="tg-widget-popup-backdrop" onClick={() => setShowTgWidget(false)}>
          <div className="tg-widget-popup" onClick={(e) => e.stopPropagation()}>
            <button className="tg-widget-popup__close" onClick={() => setShowTgWidget(false)}>
              <X size={18} />
            </button>
            <div className="tg-widget-popup__icon">
              <Send size={24} />
            </div>
            <h4 className="tg-widget-popup__title">Привязать Telegram</h4>
            <p className="tg-widget-popup__text">
              Для быстрого входа и уведомлений о заказах
            </p>
            <div className="tg-widget-popup__widget">
              {tgLoading ? (
                <div className="tg-widget-popup__loading">
                  <Loader2 size={24} className="spinner" />
                </div>
              ) : (
                <TelegramLoginButton
                  botName={TELEGRAM_BOT_NAME}
                  onAuth={handleTelegramAuth}
                  buttonSize="large"
                  cornerRadius={12}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Диалог слияния аккаунтов */}
      {showMergeDialog && (
        <div className="merge-dialog-backdrop" onClick={handleMergeCancel}>
          <div className="merge-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="merge-dialog__icon">
              <AlertTriangle size={32} />
            </div>
            <h4 className="merge-dialog__title">Telegram уже используется</h4>
            <p className="merge-dialog__text">
              Этот Telegram привязан к другому аккаунту. Объединить аккаунты? Заказы будут перенесены.
            </p>
            <div className="merge-dialog__actions">
              <button className="merge-dialog__btn merge-dialog__btn--cancel" onClick={handleMergeCancel} disabled={tgLoading}>
                <X size={16} />
                Отмена
              </button>
              <button className="merge-dialog__btn merge-dialog__btn--confirm" onClick={handleMergeConfirm} disabled={tgLoading}>
                {tgLoading ? <Loader2 size={16} className="spinner" /> : <Link2 size={16} />}
                Объединить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Диалог подтверждения отвязки Telegram */}
      {showUnlinkDialog && (
        <div className="merge-dialog-backdrop" onClick={() => !tgLoading && setShowUnlinkDialog(false)}>
          <div className="merge-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="merge-dialog__icon merge-dialog__icon--warning">
              <Unlink size={32} />
            </div>
            <h4 className="merge-dialog__title">Отвязать Telegram?</h4>
            <p className="merge-dialog__text">
              После отвязки вы не сможете входить через Telegram. Для входа используйте email и пароль.
            </p>
            <div className="merge-dialog__actions">
              <button className="merge-dialog__btn merge-dialog__btn--cancel" onClick={() => setShowUnlinkDialog(false)} disabled={tgLoading}>
                <X size={16} />
                Отмена
              </button>
              <button className="merge-dialog__btn merge-dialog__btn--danger" onClick={handleTelegramUnlinkConfirm} disabled={tgLoading}>
                {tgLoading ? <Loader2 size={16} className="spinner" /> : <Unlink size={16} />}
                Отвязать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования профиля */}
      {editingProfile && (
        <div className="profile-modal-backdrop" onClick={() => !profileLoading && setEditingProfile(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <button className="profile-modal__close" onClick={() => setEditingProfile(false)} disabled={profileLoading}>
              <X size={18} />
            </button>
            <div className="profile-modal__header">
              <Edit3 size={22} />
              <h3>Редактировать профиль</h3>
            </div>
            <div className="profile-modal__form">
              <div className="profile-modal__field">
                <label>Имя</label>
                <input
                  type="text"
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))}
                  placeholder="Введите имя"
                />
              </div>
              <div className="profile-modal__field">
                <label>Фамилия</label>
                <input
                  type="text"
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))}
                  placeholder="Введите фамилию"
                />
              </div>
              {user.email && (
                <div className="profile-modal__field">
                  <label>Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="Введите email"
                  />
                </div>
              )}
            </div>
            <div className="profile-modal__actions">
              <button className="profile-modal__btn profile-modal__btn--secondary" onClick={() => setEditingProfile(false)} disabled={profileLoading}>
                Отмена
              </button>
              <button className="profile-modal__btn profile-modal__btn--primary" onClick={handleSaveProfile} disabled={profileLoading}>
                {profileLoading ? <Loader2 size={16} className="spinner" /> : <Check size={16} />}
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно изменения пароля */}
      {showPasswordForm && (
        <div className="profile-modal-backdrop" onClick={() => !passwordLoading && setShowPasswordForm(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="profile-modal__close"
              onClick={() => {
                setShowPasswordForm(false);
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
              }}
              disabled={passwordLoading}
            >
              <X size={18} />
            </button>
            <div className="profile-modal__header">
              <Lock size={22} />
              <h3>Изменить пароль</h3>
            </div>
            <div className="profile-modal__form">
              <div className="profile-modal__field">
                <label>Текущий пароль</label>
                <div className="profile-modal__password-wrap">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                    placeholder="Введите текущий пароль"
                  />
                  <button type="button" className="profile-modal__eye" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="profile-modal__field">
                <label>Новый пароль</label>
                <div className="profile-modal__password-wrap">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                    placeholder="Минимум 8 символов"
                  />
                  <button type="button" className="profile-modal__eye" onClick={() => setShowNewPassword(!showNewPassword)}>
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="profile-modal__field">
                <label>Подтвердите пароль</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="Повторите пароль"
                />
              </div>
            </div>
            <div className="profile-modal__actions">
              <button
                className="profile-modal__btn profile-modal__btn--secondary"
                onClick={() => {
                  setShowPasswordForm(false);
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                disabled={passwordLoading}
              >
                Отмена
              </button>
              <button className="profile-modal__btn profile-modal__btn--primary" onClick={handleChangePassword} disabled={passwordLoading}>
                {passwordLoading ? <Loader2 size={16} className="spinner" /> : <Check size={16} />}
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно добавления email (для Telegram-пользователей) */}
      {showSetEmailForm && (
        <div className="profile-modal-backdrop" onClick={() => !setEmailLoading && setShowSetEmailForm(false)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="profile-modal__close"
              onClick={() => {
                setShowSetEmailForm(false);
                setSetEmailForm({ email: '', password: '', confirmPassword: '' });
              }}
              disabled={setEmailLoading}
            >
              <X size={18} />
            </button>
            <div className="profile-modal__header">
              <Mail size={22} />
              <h3>Добавить Email</h3>
            </div>
            <p className="profile-modal__hint">
              После добавления вы сможете входить как через Telegram, так и по email/паролю.
            </p>
            <div className="profile-modal__form">
              <div className="profile-modal__field">
                <label>Email</label>
                <input
                  type="email"
                  value={setEmailForm.email}
                  onChange={(e) => setSetEmailForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="your@email.com"
                />
              </div>
              <div className="profile-modal__field">
                <label>Пароль</label>
                <div className="profile-modal__password-wrap">
                  <input
                    type={showSetEmailPassword ? 'text' : 'password'}
                    value={setEmailForm.password}
                    onChange={(e) => setSetEmailForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Минимум 8 символов"
                  />
                  <button type="button" className="profile-modal__eye" onClick={() => setShowSetEmailPassword(!showSetEmailPassword)}>
                    {showSetEmailPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="profile-modal__field">
                <label>Подтвердите пароль</label>
                <input
                  type="password"
                  value={setEmailForm.confirmPassword}
                  onChange={(e) => setSetEmailForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="Повторите пароль"
                />
              </div>
            </div>
            <div className="profile-modal__actions">
              <button
                className="profile-modal__btn profile-modal__btn--secondary"
                onClick={() => {
                  setShowSetEmailForm(false);
                  setSetEmailForm({ email: '', password: '', confirmPassword: '' });
                }}
                disabled={setEmailLoading}
              >
                Отмена
              </button>
              <button className="profile-modal__btn profile-modal__btn--primary" onClick={handleSetEmail} disabled={setEmailLoading}>
                {setEmailLoading ? <Loader2 size={16} className="spinner" /> : <Check size={16} />}
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Заказы */}
      <section className="profile-orders">
        <h2 className="profile-section-title">
          <Package size={20} />
          Мои заказы
        </h2>

        {loading ? (
          <div className="profile-orders__loading">
            <Loader2 size={32} className="spinner" />
            <p>Загрузка заказов...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="profile-orders__empty">
            <ShoppingBag size={48} strokeWidth={1} />
            <p>У вас пока нет заказов</p>
            <button className="button button--primary" onClick={() => onNavigate('/')}>
              Перейти в каталог
            </button>
          </div>
        ) : (
          <>
            <div className="profile-orders__list">
              {orders.map((order) => {
                const status = STATUS_LABELS[order.status] || STATUS_LABELS.created;
                return (
                  <div
                    key={order.orderId}
                    className="order-card"
                    onClick={() => openOrderDetails(order.orderId)}
                  >
                    <div className="order-card__header">
                      <span className="order-card__id">#{order.orderId}</span>
                      <span
                        className="order-card__status"
                        style={{ color: status.color }}
                      >
                        {status.label}
                      </span>
                    </div>
                    <div className="order-card__body">
                      <div className="order-card__row">
                        <Clock size={14} />
                        <span>{formatDate(order.createdAt)}</span>
                      </div>
                      <div className="order-card__row">
                        <MapPin size={14} />
                        <span>{DELIVERY_LABELS[order.deliveryMethod]}</span>
                      </div>
                    </div>
                    <div className="order-card__footer">
                      <span className="order-card__total">{formatCurrency(order.total)}</span>
                      <ChevronRight size={18} className="order-card__arrow" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Пагинация — показываем только если есть больше страниц */}
            {(page > 0 || hasMore) && (
              <div className="profile-orders__pagination">
                <button
                  className="pagination-btn"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft size={18} />
                  Назад
                </button>
                <span className="pagination-page">Страница {page + 1}</span>
                <button
                  className="pagination-btn"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore}
                >
                  Вперёд
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Модальное окно с деталями заказа */}
      {(selectedOrder || loadingOrder) && (
        <div className="order-modal-backdrop" onClick={() => !loadingOrder && setSelectedOrder(null)}>
          <div className="order-modal" onClick={(e) => e.stopPropagation()}>
            {loadingOrder ? (
              <div className="order-modal__loading">
                <Loader2 size={32} className="spinner" />
                <p>Загрузка заказа...</p>
              </div>
            ) : selectedOrder && (
              <>
                <header className="order-modal__header">
                  <div className="order-modal__header-info">
                    <span className="order-modal__id">#{selectedOrder.orderId}</span>
                    <span
                      className="order-modal__status-badge"
                      style={{ background: STATUS_LABELS[selectedOrder.status]?.color || 'var(--text-muted)' }}
                    >
                      {STATUS_LABELS[selectedOrder.status]?.label || selectedOrder.status}
                    </span>
                  </div>
                  <button className="order-modal__close" onClick={() => setSelectedOrder(null)}>
                    <X size={20} />
                  </button>
                </header>

                <div className="order-modal__body">
                  {/* Информация о заказе */}
                  <section className="order-modal__section">
                    <div className="order-modal__info-grid">
                      <div className="order-modal__info-item">
                        <Clock size={16} />
                        <div>
                          <span className="order-modal__info-label">Дата заказа</span>
                          <span className="order-modal__info-value">{formatDate(selectedOrder.createdAt)}</span>
                        </div>
                      </div>
                      <div className="order-modal__info-item">
                        <User size={16} />
                        <div>
                          <span className="order-modal__info-label">Получатель</span>
                          <span className="order-modal__info-value">{selectedOrder.customerName}</span>
                        </div>
                      </div>
                      <div className="order-modal__info-item">
                        <MapPin size={16} />
                        <div>
                          <span className="order-modal__info-label">Доставка</span>
                          <span className="order-modal__info-value">
                            {DELIVERY_LABELS[selectedOrder.deliveryMethod]}
                            {selectedOrder.address && <><br />{selectedOrder.address}</>}
                          </span>
                        </div>
                      </div>
                    </div>
                    {selectedOrder.comment && (
                      <div className="order-modal__comment">
                        <span className="order-modal__comment-label">Комментарий:</span>
                        <p>{selectedOrder.comment}</p>
                      </div>
                    )}
                  </section>

                  {/* Товары */}
                  <section className="order-modal__section">
                    <h4 className="order-modal__section-title">
                      <Package size={16} />
                      Товары ({selectedOrder.items.length})
                    </h4>
                    <div className="order-modal__items">
                      {selectedOrder.items.map((item, idx) => (
                        <div key={idx} className="order-modal__item">
                          <div className="order-modal__item-info">
                            <span className="order-modal__item-name">{item.productName}</span>
                            <span className="order-modal__item-variant">{item.variantWeight}</span>
                          </div>
                          <span className="order-modal__item-qty">{item.quantity} шт</span>
                          <span className="order-modal__item-price">{formatCurrency(item.total)}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <footer className="order-modal__footer">
                  <div className="order-modal__total">
                    <span>Итого к оплате</span>
                    <span className="order-modal__total-value">{formatCurrency(selectedOrder.total)}</span>
                  </div>
                  <div className="order-modal__actions" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                    {conversations.find(c => c.topic_type === 'order' && String(c.topic_id) === String(selectedOrder.orderId)) ? (
                      <button
                        className="button button--secondary"
                        onClick={() => {
                          const chat = conversations.find(c => c.topic_type === 'order' && String(c.topic_id) === String(selectedOrder.orderId));
                          if (chat) {
                            onNavigate(`/lk/chat/${chat.id}`);
                          }
                        }}
                        style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
                      >
                        <MessageSquare size={16} /> Чат по заказу
                      </button>
                    ) : (
                      <button
                        className="button button--secondary"
                        onClick={() => onNavigate('/lk/chat')}
                        style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
                      >
                        <MessageSquare size={16} /> Написать в поддержку
                      </button>
                    )}
                  </div>
                </footer>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
