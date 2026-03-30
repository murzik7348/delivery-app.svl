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
        <div className="w-20 h-20 bg-danger/10 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-danger" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-textSecondary max-w-md">
          Only Super Admins can modify global system settings and emergency rules.
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
    <div className="max-w-4xl space-y-8 animate-fade-in relative">
      
      {isLoading && (
        <div className="absolute top-0 right-0 p-2">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-white mb-1">System Settings</h2>
        <p className="text-textSecondary text-sm">
          {error
            ? 'Backend settings API is not configured yet. Values below are disabled until backend is ready.'
            : 'Configure global delivery rules and store status.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Delivery Settings */}
                <div className="glass-panel p-6">
          <div className="flex items-center mb-6">
            <div className="p-3 bg-secondary/10 text-secondary border border-secondary/20 rounded-xl mr-4 shadow-[0_0_15px_rgba(255,184,0,0.2)]">
               <Truck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Delivery Parameters</h3>
          </div>
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">Base Delivery Fee (₴)</label>
              <input 
                type="number" 
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className="w-full bg-surface border border-borderWhite rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all font-medium"
                disabled={!!error}
              />
            </div>
            
            <button 
               onClick={handleSaveFee}
               disabled={!!error || isLoading || fee === '' || Number(fee) === data.courierFee}
               className="w-full bg-surfaceLighter disabled:opacity-50 hover:bg-primary/20 hover:text-primary hover:border-primary border border-borderWhite text-white py-2.5 rounded-lg flex items-center justify-center font-bold transition-all"
            >
               <Save className="w-4 h-4 mr-2" /> Save Settings
            </button>
          </div>
        </div>

        {/* Emergency Rules */}
        <div className="glass-panel p-6 border-danger/20">
          <div className="flex items-center mb-6">
            <div className="p-3 bg-danger/10 text-danger border border-danger/20 rounded-xl mr-4 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
               <Store className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Emergency Controls</h3>
          </div>
          
          <div className="bg-surface p-5 rounded-xl border border-borderWhite mb-6">
            <div className="flex justify-between items-start">
               <div>
                 <h4 className="text-white font-bold flex items-center mb-1">
                   {data.emergencyClose === null
                     ? 'Store status unknown'
                     : !data.emergencyClose ? 'Store is Open' : 'Store is Closed'}
                 </h4>
                 <p className="text-textSecondary text-sm">
                   {data.emergencyClose === null
                     ? 'Backend has not provided store status yet.'
                     : !data.emergencyClose
                       ? 'Customers can place new orders via the app.'
                       : 'New orders are completely disabled.'}
                 </p>
               </div>
               <button 
                  onClick={toggleEmergencyClose}
                  disabled={!!error || isLoading}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                    !data.emergencyClose ? 'bg-success' : 'bg-surfaceLighter border border-borderWhite'
                  } disabled:opacity-50`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${!data.emergencyClose ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
          </div>
          
          <div className="bg-danger/5 border border-danger/20 rounded-xl p-4 flex items-start">
            <AlertTriangle className="w-5 h-5 text-danger mr-3 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-danger font-bold text-sm mb-1">Caution</h5>
              <p className="text-textSecondary text-xs leading-relaxed">Closing the store will immediately prevent any client from adding items to cart or checking out. Use only during extreme overload or technical issues.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
