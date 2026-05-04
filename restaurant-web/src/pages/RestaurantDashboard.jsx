import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrders, acceptOrder, rejectOrder, startPreparingOrder, markOrderReady, updateRestaurantPhoto, fetchRestaurantInfo, updateRestaurantInfo } from '../store/slices/restaurantOrdersSlice';
import { ChefHat, TrendingUp, Calendar, Package, Settings, Camera, X, Loader2, Image as ImageIcon, MapPin, User, LogOut } from 'lucide-react';
import { 
  getStatusNum, 
  AcceptOrderModal, 
  RejectOrderModal, 
  OrderCard 
} from '../components/SharedOrderComponents';
import { HeaderStatusToggle as RestaurantToggle } from '../components/Layout';

function ProfileModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const { restaurantInfo } = useSelector(state => state.restaurantOrders);
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(restaurantInfo?.imageUrl || '');
  const [imgFit, setImgFit] = useState(localStorage.getItem('restaurant_img_fit') || 'cover');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && restaurantInfo) {
      setName(restaurantInfo.name || '');
      setAddress(restaurantInfo.address || '');
      setImagePreview(restaurantInfo.imageUrl || '');
    }
  }, [isOpen, restaurantInfo]);

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
    setIsSubmitting(true);
    try {
      await dispatch(updateRestaurantInfo({ name, address })).unwrap();
      if (imageFile) {
        const restId = restaurantInfo?.id || 1; 
        await dispatch(updateRestaurantPhoto({ restaurantId: restId, imageFile })).unwrap();
      }
      onClose();
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="glass-panel max-w-md w-full p-8 border-borderPrimary shadow-glow-primary max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-tighter">
            <Settings className="w-6 h-6 text-primary" /> Профіль ресторану
          </h2>
          <button onClick={onClose} className="p-2 bg-surfaceLighter text-textSecondary hover:text-white rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center mb-6">
            <div 
              className="w-40 h-40 rounded-[2.5rem] bg-surfaceLighter border-4 border-white/10 shadow-2xl flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-all overflow-hidden group relative"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} className={`w-full h-full ${imgFit === 'cover' ? 'object-cover' : 'object-contain'} transition-transform group-hover:scale-110 duration-700`} />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center backdrop-blur-[2px]">
                    <Camera className="w-8 h-8 text-white mb-1" />
                    <span className="text-[10px] text-white font-black uppercase tracking-widest">Змінити фото</span>
                  </div>
                </>
              ) : (
                <>
                  <ImageIcon className="w-10 h-10 text-textSecondary mb-2 group-hover:text-primary transition-colors" />
                  <span className="text-[10px] text-textSecondary font-black uppercase tracking-widest text-center px-4">Завантажити логотип</span>
                </>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*" />
            
            {imagePreview && (
              <div className="flex gap-2 mt-4 bg-surfaceLighter p-1 rounded-xl border border-borderWhite">
                <button 
                  type="button"
                  onClick={() => { setImgFit('cover'); localStorage.setItem('restaurant_img_fit', 'cover'); }}
                  className={`flex-1 py-1 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${imgFit === 'cover' ? 'bg-primary text-white shadow-lg' : 'text-textSecondary hover:text-white'}`}
                >
                  Заповнити
                </button>
                <button 
                  type="button"
                  onClick={() => { setImgFit('contain'); localStorage.setItem('restaurant_img_fit', 'contain'); }}
                  className={`flex-1 py-1 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${imgFit === 'contain' ? 'bg-primary text-white shadow-lg' : 'text-textSecondary hover:text-white'}`}
                >
                  Вмістити
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-textSecondary uppercase tracking-widest mb-2 ml-1">Назва закладу</label>
              <div className="relative group">
                <ChefHat className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary group-focus-within:text-primary transition-colors" />
                <input 
                  required
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface border border-borderWhite rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-primary transition-all"
                  placeholder="Введіть назву..."
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-textSecondary uppercase tracking-widest mb-2 ml-1">Адреса</label>
              <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary group-focus-within:text-primary transition-colors" />
                <input 
                  required
                  type="text" 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-surface border border-borderWhite rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-primary transition-all"
                  placeholder="Введіть адресу..."
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-4 bg-primary text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-glow-primary hover:translate-y-[-2px] active:scale-95 disabled:opacity-50 mt-4"
          >
            {isSubmitting ? <Loader2 className="animate-spin mx-auto w-5 h-5" /> : 'Зберегти зміни'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function RestaurantDashboard() {
  const dispatch = useDispatch();
  const { items, isLoading, restaurantInfo } = useSelector(state => state.restaurantOrders);
  const [activeTab, setActiveTab] = useState('new');
  const [acceptModal, setAcceptModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchOrders());
    dispatch(fetchRestaurantInfo());
    const interval = setInterval(() => dispatch(fetchOrders()), 30000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const stats = [
    { label: 'Нові', value: items.filter(o => [0, 1, 2, 3].includes(getStatusNum(o))).length, icon: Package, color: 'text-primary' },
    { label: 'Завершені', value: items.filter(o => [4, 5, 6].includes(getStatusNum(o))).length, icon: TrendingUp, color: 'text-success' },
  ];

  const filteredOrders = items.filter(order => {
    const sNum = getStatusNum(order);
    if (activeTab === 'new') return [0, 1, 2, 3].includes(sNum); // Show everything active in 'New' for now to debug
    if (activeTab === 'completed') return [4, 5, 6].includes(sNum);
    return false;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const handleAccept = (orderId, prepTime) => {
    dispatch(acceptOrder({ orderId, prepTime }));
    setAcceptModal(null);
  };

  const handleReject = (orderId, reason) => {
    dispatch(rejectOrder({ orderId, reason }));
    setRejectModal(null);
  };

  const handleStartCooking = (order) => {
    dispatch(startPreparingOrder({ orderId: order.id || order.deliveryId }));
  };

  const handleMarkReady = (order) => {
    dispatch(markOrderReady({ orderId: order.id || order.deliveryId }));
  };

  return (
    <div className="flex-1 space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-surfaceLighter/30 p-8 rounded-[2rem] border border-borderWhite backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <ChefHat className="w-32 h-32 text-white" />
        </div>
        
        <div className="flex items-center gap-6 relative z-10">
          <div 
            className="w-24 h-24 rounded-[2rem] bg-surface border-4 border-white/10 shadow-glow-primary/20 p-1 cursor-pointer hover:scale-105 hover:rotate-3 transition-all duration-500 relative group"
            onClick={() => setProfileModalOpen(true)}
          >
            {restaurantInfo?.imageUrl ? (
              <img 
                src={restaurantInfo.imageUrl} 
                className={`w-full h-full ${localStorage.getItem('restaurant_img_fit') === 'contain' ? 'object-contain' : 'object-cover'} rounded-[1.5rem] shadow-lg`} 
                alt="Лого" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-surfaceLighter rounded-[1.5rem]">
                <ImageIcon className="w-8 h-8 text-primary" />
              </div>
            )}
            <div className="absolute -bottom-2 -right-2 bg-primary text-white p-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
              <Camera className="w-3 h-3" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
                {restaurantInfo?.name || 'Мій Ресторан'}
              </h1>
              <button 
                onClick={() => setProfileModalOpen(true)}
                className="p-2 bg-surfaceLighter/50 hover:bg-surfaceLighter rounded-xl text-textSecondary hover:text-white transition-all border border-borderWhite"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
            <p className="text-textSecondary text-sm font-medium flex items-center gap-1.5 mt-1">
              <MapPin className="w-3.5 h-3.5 text-primary" /> {restaurantInfo?.address || 'Вкажіть адресу в налаштуваннях'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 w-full md:w-auto relative z-10">
          {stats.map((stat, i) => (
            <div key={i} className="glass-panel px-6 py-4 flex flex-col items-center border-borderWhite/50 min-w-[100px]">
              <stat.icon className={`w-5 h-5 ${stat.color} mb-1`} />
              <span className="text-xl font-black text-white">{stat.value}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-textSecondary">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex gap-2 bg-surface p-2 rounded-2xl border border-borderWhite shadow-inner w-full md:w-auto overflow-x-auto scrollbar-hide">
          {[
            { id: 'new', label: '🆕 Нові', count: items.filter(o => [0, 1, 2, 3].includes(getStatusNum(o))).length },
            { id: 'completed', label: '✅ Історія', count: items.filter(o => [4, 5, 6].includes(getStatusNum(o))).length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id 
                  ? 'bg-primary text-white shadow-glow-primary translate-y-[-2px]' 
                  : 'text-textSecondary hover:text-white hover:bg-surfaceLighter'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-white text-primary' : 'bg-surfaceLighter text-textSecondary'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        
        <div className="text-right">
           <div className="text-[10px] font-black text-textSecondary uppercase tracking-widest mb-1">Останнє оновлення</div>
           <div className="text-xs font-medium text-white flex items-center gap-2">
             <div className="w-2 h-2 bg-success rounded-full animate-pulse" /> {new Date().toLocaleTimeString()}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredOrders.length > 0 ? (
          filteredOrders.map(order => (
            <OrderCard 
              key={order.id || order.deliveryId} 
              order={order} 
              onAccept={() => setAcceptModal(order)}
              onReject={() => setRejectModal(order)}
              onStartCooking={handleStartCooking}
              onMarkReady={handleMarkReady}
            />
          ))
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center glass-panel border-dashed border-2 border-borderWhite/30 opacity-50">
            <Package className="w-16 h-16 text-textSecondary mb-4" />
            <h3 className="text-xl font-bold text-white uppercase tracking-tighter">Немає замовлень</h3>
            <p className="text-textSecondary text-sm">Тут з'являться нові замовлення для вашого закладу</p>
          </div>
        )}
      </div>

      {acceptModal && (
        <AcceptOrderModal 
          order={acceptModal} 
          isOpen={!!acceptModal} 
          onClose={() => setAcceptModal(null)} 
          onConfirm={(prepTime) => handleAccept(acceptModal.id || acceptModal.deliveryId, prepTime)}
        />
      )}
      
      {rejectModal && (
        <RejectOrderModal 
          order={rejectModal} 
          isOpen={!!rejectModal} 
          onClose={() => setRejectModal(null)} 
          onConfirm={(reason) => handleReject(rejectModal.id || rejectModal.deliveryId, reason)}
        />
      )}

      {profileModalOpen && (
        <ProfileModal 
          isOpen={profileModalOpen} 
          onClose={() => setProfileModalOpen(false)} 
        />
      )}
    </div>
  );
}
