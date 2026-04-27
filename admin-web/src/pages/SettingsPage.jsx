import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getSettings, saveSettings } from '../store/slices/settingsSlice';
import { Truck, Store, AlertTriangle, Save, Loader2, ShieldAlert } from 'lucide-react';

export default function SettingsPage() {
  const dispatch = useDispatch();
  const { data, isLoading, error } = useSelector(state => state.settings);
  const { user: currentUser } = useSelector(state => state.auth);

  // Local state for the inputs before saving
  const [fee, setFee] = useState(data.courierFee ?? '');

  useEffect(() => {
    dispatch(getSettings());
  }, [dispatch]);

  // Sync local input state when Redux data loads
  useEffect(() => {
    setFee(data.courierFee ?? '');
  }, [data.courierFee]);

  if (currentUser && !currentUser.isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-24 h-24 bg-danger/10 rounded-full flex items-center justify-center mb-8 border border-danger/20 shadow-glow-danger/20">
          <ShieldAlert className="w-12 h-12 text-danger" />
        </div>
        <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Доступ Заборонено</h2>
        <p className="text-textSecondary max-w-sm font-medium">
          Тільки Головний Адміністратор має доступ до налаштувань глобальних параметрів системи.
        </p>
      </div>
    );
  }

  const handleSaveFee = () => {
    dispatch(saveSettings({ courierFee: Number(fee) }));
  };

  const toggleEmergencyClose = () => {
    dispatch(saveSettings({ emergencyClose: !data.emergencyClose }));
  };

  return (
    <div className="max-w-4xl space-y-10 animate-in fade-in duration-700">
      
      <div className="flex justify-between items-center bg-surfaceLighter/30 p-8 rounded-[2rem] border border-borderWhite backdrop-blur-sm">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Налаштування Системи</h1>
          <p className="text-textSecondary text-sm font-medium mt-1">
            {error
              ? 'API налаштувань не сконфігуровано. Значення нижче заблоковано.'
              : 'Керуйте глобальними параметрами доставки та статусом сервісу.'}
          </p>
        </div>
        {isLoading && <Loader2 className="w-6 h-6 text-primary animate-spin" />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Delivery Settings */}
        <div className="glass-panel p-8 group hover:border-primary/30 transition-all duration-500">
          <div className="flex items-center mb-8">
            <div className="p-4 bg-secondary/10 text-secondary border border-secondary/20 rounded-2xl mr-5 shadow-glow-secondary/20 group-hover:scale-110 transition-transform">
               <Truck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-wider">Доставка</h3>
              <p className="text-[10px] text-textSecondary uppercase tracking-widest font-black">Фінансові параметри</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-textSecondary uppercase tracking-widest mb-2 ml-1">Базова вартість (₴)</label>
              <input 
                type="number" 
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className="w-full bg-surface border border-borderWhite rounded-2xl py-4 px-5 text-white focus:outline-none focus:border-primary transition-all font-bold text-lg"
                disabled={!!error}
                placeholder="0.00"
              />
            </div>
            
            <button 
               onClick={handleSaveFee}
               disabled={!!error || isLoading || fee === '' || Number(fee) === data.courierFee}
               className="w-full bg-primary text-white py-4 rounded-2xl flex items-center justify-center font-black uppercase tracking-widest transition-all shadow-glow-primary hover:translate-y-[-2px] active:scale-95 disabled:opacity-50"
            >
               <Save className="w-4 h-4 mr-2" /> Зберегти
            </button>
          </div>
        </div>

        {/* Emergency Rules */}
        <div className="glass-panel p-8 border-danger/20 group hover:border-danger/40 transition-all duration-500">
          <div className="flex items-center mb-8">
            <div className="p-4 bg-danger/10 text-danger border border-danger/20 rounded-2xl mr-5 shadow-glow-danger/20 group-hover:scale-110 transition-transform">
               <Store className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-wider">Робота Сервісу</h3>
              <p className="text-[10px] text-danger uppercase tracking-widest font-black">Екстрені заходи</p>
            </div>
          </div>
          
          <div className="bg-surface p-6 rounded-2xl border border-borderWhite mb-8">
            <div className="flex justify-between items-center">
               <div>
                 <h4 className="text-white font-black uppercase tracking-tighter text-lg flex items-center mb-1">
                   {data.emergencyClose === null
                     ? 'Статус невідомий'
                     : !data.emergencyClose ? 'Сервіс ПРАЦЮЄ' : 'Сервіс ЗАКРИТО'}
                 </h4>
                 <p className="text-textSecondary text-xs font-medium">
                   {data.emergencyClose === null
                     ? 'Бекенд не повернув статус закладу.'
                     : !data.emergencyClose
                       ? 'Клієнти можуть створювати нові замовлення.'
                       : 'Прийом нових замовлень повністю вимкнено.'}
                 </p>
               </div>
               <button 
                  onClick={toggleEmergencyClose}
                  disabled={!!error || isLoading}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-all duration-500 focus:outline-none ${
                    !data.emergencyClose ? 'bg-success shadow-glow-success/30' : 'bg-surfaceLighter border border-borderWhite'
                  } disabled:opacity-50`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-500 shadow-md ${!data.emergencyClose ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
          </div>
          
          <div className="bg-danger/5 border border-danger/10 rounded-2xl p-5 flex items-start">
            <AlertTriangle className="w-5 h-5 text-danger mr-4 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-danger font-black text-[10px] uppercase tracking-widest mb-1.5">Увага!</h5>
              <p className="text-textSecondary text-xs leading-relaxed font-medium">Закриття сервісу миттєво припинить можливість додавання товарів до кошика для всіх клієнтів. Використовуйте лише при екстремальних перевантаженнях.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
