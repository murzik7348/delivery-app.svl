import { CheckCircle2, XCircle, ChefHat, Timer, User, Phone, MapPin, X, Minus, Plus as PlusIcon } from 'lucide-react';
import { useSelector } from 'react-redux';
import { formatOrderNumber } from '../utils/formatOrderNumber';
import { useState, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
export function getElapsedTime(createdAt) {
  if (!createdAt) return '–';
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const totalSec = Math.floor(diffMs / 1000);
  const min = Math.floor(totalSec / 60);
  return `${String(min).padStart(2, '0')}:${String(totalSec % 60).padStart(2, '0')}`;
}

export function getStatusBadge(status) {
  const s = Number(status);
  if (s === 0) return 'bg-blue-500/10 text-blue-400 border-blue-500/20'; // Created
  if (s === 2) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'; // Paid
  if (s === 1) return 'bg-secondary/10 text-secondary border-secondary/20'; // Accepted
  if (s === 3) return 'bg-purple-500/10 text-purple-400 border-purple-500/20'; // Preparing
  if (s === 4) return 'bg-amber-500/10 text-amber-400 border-amber-500/20'; // Ready
  if (s === 5) return 'bg-primary/10 text-primary border-primary/20'; // Delivering
  if (s === 6) return 'bg-success/10 text-success border-success/20'; // Delivered
  if (s === 7) return 'bg-danger/10 text-danger border-danger/20'; // Canceled
  return 'bg-borderWhite/10 text-textSecondary border-borderWhite/20';
}

export function getStatusLabel(status) {
  const s = Number(status);
  if (s === 0) return 'Нове';
  if (s === 2) return 'Оплачено💰';
  if (s === 1) return 'Прийнято';
  if (s === 3) return 'Готується';
  if (s === 4) return 'Готово';
  if (s === 5) return 'Доставка';
  if (s === 6) return 'Доставлено';
  if (s === 7) return 'Скасовано';
  return 'Очікування';
}
export function getTimerColor(createdAt) {
  if (!createdAt) return 'text-textSecondary';
  const diffMin = (Date.now() - new Date(createdAt).getTime()) / 60000;
  if (diffMin < 15) return 'text-success';
  if (diffMin < 25) return 'text-secondary';
  return 'text-danger';
}

export function getItemsSummary(order) {
  if (!order.items?.length) return 'No items';
  return order.items.map(i => `${i.quantity || 1}× ${i.productName || i.name || `#${i.productId}`}`).join(', ');
}

export const STATUS_NUM = {
  created: 0,
  paid: 2,
  accepted: 1,
  preparing: 3,
  ready_for_pickup: 4,
  delivering: 5,
  delivered: 6,
  canceled: 7,
  restaurant_confirmed: 1,
  cancelled: 7,
};

export function getStatusNum(order) {
  if (order.deliveryStatus != null) return Number(order.deliveryStatus);
  if (order.status != null && !isNaN(Number(order.status))) return Number(order.status);
  const s = String(order.statusDelivery || order.status || '').toLowerCase();
  return STATUS_NUM[s] ?? -1;
}

// ─────────────────────────────────────────────────────────────────
// Modals
// ─────────────────────────────────────────────────────────────────
export function AcceptOrderModal({ order, onConfirm, onClose }) {
  const [prepMins, setPrepMins] = useState('');
  const [error, setError] = useState('');
  const statusNum = getStatusNum(order);

  const handleSubmit = () => {
    const n = parseInt(prepMins, 10);
    if (!prepMins || isNaN(n) || n <= 0) {
      setError('Введіть час приготування');
      return;
    }
    onConfirm(n);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="glass-panel max-w-md w-full p-8 border-borderPrimary shadow-glow-primary">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-success/10 text-success">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Прийняти замовлення</h3>
              <p className="text-textSecondary text-sm">{formatOrderNumber(order?.deliveryId || order?.id)}</p>
            </div>
            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${getStatusBadge(statusNum)}`}>
              {getStatusLabel(statusNum)}
            </span>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surfaceLighter transition-colors">
            <X className="w-5 h-5 text-textSecondary" />
          </button>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-semibold text-textSecondary uppercase tracking-wider mb-2">Час приготування (хв)</label>
          <div className="relative">
            <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
            <input
              type="number"
              value={prepMins}
              onChange={(e) => setPrepMins(e.target.value)}
              className="w-full bg-surface/50 border border-borderWhite rounded-xl py-3 pl-11 pr-4 text-white focus:border-primary transition-all outline-none font-bold"
              placeholder="Напр. 25"
              autoFocus
            />
          </div>
          {error && <p className="text-danger text-xs mt-2 font-medium">{error}</p>}
        </div>

        <button onClick={handleSubmit} className="w-full py-4 rounded-xl bg-primary text-white font-bold hover:bg-primaryHover transition-all shadow-glow-primary">
          ПІДТВЕРДИТИ ПРИЙНЯТТЯ
        </button>
      </div>
    </div>
  );
}

const REJECT_REASONS = [
  { id: 'too_busy', label: 'Занадто багато замовлень', emoji: '⏳' },
  { id: 'out_of_stock', label: 'Закінчились інгредієнти', emoji: '🚫' },
  { id: 'closing_soon', label: 'Вже зачиняємось', emoji: '🌙' },
  { id: 'other', label: 'Інша причина', emoji: '❓' },
];

export function RejectOrderModal({ onConfirm, onClose }) {
  const [selectedReason, setSelectedReason] = useState('');
  const handleSubmit = () => {
    if (!selectedReason) return;
    const reason = REJECT_REASONS.find(r => r.id === selectedReason)?.label || selectedReason;
    onConfirm(reason);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="glass-panel max-w-md w-full p-8 border border-danger/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-xl font-bold text-white">Відхилити замовлення</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surfaceLighter transition-colors">
            <X className="w-5 h-5 text-textSecondary" />
          </button>
        </div>
        <div className="space-y-2 mb-6">
          {REJECT_REASONS.map(r => (
            <button
              key={r.id}
              onClick={() => setSelectedReason(r.id)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                selectedReason === r.id ? 'bg-danger/10 border-danger/50 text-white' : 'bg-surface/50 border-borderWhite text-textSecondary'
              }`}
            >
              <span className="text-xl">{r.emoji}</span>
              <span className="font-medium">{r.label}</span>
            </button>
          ))}
        </div>
        <button disabled={!selectedReason} onClick={handleSubmit} className="w-full py-3 rounded-xl bg-danger text-white font-bold hover:bg-danger/90 transition-all disabled:opacity-40">
          ВІДХИЛИТИ
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Order Card
// ─────────────────────────────────────────────────────────────────
export function LiveTimer({ createdAt }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className={`font-mono font-bold text-sm ${getTimerColor(createdAt)} text-emerald-400`}>
      {getElapsedTime(createdAt)}
    </span>
  );
}

export function OrderCard({ order, onAccept, onReject, onStartCooking, onMarkReady }) {
  const statusNum = getStatusNum(order);
  const isUnpaid = statusNum === 0; 
  const isPaid = statusNum === 2;
  const isAccepted = statusNum === 1; // Restaurant Confirmed
  const isPreparing = statusNum === 3;
  const isReady = statusNum === 4;
  const _isDelivering = statusNum === 5;
  
  const diffMin = order.createdAt ? (Date.now() - new Date(order.createdAt).getTime()) / 60000 : 0;
  const isCritical = diffMin >= 25 && [0, 1, 2, 3].includes(statusNum);

  const { catalog } = useSelector(state => state.restaurantOrders);
  const [itemMods, setItemMods] = useState({}); // { itemId: { ingName: 'excluded' | 'extra' | 'normal' } }

  const customerName = order.customer?.fullName || order.customer?.name || order.userName || 'Клієнт';
  const _customerPhone = order.customer?.phoneNumber || order.customer?.phone || order.phoneNumber || '';
  const address = typeof order.address === 'string' ? order.address : order.address?.street ? `${order.address.street} ${order.address.houseNumber || ''}`.trim() : 'Адреса';

  const parseIngs = (desc = '') => {
    const match = desc.match(/\[INGS:(.*?)\]/);
    return match ? match[1].split(',').filter(Boolean) : [];
  };

  const toggleMod = (itemIdx, ing, type) => {
    const key = `${itemIdx}-${ing}`;
    setItemMods(prev => ({
      ...prev,
      [key]: prev[key] === type ? 'normal' : type
    }));
  };

  return (
    <div className={`glass-panel p-5 relative overflow-hidden group transition-all duration-500 
      ${isCritical ? 'border-danger/60 shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse-subtle' : 'hover:border-borderPrimary'}`}>
      
      {isCritical && (
        <div className="absolute top-0 right-10 bg-danger text-white text-[9px] font-black px-3 py-1 rounded-b-lg shadow-glow-danger z-10 animate-fade-in uppercase tracking-tighter">
           Критична затримка ⚠️
        </div>
      )}

      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isCritical ? 'bg-danger' : isPreparing ? 'bg-purple-500' : isAccepted ? 'bg-secondary' : 'bg-success'} rounded-l-2xl transition-colors duration-500`} />

      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="font-black text-white text-base">{formatOrderNumber(order.deliveryId || order.id)}</span>
          {isUnpaid && (
            <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              НЕОПЛАЧЕНО ⚠️
            </span>
          )}
          {isPaid && <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">ОПЛАЧЕНО 💰</span>}
          {isAccepted && <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-secondary bg-secondary/10 px-2 py-0.5 rounded-full border border-secondary/20">ПРИЙНЯТО</span>}
          {isPreparing && <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">ГОТУЄТЬСЯ</span>}
          {isReady && <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">ГОТОВО 📦</span>}
        </div>
        <div className="flex items-center gap-1.5 bg-surface px-2.5 py-1.5 rounded-lg border border-borderWhite">
          <Clock className="w-3 h-3 text-textSecondary" />
          <LiveTimer createdAt={order.createdAt} />
        </div>
      </div>

      <div className="space-y-1.5 mb-4 text-[13px]">
        <div className="flex items-center gap-2 text-white font-medium truncate"><User className="w-3.5 h-3.5 text-primary" />{customerName}</div>
        <div className="flex items-center gap-2 text-textSecondary truncate"><MapPin className="w-3.5 h-3.5 text-primary" />{address}</div>
      </div>

      <div className="bg-surface/50 rounded-xl border border-borderWhite p-4 mb-4 space-y-3">
        {order.items?.map((item, idx) => {
          const product = catalog.find(p => p.id === item.productId || p.name === (item.productName || item.name));
          const baseIngs = parseIngs(product?.description || '');

          return (
            <div key={idx} className="space-y-2 last:mb-0">
               <div className="flex justify-between items-center">
                  <span className="text-white font-bold text-sm">{item.quantity}× {item.productName || item.name}</span>
                  <span className="text-textSecondary text-xs">{item.price} ₴</span>
               </div>
               
               {baseIngs.length > 0 && (
                 <div className="flex flex-wrap gap-1.5">
                    {baseIngs.map(ing => {
                      const mod = itemMods[`${idx}-${ing}`] || 'normal';
                      return (
                        <div key={ing} className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all text-[10px] font-bold uppercase tracking-tighter
                          ${mod === 'excluded' ? 'bg-danger/20 border-danger/40 text-danger/70 line-through' : 
                            mod === 'extra' ? 'bg-secondary/20 border-secondary/40 text-secondary' : 
                            'bg-surfaceLighter/40 border-borderWhite text-textSecondary'}`}>
                           
                           <button onClick={() => toggleMod(idx, ing, 'excluded')} className="hover:scale-125 transition-transform"><Minus className="w-2.5 h-2.5" /></button>
                           <span className="px-0.5">{ing}</span>
                           <button onClick={() => toggleMod(idx, ing, 'extra')} className="hover:scale-125 transition-transform"><PlusIcon className="w-2.5 h-2.5" /></button>
                        </div>
                      );
                    })}
                 </div>
               )}
            </div>
          );
        })}
        {(!order.items || order.items.length === 0) && (
          <p className="text-[11px] text-textSecondary italic">Склад замовлення порожній</p>
        )}
      </div>

      <div className="flex justify-between items-center">
        <span className="font-bold text-white text-base">{order.totalPrice || 0} ₴</span>
        <div className="flex gap-2">
          {(isPaid || isUnpaid) && (
            <>
              <button onClick={() => onReject(order)} className="px-3 py-2 rounded-lg bg-danger/10 text-danger border border-danger/20 hover:bg-danger hover:text-white transition-all text-xs font-bold">ВІДМОВА</button>
              <button onClick={() => onAccept(order)} className="px-3 py-2 rounded-lg bg-success text-white hover:bg-success/90 transition-all text-xs font-bold">ПРИЙНЯТИ</button>
            </>
          )}
          {isAccepted && (
            <button onClick={() => onStartCooking(order)} className="px-6 py-2.5 rounded-xl bg-secondary text-white shadow-glow-secondary hover:bg-secondary/90 transition-all text-sm font-black flex items-center gap-2">
              <ChefHat className="w-4 h-4" /> ПОЧАТИ ГОТУВАННЯ
            </button>
          )}
          {isPreparing && (
            <button onClick={() => onMarkReady(order)} className="px-6 py-2.5 rounded-xl bg-success text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:bg-success/90 transition-all text-sm font-black flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> ПРИГОТОВАНО
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
