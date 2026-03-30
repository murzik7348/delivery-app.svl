import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getOrders, changeOrderStatus, setLocalStatusOverride, purgeOrders } from '../store/slices/ordersSlice';
import { getUsers } from '../store/slices/usersSlice';
import { Clock, MapPin, User, ChevronRight, Phone, CheckCircle2, X, Bell } from 'lucide-react';
import socketService from '../api/socket';
import { formatOrderNumber } from '../utils/formatOrderNumber';

const STATUSES = [
  { id: 0, key: 'created', label: 'Нові', color: 'border-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  { id: 2, key: 'paid', label: 'Оплачено 💰', color: 'border-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  { id: 1, key: 'accepted', label: 'Прийнято', color: 'border-secondary', bg: 'bg-secondary/10', text: 'text-secondary', action: 'generalAccept' },
  { id: 3, key: 'preparing', label: 'Готується', color: 'border-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-400', action: 'confirmRest' },
  { id: 4, key: 'ready_for_pickup', label: 'Готово', color: 'border-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  { id: 5, key: 'delivering', label: 'Доставка', color: 'border-primary', bg: 'bg-primary/10', text: 'text-primary', action: 'pickupCour' },
  { id: 6, key: 'delivered', label: 'Доставлено', color: 'border-success', bg: 'bg-success/10', text: 'text-success', action: 'confirmCour' },
  { id: 7, key: 'canceled', label: 'Скасовано', color: 'border-danger', bg: 'bg-danger/10', text: 'text-danger', action: 'cancelRest' }
];

const getStatusDetails = (status) => {
  const s = String(status).toLowerCase();
  if (s === '0' || s === 'created') return { label: 'New', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
  if (s === '1' || s === 'accepted') return { label: 'Accepted', color: 'bg-secondary/10 text-secondary border-secondary/20' };
  if (s === '2' || s === 'paid') return { label: 'Paid 💰', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
  if (s === '3' || s === 'preparing') return { label: 'Preparing', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
  if (s === '4' || s === 'ready_for_pickup') return { label: 'Ready', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
  if (s === '5' || s === 'delivering') return { label: 'Delivering', color: 'bg-primary/10 text-primary border-primary/20' };
  if (s === '6' || s === 'delivered' || s === 'completed') return { label: 'Delivered', color: 'bg-success/10 text-success border-success/20' };
  if (s === '7' || s === 'canceled') return { label: 'Canceled', color: 'bg-danger/10 text-danger border-danger/20' };
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

function OrderModal({ order, users, onClose }) {
  if (!order) return null;

  // Helper to enrich order with user data
  const userData = users?.find(u => (u.id || u.userId || u._id) === order.userId) || {};

  // Robust name lookup
  const userObj = users?.find(u => Number(u.userId || u.id) === Number(order.userId)) || {};
  const customerName = order.customer?.fullName || order.customer?.name || order.userName || userObj.name || userObj.fullName || 'Guest User';

  // Robust phone lookup
  const customerPhone = getField(order.customer, ['phoneNumber', 'phone']) ||
    getField(order, ['phoneNumber', 'phone', 'userPhone']) ||
    getField(userObj, ['phoneNumber', 'phone', 'contact_phone']) || 'No phone';

  // Robust address lookup & formatting
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

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="glass-panel max-w-2xl w-full p-8 shadow-2xl relative border-borderPrimary shadow-glow-primary">

        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-white">Order {formatOrderNumber(order.deliveryId || order.id)}</h2>
              <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${STATUSES.find(s => s.key.toLowerCase() === order.statusDelivery?.toLowerCase() || Number(s.id) === Number(order.deliveryStatus || order.status))?.bg || 'bg-surface'} ${STATUSES.find(s => s.key.toLowerCase() === order.statusDelivery?.toLowerCase() || Number(s.id) === Number(order.deliveryStatus || order.status))?.color || 'border-borderWhite'} ${STATUSES.find(s => s.key.toLowerCase() === order.statusDelivery?.toLowerCase() || Number(s.id) === Number(order.deliveryStatus || order.status))?.text || 'text-white'}`}>
                {STATUSES.find(s => s.key.toLowerCase() === order.statusDelivery?.toLowerCase() || Number(s.id) === Number(order.deliveryStatus || order.status))?.label || order.statusDelivery || 'Processing'}
              </span>
            </div>
            <p className="text-textSecondary text-sm flex items-center">
              <Clock className="w-4 h-4 mr-1.5" /> Created at {order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : 'Recently'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-surfaceLighter hover:bg-surface border border-borderWhite rounded-full transition-colors">
            <span className="text-white text-xl leading-none">✕</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left Col: Customer Info */}
          <div className="space-y-4">
            <div className="bg-surfaceLighter/50 p-4 rounded-xl border border-borderWhite">
              <h4 className="text-sm font-semibold text-textSecondary uppercase tracking-wider mb-3">Customer details</h4>
              <div className="space-y-3">
                <div className="flex items-center text-white">
                  <User className="w-5 h-5 mr-3 text-primary" />
                  <span className="font-medium">{customerName}</span>
                </div>
                <div className="flex items-center text-white">
                  <Phone className="w-5 h-5 mr-3 text-primary" />
                  <span className="font-medium">{customerPhone}</span>
                </div>
                <div className="flex items-start text-white">
                  <MapPin className="w-5 h-5 mr-3 text-primary mt-0.5" />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {customerAddress || 'No address provided'}
                    </span>
                    {apartment && (
                      <span className="text-xs text-textSecondary">Apt: {apartment}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Order Items */}
          <div className="bg-surfaceLighter p-4 rounded-xl border border-borderWhite flex flex-col">
            <h4 className="text-sm font-semibold text-textSecondary uppercase tracking-wider mb-3">Order Items</h4>
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center pb-3 border-b border-borderWhite last:border-0 last:pb-0">
                  <div className="flex items-center">
                    <span className="bg-surface px-2 py-0.5 rounded text-primary text-xs font-bold mr-3">{item.quantity || item.qty || item.count || 1}x</span>
                    <span className="text-white text-sm">{item.productName || item.name || item.product?.name || `Product #${item.productId || item.id}`}</span>
                  </div>
                  <span className="text-white font-medium text-sm">{(item.price || item.product?.price || 0) * (item.quantity || item.qty || item.count || 1)} ₴</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center bg-surface p-4 rounded-lg border border-borderWhite">
              <span className="text-textSecondary uppercase tracking-wider text-sm font-bold">Total</span>
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
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Helper to enrich order with user data
  const getUserForOrder = (userId) => users.find(u => (u.id || u.userId || u._id) === userId);

  // Robust filtering: Hide orders created before the last "Nuke" action
  const lastNukeAt = localStorage.getItem('last_orders_nuke_at');
  const visibleOrders = orders.filter(o => {
    if (!lastNukeAt) return true;
    const orderDate = o.createdAt ? new Date(o.createdAt).getTime() : 0;
    return orderDate > Number(lastNukeAt);
  });


  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(e => console.warn('Audio playback failed:', e));
    } catch (e) {
      console.error('Sound error:', e);
    }
  };

  useEffect(() => {
    // Initial fetch
    dispatch(getOrders(null));
    dispatch(getUsers({ page: 1, pageSize: 200 }));

    // Real-time polling (replacing WebSockets since backend doesn't support them)
    const interval = setInterval(() => {
      dispatch(getOrders(null));
    }, 30000); // Reduced to 30s to prevent Vite ENOENT errors

    // Listen for real-time events (preserved if backend later supports sockets)
    // socketService.connect(); // Disabled: backend tech mismatch

    /*
    socketService.on('new_delivery', (data) => {
      console.log('🔔 New delivery received via socket:', data);
      dispatch(getOrders(null));
      playNotificationSound();
      
      if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('New Order!', {
          body: `Order #${data.id?.substring(0, 8)} received`,
          icon: '/vite.svg'
        });
      }
    });

    socketService.on('delivery_updated', (data) => {
      console.log('🔄 Delivery updated via socket:', data);
      dispatch(getOrders(null));
    });
    */

    return () => {
      clearInterval(interval);
      /*
      socketService.off('new_delivery');
      socketService.off('delivery_updated');
      socketService.off('delivery_deleted');
      */
    };
  }, [dispatch]);


  const moveOrder = (orderId, newStatusId, oldStatusId, backendAction) => {
    dispatch(setLocalStatusOverride({ orderId, newStatusId }));
    dispatch(changeOrderStatus({ orderId, newStatusId, oldStatusId, backendAction }));
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
            onClick={() => {
              if (window.confirm('WARNING: This will HIDE all current orders from your view permanently to give you a fresh start. New orders will still appear. Proceed?')) {
                // Set timestamp to NOW
                const now = Date.now();
                localStorage.setItem('last_orders_nuke_at', now.toString());

                // Also try to hit the "purge" thunk for any potential backend cancellation
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
                {visibleOrders.filter(o =>
                  (o.statusDelivery?.toLowerCase() === column.key.toLowerCase()) ||
                  Number(o.deliveryStatus || o.status) === Number(column.id)
                ).map((order) => {
                  const currentIdx = STATUSES.findIndex(s =>
                    s.key.toLowerCase() === order.statusDelivery?.toLowerCase() ||
                    Number(s.id) === Number(order.deliveryStatus || order.status)
                  );
                  return (
                    <div
                      key={order.deliveryId || order.id || idx}
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
                          {order.items?.map(i => `${i.quantity || i.qty || 1}x ${i.productName || i.name}`).join(', ')}
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
