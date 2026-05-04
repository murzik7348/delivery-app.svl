import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getOrders, changeOrderStatus, setLocalStatusOverride, purgeOrders, updateOrder, clearAllOverrides } from '../store/slices/ordersSlice';
import { getUsers } from '../store/slices/usersSlice';
import { getProducts } from '../store/slices/catalogSlice';
import { Clock, MapPin, User, ChevronRight, Phone, CheckCircle2, X, Bell, RefreshCcw } from 'lucide-react';
import socketService from '../api/socket';
import { formatOrderNumber } from '../utils/formatOrderNumber';

const STATUSES = [
  { id: 0, key: 'created', label: 'Нові', color: 'border-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  { id: 1, key: 'accepted', label: 'Прийнято', color: 'border-secondary', bg: 'bg-secondary/10', text: 'text-secondary', action: 'generalAccept' },
  { id: 2, key: 'preparing', label: 'Готується', color: 'border-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-400', action: 'confirmRest' },
  { id: 3, key: 'ready_for_pickup', label: 'Готово', color: 'border-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-400', action: 'confirmRest' },
  { id: 4, key: 'delivering', label: 'Доставка', color: 'border-primary', bg: 'bg-primary/10', text: 'text-primary', action: 'pickupCour' },
  { id: 5, key: 'delivered', label: 'Доставлено', color: 'border-success', bg: 'bg-success/10', text: 'text-success', action: 'confirmCour' },
  { id: 6, key: 'canceled', label: 'Скасовано', color: 'border-danger', bg: 'bg-danger/10', text: 'text-danger', action: 'cancelRest' }
];

const getStatusDetails = (status) => {
  const s = String(status).toLowerCase();
  if (s === '0' || s === 'created') return { label: 'New', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
  if (s === '1' || s === 'accepted') return { label: 'Accepted', color: 'bg-secondary/10 text-secondary border-secondary/20' };
  if (s === '2' || s === 'preparing') return { label: 'Preparing', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
  if (s === '3' || s === 'ready_for_pickup') return { label: 'Ready', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
  if (s === '4' || s === 'delivering' || s === 'picked_up') return { label: 'Delivering', color: 'bg-primary/10 text-primary border-primary/20' };
  if (s === '5' || s === 'delivered' || s === 'completed') return { label: 'Delivered', color: 'bg-success/10 text-success border-success/20' };
  if (s === '6' || s === 'canceled') return { label: 'Canceled', color: 'bg-danger/10 text-danger border-danger/20' };
  return { label: status, color: 'bg-borderWhite/10 text-textSecondary border-borderWhite/20' };
};

// Fallback lookup helper for data that might be named differently
const getField = (obj, fields) => {
  if (!obj) return null;
  for (const f of fields) {
    if (obj[f]) return obj[f];
  }
  return null;
};

const parseIngs = (desc = '') => {
  const match = desc.match(/\[INGS:(.*?)\]/);
  return match ? match[1].split(',').filter(Boolean) : [];
};

function OrderModal({ order, users, catalogProducts, onClose }) {
  const dispatch = useDispatch();
  const [description, setDescription] = useState(order?.description || '');
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when order changes (e.g. opened new order)
  useEffect(() => {
    setDescription(order?.description || '');
  }, [order?.id, order?.deliveryId, order?.description]);

  if (!order) return null;

  // Helper to enrich order with user data
  const userObj = users?.find(u => Number(u.userId || u.id) === Number(order.userId)) || {};
  const customerName = order.customer?.fullName || order.customer?.name || order.userName || userObj.name || userObj.fullName || 'Guest User';

  const customerPhone = getField(order.customer, ['phoneNumber', 'phone']) ||
    getField(order, ['phoneNumber', 'phone', 'userPhone']) ||
    getField(userObj, ['phoneNumber', 'phone', 'contact_phone']) || 'No phone';

  let customerAddress = null;
  const addr = order.address || order.customerAddress || order.deliveryAddress ||
    order.addressText || userObj.address || userObj.deliveryAddress || userObj.addressText;

  if (typeof addr === 'string' && addr.trim()) {
    customerAddress = addr;
  } else if (typeof addr === 'object' && addr !== null) {
    customerAddress = `${addr.street || addr.address || addr.title || ''} ${addr.houseNumber || addr.house || ''}`.trim();
  }
  if (!customerAddress) {
    customerAddress = 'Адреса буде доступна після оновлення API';
  }

  const apartment = order.address?.apartment || order.apartment || (typeof addr === 'object' ? addr?.apartment : null);

  const handleSaveDescription = async () => {
    if (description !== order.description) {
      setIsSaving(true);
      try {
        await dispatch(updateOrder({
          orderId: order.deliveryId || order.id,
          data: { description: description }
        })).unwrap();
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="glass-panel max-w-2xl w-full p-8 shadow-2xl relative border-borderPrimary shadow-glow-primary overflow-hidden">
        {/* Decorative background for modal */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex justify-between items-start mb-6 relative">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-white">Замовлення {formatOrderNumber(order.deliveryId || order.id)}</h2>
              <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${STATUSES.find(s => s.key.toLowerCase() === order.statusDelivery?.toLowerCase() || Number(s.id) === Number(order.deliveryStatus || order.status))?.bg || 'bg-surface'} ${STATUSES.find(s => s.key.toLowerCase() === order.statusDelivery?.toLowerCase() || Number(s.id) === Number(order.deliveryStatus || order.status))?.color || 'border-borderWhite'} ${STATUSES.find(s => s.key.toLowerCase() === order.statusDelivery?.toLowerCase() || Number(s.id) === Number(order.deliveryStatus || order.status))?.text || 'text-white'}`}>
                {STATUSES.find(s => s.key.toLowerCase() === order.statusDelivery?.toLowerCase() || Number(s.id) === Number(order.deliveryStatus || order.status))?.label || order.statusDelivery || 'Обробка'}
              </span>
            </div>
            <p className="text-textSecondary text-sm flex items-center">
              <Clock className="w-4 h-4 mr-1.5" /> Створено {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'Нещодавно'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-surfaceLighter hover:bg-surface border border-borderWhite rounded-full transition-colors">
            <X className="w-6 h-6 text-textSecondary" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-3 rounded-xl bg-surface/30 border border-borderWhite/50">
                <div className="p-2 bg-primary/10 rounded-lg"><User className="w-5 h-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-textSecondary uppercase font-bold tracking-wider">Клієнт</p>
                  <p className="text-white font-medium">{customerName}</p>
                  <p className="text-textSecondary text-sm">{customerPhone}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-3 rounded-xl bg-surface/30 border border-borderWhite/50">
                <div className="p-2 bg-secondary/10 rounded-lg"><MapPin className="w-5 h-5 text-secondary" /></div>
                <div>
                  <p className="text-xs text-textSecondary uppercase font-bold tracking-wider">Адреса доставки</p>
                  <p className="text-white font-medium leading-tight">{customerAddress}</p>
                  {apartment && <p className="text-secondary text-sm">Кв/Офіс: {apartment}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs text-textSecondary uppercase font-bold tracking-wider flex items-center gap-2">
                Коментар / Заміни
                {description !== order.description && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
              </h4>
              <div className="relative group">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Введіть заміни або коментар до замовлення..."
                  className="w-full bg-surface border border-borderWhite rounded-xl p-4 text-white text-sm focus:outline-none focus:border-primary transition-all min-h-[120px] resize-none shadow-inner"
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-3">
                  <p className="text-[10px] text-textSecondary italic hidden sm:block">Зберігається вручну.</p>
                  <button
                    onClick={handleSaveDescription}
                    disabled={description === order.description || isSaving}
                    className="text-xs bg-primary hover:bg-primaryHover text-white px-4 py-2 rounded-lg font-bold transition-all disabled:opacity-0 shadow-glow-primary flex items-center gap-2"
                  >
                    {isSaving ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3" />
                    )}
                    Зберегти
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surfaceLighter p-4 rounded-xl border border-borderWhite flex flex-col max-h-[450px]">
            <h4 className="text-sm font-semibold text-textSecondary uppercase tracking-wider mb-3">Склад замовлення</h4>
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
              {order.items?.map((item, idx) => {
                const modifications = item.description?.includes('[INGS:') ? parseIngs(item.description) : [];
                return (
                  <div key={idx} className="pb-3 border-b border-borderWhite last:border-0 last:pb-0">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center">
                        <span className="bg-surface px-2 py-0.5 rounded text-primary text-xs font-bold mr-3">{item.quantity || item.qty || 1}x</span>
                        <span className="text-white text-sm font-medium">{item.productName || item.name || `Товар #${item.productId || item.id}`}</span>
                      </div>
                      <span className="text-white font-medium text-sm">{(item.price || 0) * (item.quantity || 1)} ₴</span>
                    </div>
                    {modifications.length > 0 && (
                      <div className="flex flex-wrap gap-1 ml-9">
                        {modifications.map((ing, i) => (
                          <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded-md border ${ing.startsWith('-') ? 'bg-danger/10 border-danger/30 text-danger/70 line-through' : 'bg-primary/10 border-primary/30 text-primary'}`}>
                            {ing.startsWith('-') ? ing.substring(1) : ing}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center bg-surface p-4 rounded-lg border border-borderWhite">
              <span className="text-textSecondary uppercase tracking-wider text-sm font-bold">Разом</span>
              <span className="text-2xl font-black bg-clip-text text-transparent bg-primary-gradient">{order.totalPrice || order.total || 0} ₴</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const dispatch = useDispatch();
  const { items: orders, isLoading } = useSelector(state => state.orders);
  const { items: users } = useSelector(state => state.users);
  const { products: catalogProducts } = useSelector(state => state.catalog);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSync = async () => {
    setIsRefreshing(true);
    dispatch(clearAllOverrides());
    await dispatch(getOrders(null));
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Helper to enrich order with user data
  const getUserForOrder = (userId) => users.find(u => (u.id || u.userId || u._id) === userId);

  // Robust filtering: Hide orders created before the last "Nuke" action
  const lastNukeAt = localStorage.getItem('last_orders_nuke_at');
  const visibleOrders = orders.filter(o => {
    if (!lastNukeAt) return true;
    const orderDate = o.createdAt ? new Date(o.createdAt).getTime() : 0;
    return orderDate > Number(lastNukeAt);
  });


  useEffect(() => {
    dispatch(getOrders(null));
    dispatch(getUsers({ page: 1, pageSize: 200 }));
    dispatch(getProducts({ page: 1, pageSize: 200 }));

    const interval = setInterval(() => {
      dispatch(getOrders(null));
    }, 15000);

    return () => clearInterval(interval);
  }, [dispatch]);


  const moveOrder = (orderId, newStatusId, oldStatusId, backendAction) => {
    dispatch(setLocalStatusOverride({ orderId, newStatusId }));
    if (backendAction === 'markPaid') {
      dispatch(updateOrder({ orderId, data: { statusPayment: 'success' } }));
    } else {
      dispatch(changeOrderStatus({ orderId, newStatusId, oldStatusId, backendAction }));
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Kanban Board</h2>
          <p className="text-textSecondary text-sm">Drag or click arrows to move orders between stages. Auto-syncs every 15s.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSync}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-surface border border-borderWhite hover:border-primary/50 text-white rounded-xl text-sm font-bold transition-all group"
          >
            <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : 'group-hover:text-primary'}`} />
            {isRefreshing ? 'Syncing...' : 'Sync with Server'}
          </button>
          <button
            onClick={() => {
              if (window.confirm('WARNING: This will HIDE all current orders from your view permanently to give you a fresh start. New orders will still appear. Proceed?')) {
                const now = Date.now();
                localStorage.setItem('last_orders_nuke_at', now.toString());
                const allIds = visibleOrders.map(o => o.deliveryId || o.id);
                if (allIds.length > 0) {
                  dispatch(purgeOrders(allIds));
                }
                window.location.reload();
              }
            }}
            className="px-4 py-2 bg-danger text-white border border-danger/30 hover:bg-danger/80 rounded-xl text-sm font-bold transition-all shadow-glow-danger"
          >
            ⚠️ Nuke Current Orders
          </button>
        </div>
      </div>

      {isLoading && orders.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        </div>
      ) : (
        <div className="flex-1 flex gap-6 overflow-x-auto pb-4 kanban-column items-start">
          {STATUSES.map(column => (
            <div key={column.id} className="min-w-[340px] max-w-[340px] flex flex-col h-full bg-surface/50 border border-borderWhite rounded-2xl p-4">

              <div className="flex items-center justify-between mb-4 pb-3 border-b border-borderWhite">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${column.bg.replace('/10', '')} shadow-[0_0_8px_${column.bg.replace('bg-', '').replace('/10', '')}]`} />
                  <h3 className={`font-bold text-lg ${column.text}`}>{column.label}</h3>
                </div>
                <span className="bg-surface text-white text-xs py-1 px-3 rounded-full font-bold border border-borderWhite">
                  {visibleOrders.filter(o => (o.statusDelivery?.toLowerCase() === column.key.toLowerCase()) || Number(o.deliveryStatus || o.status) === Number(column.id)).length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 kanban-column pr-1">
                {visibleOrders.filter(o => {
                  const sMap = {
                    created: 0, accepted: 1, restaurant_confirmed: 1,
                    paid: 2, preparing: 3, ready_for_pickup: 4, ready: 4,
                    picked_up: 5, delivering: 5, delivered: 6, completed: 6,
                    canceled: 7, cancelled: 7
                  };
                  let sNum = Number(o.deliveryStatus || o.status);
                  if (isNaN(sNum) || (o.deliveryStatus == null && o.status == null) || (typeof o.status === 'string' && isNaN(Number(o.status)))) {
                    const sStr = String(o.statusDelivery || o.status || '').toLowerCase();
                    sNum = sMap[sStr] ?? -1;
                  }

                  return (o.statusDelivery?.toLowerCase() === column.key.toLowerCase()) ||
                    Number(sNum) === Number(column.id);
                }).map((order) => {
                  const sMap = {
                    created: 0, accepted: 1, restaurant_confirmed: 1,
                    preparing: 2, ready_for_pickup: 3, ready: 3,
                    picked_up: 4, delivering: 4, delivered: 5, completed: 5,
                    canceled: 6, cancelled: 6
                  };
                  let sNum = Number(order.deliveryStatus || order.status);
                  if (isNaN(sNum) || (order.deliveryStatus == null && order.status == null) || (typeof order.status === 'string' && isNaN(Number(order.status)))) {
                    const sStr = String(order.statusDelivery || order.status || '').toLowerCase();
                    sNum = sMap[sStr] ?? -1;
                  }

                  const currentIdx = STATUSES.findIndex(s =>
                    s.key.toLowerCase() === order.statusDelivery?.toLowerCase() ||
                    Number(s.id) === Number(sNum)
                  );
                  return (
                    <div
                      key={order.deliveryId || order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="glass-panel p-4 cursor-pointer hover:border-borderPrimary hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${column.bg.replace('/10', '')}`} />

                      <div className="flex justify-between items-start mb-3">
                        <span className="font-black text-white text-lg">{formatOrderNumber(order.deliveryId || order.id)}</span>
                        <div className="flex items-center text-textSecondary text-xs bg-surface px-2 py-1 rounded-md border border-borderWhite">
                          <Clock className="w-3 h-3 mr-1" />
                          {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'New'}
                        </div>
                      </div>

                      <div className="space-y-2 mb-4 text-[13px]">
                        <p className="text-white font-medium flex items-center">
                          <User className="w-3.5 h-3.5 mr-2 text-primary" />
                          {order.customer?.fullName || order.customer?.name || order.userName || getUserForOrder(order.userId)?.name || 'Guest User'}
                        </p>
                        <p className="text-textSecondary flex items-center">
                          <Phone className="w-3.5 h-3.5 mr-2" />
                          {getField(order.customer, ['phoneNumber', 'phone']) ||
                            getField(order, ['phoneNumber', 'phone']) ||
                            getField(getUserForOrder(order.userId), ['phoneNumber', 'phone']) || 'No phone'}
                        </p>
                        <p className="text-textSecondary flex items-start">
                          <MapPin className="w-3.5 h-3.5 mr-2 mt-0.5" />
                          <span className="line-clamp-2">
                            {(() => {
                              const u = getUserForOrder(order.userId);
                              const addr = order.address || order.customerAddress || order.deliveryAddress || order.addressText || u?.address || u?.deliveryAddress;
                              if (typeof addr === 'string' && addr.trim()) return addr;
                              if (typeof addr === 'object' && addr !== null) {
                                const s = `${addr.street || addr.address || addr.name || addr.title || ''} ${addr.houseNumber || addr.house || ''}`.trim();
                                return s || 'Очікуємо адресу з API';
                              }
                              return 'Очікуємо адресу з API';
                            })()}
                          </span>
                        </p>
                        <p className="text-textSecondary text-[10px] italic border-t border-borderWhite/50 pt-2 mt-1">
                          {order.items?.map(i => {
                            const mods = i.description?.includes('[INGS:') ? parseIngs(i.description) : [];
                            let text = `${i.quantity || i.qty || 1}x ${i.productName || i.name}`;
                            if (mods.length > 0) {
                              text += ` (${mods.map(m => m.startsWith('-') ? `без ${m.substring(1)}` : m).join(', ')})`;
                            }
                            return text;
                          }).join(', ')}
                        </p>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-borderWhite">
                        <span className="font-bold text-white">{order.totalPrice || order.total || 0} ₴</span>

                        {currentIdx < STATUSES.length - 2 && ( // Show next until Delivered/Canceled
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextIdx = currentIdx + 1;
                              if (STATUSES[nextIdx]) {
                                const oldStatus = Number(order.deliveryStatus ?? STATUSES[currentIdx]?.id ?? currentIdx);
                                moveOrder(order.deliveryId || order.id, STATUSES[nextIdx].id, oldStatus, STATUSES[nextIdx].action);
                              }
                            }}
                            className="text-primary hover:text-white transition-all flex items-center text-sm font-bold bg-primary/10 hover:bg-primary px-3 py-1.5 rounded-lg border border-primary/20"
                          >
                            {STATUSES[currentIdx + 1].label} <ChevronRight className="w-4 h-4 ml-1" />
                          </button>
                        )}

                        {(order.statusDelivery === 'delivered' || order.statusDelivery === 'completed' || order.statusDelivery === 'canceled' || Number(order.deliveryStatus || order.status) >= 6) && (
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${order.statusDelivery === 'delivered' ? 'text-success' : 'text-danger'}`}>
                              {order.statusDelivery}
                            </span>
                            <CheckCircle2 className={`w-5 h-5 ${(order.statusDelivery === 'delivered' || Number(order.deliveryStatus || order.status) === 5) ? 'text-success' : 'text-danger'} opacity-50`} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {visibleOrders.filter(o =>
                  (o.statusDelivery?.toLowerCase() === column.key.toLowerCase()) ||
                  Number(o.deliveryStatus || o.status) === Number(column.id)
                ).length === 0 && (
                    <div className="h-24 border border-dashed border-borderWhite rounded-xl flex items-center justify-center text-textSecondary text-sm bg-surface/30">
                      No orders here
                    </div>
                  )}
              </div>

            </div>
          ))}

          {/* DEBUG: Unclassified Orders Column */}
          {visibleOrders.filter(o => !STATUSES.some(s => s.key.toLowerCase() === o.statusDelivery?.toLowerCase() || Number(s.id) === Number(o.deliveryStatus || o.status))).length > 0 && (
            <div className="min-w-[340px] max-w-[340px] flex flex-col h-full bg-danger/5 border border-danger/20 rounded-2xl p-4 border-dashed">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-danger/20">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-3 bg-danger" />
                  <h3 className="font-bold text-lg text-danger">Unknown Status</h3>
                </div>
                <span className="bg-danger/10 text-danger text-xs py-1 px-3 rounded-full font-bold">
                  {visibleOrders.filter(o => !STATUSES.some(s => s.key === o.statusDelivery || Number(s.id) === Number(o.deliveryStatus || o.status))).length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {visibleOrders.filter(o => !STATUSES.some(s => s.key === o.statusDelivery || Number(s.id) === Number(o.deliveryStatus || o.status))).map((order, idx) => (
                  <div key={order.deliveryId || order.id || `unknown-${idx}`} className="glass-panel p-4 border-danger/20">
                    <p className="text-white font-bold">Order {formatOrderNumber(order.deliveryId || order.id)}</p>
                    <p className="text-danger text-xs mt-1">Status ID: {order.statusDelivery || order.deliveryStatus || order.status || 'undefined/null'}</p>
                    <p className="text-textSecondary text-xs mt-1">This order has a status not defined in the Kanban board.</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <OrderModal
        order={selectedOrder}
        users={users}
        catalogProducts={catalogProducts}
        onClose={() => setSelectedOrder(null)}
      />

      {/* Notifications Prompt - Fixed at bottom */}
      <div className="fixed bottom-6 right-6 z-40 animate-in slide-in-from-bottom-10 duration-500">
        <div className="glass-panel p-4 flex items-center gap-4 border-primary/30 shadow-glow-primary bg-surface/90 backdrop-blur-md">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-white text-sm font-bold">Stay Updated!</p>
            <p className="text-textSecondary text-xs">Enable browser notifications for new orders.</p>
          </div>
          <button
            onClick={() => {
              if ('Notification' in window) {
                Notification.requestPermission();
              }
            }}
            className="bg-primary hover:bg-primaryHover text-white px-4 py-2 rounded-lg text-xs font-bold transition-all"
          >
            Turn on
          </button>
          <button className="text-textSecondary hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
