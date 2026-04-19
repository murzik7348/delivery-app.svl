import { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders, startPreparingOrder, markOrderReady } from '../store/slices/restaurantOrdersSlice';
import { ChefHat, Timer, PackageCheck } from 'lucide-react';
import { getStatusNum, OrderCard } from '../components/SharedOrderComponents';

export default function KitchenPage() {
  const dispatch = useDispatch();
  const { items: orders, isLoading: _isLoading } = useSelector(state => state.restaurantOrders);
  const actionInFlight = useRef(false);

  // Polling is now handled globally in Layout.jsx
  useEffect(() => {
    dispatch(fetchOrders());
  }, [dispatch]);

  const handleStartCooking = useCallback(async (order) => {
    if (actionInFlight.current) return;
    console.log('🚀 [Kitchen] Starting cooking for:', order);
    const orderId = order.deliveryId || order.id;
    actionInFlight.current = true;
    try {
      await dispatch(startPreparingOrder({ orderId }));
    } finally {
      actionInFlight.current = false;
    }
  }, [dispatch]);

  const handleMarkReady = useCallback(async (order) => {
    if (actionInFlight.current) return;
    const orderId = order.deliveryId || order.id;
    actionInFlight.current = true;
    try {
      await dispatch(markOrderReady({ orderId }));
    } finally {
      actionInFlight.current = false;
    }
  }, [dispatch]);

  // Status 1 = Accepted/Confirmed. 
  // Paid orders (Status 2) now go to Dashboard first to be accepted by manager, then they appear here as Status 1.
  const acceptedOrders = orders.filter(o => getStatusNum(o) === 1);
  const preparingOrders = orders.filter(o => getStatusNum(o) === 3);
  const readyOrdersCount = orders.filter(o => getStatusNum(o) === 4).length;

  return (
    <div className="h-full flex flex-col space-y-6 animate-fade-in">
      <div className="flex justify-between items-baseline">
        <h2 className="text-white text-3xl font-black uppercase tracking-tighter italic">
          📦 Кухня <span className="text-primary text-xl">Monitor</span>
        </h2>
        <div className="flex gap-4">
          <div className="px-4 py-2 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary font-bold">
            До готування: {acceptedOrders.length}
          </div>
          <div className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 font-bold">
            У роботі: {preparingOrders.length}
          </div>
          <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold">
            Готово: {readyOrdersCount}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 flex-1">
        {/* Step 1: Queue (Accepted) */}
        <div className="flex flex-col h-full bg-surface/30 border border-borderWhite rounded-3xl p-6 overflow-hidden">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-borderWhite">
            <div className="p-3 rounded-2xl bg-secondary text-white shadow-glow-secondary"><ChefHat className="w-6 h-6" /></div>
            <div>
              <h3 className="text-xl font-bold text-white uppercase tracking-wider">Черга до готування</h3>
              <p className="text-textSecondary text-sm">Прийняті замовлення, які чекають початку</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {acceptedOrders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-30">
                <ChefHat className="w-16 h-16 mb-4" />
                <p className="font-bold">Черга порожня</p>
              </div>
            ) : (
              acceptedOrders.map(order => (
                <OrderCard 
                  key={order.deliveryId || order.id} 
                  order={order} 
                  onStartCooking={handleStartCooking} 
                />
              ))
            )}
          </div>
        </div>

        {/* Step 2: In Production (Preparing) */}
        <div className="flex flex-col h-full bg-surface/30 border border-borderWhite rounded-3xl p-6 overflow-hidden">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-borderWhite">
            <div className="p-3 rounded-2xl bg-primary text-white shadow-glow-primary"><Timer className="w-6 h-6" /></div>
            <div>
              <h3 className="text-xl font-bold text-white uppercase tracking-wider">У процесі приготування</h3>
              <p className="text-textSecondary text-sm">Ці замовлення зараз готуються на кухні</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {preparingOrders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-30">
                <PackageCheck className="w-16 h-16 mb-4" />
                <p className="font-bold">Нічого не готується</p>
              </div>
            ) : (
              preparingOrders.map(order => (
                <OrderCard 
                  key={order.deliveryId || order.id} 
                  order={order} 
                  onMarkReady={handleMarkReady} 
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
