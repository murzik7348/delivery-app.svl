import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Sidebar from './Sidebar';
import Toast from './Toast';
import { Bell, X } from 'lucide-react';
import { getRestaurantInfo, updateRestaurantStatus } from '../api/restaurant';
import { fetchOrders, clearNotifications } from '../store/slices/restaurantOrdersSlice';

function HeaderStatusToggle() {
  const [isOpen, setIsOpen] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    getRestaurantInfo()
      .then(data => {
        const info = Array.isArray(data) ? data[0] : data;
        setIsOpen(info?.isOpen ?? info?.isActive ?? true);
      })
      .catch(() => setIsOpen(true));
  }, []);

  const toggle = async () => {
    if (isOpen === null || updating) return;
    setUpdating(true);
    const next = !isOpen;
    setIsOpen(next);
    try {
      await updateRestaurantStatus(next);
    } catch {
      setIsOpen(!next);
    } finally {
      setUpdating(false);
    }
  };

  if (isOpen === null) {
    return <div className="w-32 h-9 glass-panel animate-pulse rounded-full" />;
  }

  return (
    <div className={`flex items-center glass-panel px-4 py-1.5 gap-3 transition-all duration-300 ${isOpen ? 'border-success/30' : 'border-danger/30'}`}>
      <span className="text-sm font-medium text-white">Статус</span>
      <button
        onClick={toggle}
        disabled={updating}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none disabled:opacity-60 ${isOpen ? 'bg-success shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-danger/60'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-300 ${isOpen ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
      <span className={`text-sm font-bold transition-colors ${isOpen ? 'text-success' : 'text-danger'}`}>
        {isOpen ? 'ВІДЧИНЕНО' : 'ЗАЧИНЕНО'}
      </span>
    </div>
  );
}

export default function Layout() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { notifications } = useSelector(state => state.restaurantOrders);
  const [showNotifications, setShowNotifications] = useState(false);
  const audioRef = useRef(null);
  const lastNotifCount = useRef(notifications.length);

  useEffect(() => {
    dispatch(fetchOrders());
    const id = setInterval(() => {
      dispatch(fetchOrders());
    }, 15000);
    return () => clearInterval(id);
  }, [dispatch]);

  // Status Sync Notification Handler
  useEffect(() => {
    if (notifications.length > lastNotifCount.current) {
      console.log('🔔 [Sync] Detected new event from server, alerting manager...');
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.warn('Audio play blocked:', e));
      }
    }
    lastNotifCount.current = notifications.length;
  }, [notifications]);

  const pageTitle = location.pathname.split('/')[1] || 'Dashboard';
  const displayTitle = pageTitle === 'dashboard' ? 'Панель ресторану 🍽️'
    : pageTitle.charAt(0).toUpperCase() + pageTitle.slice(1);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Audio alert for server synchronization events */}
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />
      <Sidebar />

      <div className="ml-64 flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-20 bg-background/80 backdrop-blur-md border-b border-borderWhite flex items-center justify-between px-8 sticky top-0 z-20">

          <div className="flex items-center">
            <h2 className="text-2xl font-bold text-white tracking-tight">{displayTitle}</h2>
          </div>

          <div className="flex items-center space-x-4">
            {/* Live Restaurant Status Toggle */}
            <HeaderStatusToggle />

            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-textSecondary hover:text-white transition-colors rounded-full hover:bg-surfaceLighter"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center bg-primary text-white text-[9px] font-bold rounded-full border-2 border-background animate-pulse shadow-glow-primary">
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Server Sync Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-4 w-80 glass-panel border-borderWhite/50 shadow-2xl p-0 overflow-hidden z-50">
                  <div className="p-4 border-b border-borderWhite flex justify-between items-center bg-surfaceLighter/40">
                    <h3 className="font-bold text-white text-xs uppercase tracking-widest">Серверні події</h3>
                    <div className="flex gap-2">
                       <button onClick={() => dispatch(clearNotifications())} className="text-[10px] text-textSecondary hover:text-white underline">Очистити</button>
                       <button onClick={() => setShowNotifications(false)}><X className="w-4 h-4 text-textSecondary" /></button>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-textSecondary text-sm italic">Немає нових подій</div>
                    ) : (
                      notifications.map((notif) => (
                        <div key={notif.id} className="p-4 border-b border-borderWhite/30 hover:bg-white/5 transition-colors cursor-default">
                          <p className="text-sm text-white font-medium">{notif.message}</p>
                          <p className="text-[10px] text-textSecondary mt-1">
                            {new Date(notif.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
      <Toast />
    </div>
  );
}
