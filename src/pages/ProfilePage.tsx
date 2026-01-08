import React, { useEffect, useState, useCallback } from 'react';
import { User, Package, ChevronLeft, ChevronRight, MapPin, Clock, X, Loader2, ShoppingBag, LogOut, Mail, AtSign } from 'lucide-react';
import { UserProfile } from '../types/auth';
import { listOrders, getOrder, OrderListItem, OrderDetails } from '../api';
import { formatCurrency } from '../utils/format';

type Props = {
  user: UserProfile | null;
  authLoading?: boolean;
  onNavigate: (path: string) => void;
  onOpenAuth: () => void;
  onLogout: () => void;
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

export const ProfilePage: React.FC<Props> = ({ user, authLoading = false, onNavigate, onOpenAuth, onLogout }) => {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

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

  const initials = `${user.firstName.charAt(0)}${user.lastName?.charAt(0) || ''}`.toUpperCase();

  return (
    <div className="profile">
      {/* Шапка профиля */}
      <header className="profile-header">
        <div className="profile-header__left">
          <div className="profile-avatar">
            {user.photoUrl ? (
              <img src={user.photoUrl} alt={user.firstName} />
            ) : (
              <span>{initials}</span>
            )}
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
              {user.username && (
                <span className="profile-meta__item">
                  <AtSign size={14} />
                  {user.username}
                </span>
              )}
            </div>
          </div>
        </div>
        <button className="profile-logout" onClick={onLogout}>
          <LogOut size={18} />
          <span>Выйти</span>
        </button>
      </header>

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
                </footer>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
