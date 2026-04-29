import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginAdmin } from '../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { Lock, Phone, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useSelector((state) => state.auth);

  const ALLOWED_ADMIN_PHONES = [
    '+380991300002',
    '+380991300003',
    '+380991300584',
    '+380991300001',
    '+380991300000'
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!phone || !password) return;
    
    if (!ALLOWED_ADMIN_PHONES.includes(phone)) {
      alert('Доступ заборонено! Цей номер не має прав адміністратора.');
      return;
    }

    // Attempt standard login - matching mobile app payload
    const resultAction = await dispatch(loginAdmin({ phoneNumber: phone, password }));
    if (loginAdmin.fulfilled.match(resultAction)) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background decorations */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="glass-panel max-w-md w-full p-8 relative z-10 animate-fade-in border-borderWhite/50 shadow-glow-primary">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(226,43,198,0.4)]">
            <span className="text-white font-bold text-3xl leading-none">D</span>
          </div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-2">
            Welcome Back
          </h1>
          <p className="text-textSecondary text-sm">Sign in to manage Delivery App</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
            
          {error && (
            <div className="bg-danger/10 border border-danger/20 p-3 rounded-lg flex items-center text-danger text-sm font-medium">
              <AlertCircle className="w-4 h-4 mr-2" />
              {typeof error === 'string' ? error : 'Invalid credentials'}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">Phone Number</label>
            <div className="relative group">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-textSecondary group-focus-within:text-primary transition-colors" />
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+380991234567"
                className="w-full bg-surface border border-borderWhite rounded-xl py-3 pl-11 pr-4 text-white placeholder-textSecondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">Password</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-textSecondary group-focus-within:text-primary transition-colors" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-surface border border-borderWhite rounded-xl py-3 pl-11 pr-4 text-white placeholder-textSecondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all font-medium"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading || !phone || !password}
            className="w-full bg-primary hover:bg-primaryHover disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold transition-all shadow-glow-primary flex items-center justify-center mt-4 group"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
            {!isLoading && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

      </div>
    </div>
  );
}
