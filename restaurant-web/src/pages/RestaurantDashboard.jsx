import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders, acceptOrder, rejectOrder, updateRestaurantPhoto } from '../store/slices/restaurantOrdersSlice';
import { ChefHat, TrendingUp, Calendar, Package, Settings, Camera, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { 
  getStatusNum, 
  AcceptOrderModal, 
  RejectOrderModal, 
  OrderCard 
} from '../components/SharedOrderComponents';
import RestaurantToggle from '../components/Layout'; // Note: In our current structure, this is exported from Layout

function ProfileModal({ isOpen, onClose, onSave }) {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 1200;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
          } else {
            if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          }, 'image/jpeg', 0.8);
        };
      };
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const compressed = await compressImage(file);
      setImageFile(compressed);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(compressed);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile) return;
    setIsSubmitting(true);
    try {
      await onSave(imageFile);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="glass-panel max-w-md w-full p-8 border-borderPrimary shadow-glow-primary">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 capitalize">
            <Settings className="w-5 h-5 text-primary" /> Налаштування ресторану
          </h2>
          <button onClick={onClose} className="p-2 text-textSecondary hover:text-white transition-colors"><X /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div 
              className="w-40 h-40 rounded-3xl bg-surfaceLighter border-2 border-dashed border-borderWhite flex items-center justify-center cursor-pointer transition-all hover:border-primary group relative overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <Camera className="w-8 h-8 text-textSecondary mx-auto mb-2" />
                  <span className="text-xs text-textSecondary font-bold">Завантажте нове фото</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*" />
          </div>

          <p className="text-xs text-textSecondary text-center px-4">Це фото буде відображатися клієнтам у списку ресторанів на головній сторінці.</p>

          <button 
            type="submit" 
            disabled={!imageFile || isSubmitting}
            className="w-full py-4 bg-primary text-white font-black rounded-2xl transition-all shadow-glow-primary disabled:opacity-50 disabled:shadow-none hover:translate-y-[-2px] active:scale-95"
          >
            {isSubmitting ? <Loader2 className="animate-spin mx-auto" /> : 'ЗБЕРЕГТИ ЗМІНИ'}
          </button>
        </form>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colorMap = {
    primary: 'text-primary bg-primary/10 border-primary/20 shadow-glow-primary',
    secondary: 'text-secondary bg-secondary/10 border-secondary/20 shadow-glow-secondary',
    success: 'text-success bg-success/10 border-success/20 shadow-glow-success',
    danger: 'text-danger bg-danger/10 border-danger/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]',
  };
  return (
    <div className="glass-panel p-6 flex items-center justify-between group hover:border-borderPrimary transition-all duration-300">
      <div>
        <p className="text-textSecondary text-xs font-bold uppercase tracking-widest mb-1">{title}</p>
        <p className="text-3xl font-black text-white">{value}</p>
      </div>
      <div className={`p-4 rounded-2xl border ${colorMap[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
}

export default function RestaurantDashboard() {
  const dispatch = useDispatch();
  const { items: orders, isLoading: _isLoading } = useSelector(state => state.restaurantOrders);
  const actionInFlight = useRef(false);

  const [acceptModal, setAcceptModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Polling is now handled globally in Layout.jsx
  useEffect(() => {
    dispatch(fetchOrders());
  }, [dispatch]);

  const handleAccept = useCallback((order) => setAcceptModal(order), []);
  const handleReject = useCallback((order) => setRejectModal(order), []);

  const handleConfirmAccept = useCallback(async (prepMinutes) => {
    if (!acceptModal || actionInFlight.current) return;
    const orderId = acceptModal.deliveryId || acceptModal.id;
    setAcceptModal(null);
    actionInFlight.current = true;
    try {
      await dispatch(acceptOrder({ orderId, prepTime: prepMinutes }));
    } finally {
      actionInFlight.current = false;
    }
  }, [acceptModal, dispatch]);

  const handleConfirmReject = useCallback(async (reason) => {
    if (!rejectModal || actionInFlight.current) return;
    const orderId = rejectModal.deliveryId || rejectModal.id;
    setRejectModal(null);
    actionInFlight.current = true;
    try {
      await dispatch(rejectOrder({ orderId, reason }));
    } finally {
      actionInFlight.current = false;
    }
  }, [rejectModal, dispatch]);

  // Filters
  const newOrders = orders.filter(o => [0, 2].includes(getStatusNum(o))); // 0=Created, 2=Paid
  const unpaidOrders = orders.filter(o => getStatusNum(o) === 0);
  const inWorkCount = orders.filter(o => [1, 3, 4].includes(getStatusNum(o))).length;

  const criticalOrdersCount = orders.filter(o => {
    const s = getStatusNum(o);
    if (![0, 1, 2, 3].includes(s)) return false; // Only track before "Ready"
    const diffMin = o.createdAt ? (Date.now() - new Date(o.createdAt).getTime()) / 60000 : 0;
    return diffMin >= 25;
  }).length;

  console.log('📊 [Dashboard] UI State:', { 
    totalItems: orders.length, 
    newItems: newOrders.length, 
    inWork: inWorkCount 
  });

  const today = new Date().toDateString();
  const todayAccepted = orders.filter(o => getStatusNum(o) >= 1 && getStatusNum(o) <= 6 && new Date(o.createdAt).toDateString() === today).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-end">
        <div className="flex-1">
          <h2 className="text-white text-xl font-bold italic">Приймання замовлень 🍽️ <span className="text-xs font-normal text-success">(Версія: Менеджер)</span></h2>
          <p className="text-textSecondary text-sm mt-1">{new Date().toLocaleDateString('uk-UA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* <button 
            onClick={() => setProfileModalOpen(true)}
            className="p-3 bg-surface border border-borderWhite text-textSecondary hover:text-white rounded-2xl transition-all flex items-center gap-2 group"
          >
            <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform" />
            <span className="text-sm font-bold hidden sm:inline">Профіль</span>
          </button> */}
        {unpaidOrders.length > 0 && (
          <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-wider">
            {unpaidOrders.length} Очікують оплати
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Нових до прийняття" value={newOrders.length} icon={Package} color="primary" />
        <StatCard title="Зараз на кухні" value={inWorkCount} icon={ChefHat} color="secondary" />
        <StatCard title="Прийнято сьогодні" value={todayAccepted} icon={TrendingUp} color="success" />
        <StatCard title="Критичні затримки" value={criticalOrdersCount} icon={Calendar} color="danger" />
      </div>

      <div className="glass-panel p-8">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-borderWhite">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20"><Package className="w-6 h-6" /></div>
            <div>
              <h3 className="text-xl font-bold text-white uppercase tracking-wider">Оплачені замовлення</h3>
              <p className="text-textSecondary text-sm">Ці замовлення чекають вашого підтвердження для кухні</p>
            </div>
          </div>
        </div>

        {newOrders.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-6xl mb-6 opacity-40">☕</div>
            <p className="text-xl font-bold text-white">Нових замовлень немає</p>
            <p className="text-textSecondary mt-2">Як тільки клієнт оплатить замовлення, воно з'явиться тут</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xxl:grid-cols-3 gap-6">
            {newOrders.map(order => (
              <OrderCard 
                key={order.deliveryId || order.id} 
                order={order} 
                onAccept={handleAccept} 
                onReject={handleReject} 
              />
            ))}
          </div>
        )}
      </div>

      {acceptModal && (
        <AcceptOrderModal 
          order={acceptModal} 
          onConfirm={handleConfirmAccept} 
          onClose={() => setAcceptModal(null)} 
        />
      )}
      {rejectModal && (
        <RejectOrderModal 
          order={rejectModal} 
          onConfirm={handleConfirmReject} 
          onClose={() => setRejectModal(null)} 
        />
      {/* {profileModalOpen && (
        <ProfileModal 
          isOpen={profileModalOpen} 
          onClose={() => setProfileModalOpen(false)} 
          onSave={async (file) => {
            await dispatch(updateRestaurantPhoto(file)).unwrap();
          }} 
        />
      )} */}
    </div>
  );
}
