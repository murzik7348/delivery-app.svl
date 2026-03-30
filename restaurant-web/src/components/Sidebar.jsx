import { NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { LayoutDashboard, LogOut, ChefHat, Terminal, BookOpen } from 'lucide-react';
import { logout } from '../store/slices/authSlice';

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Приймання' },
  { path: '/kitchen', icon: ChefHat, label: 'Кухня' },
  { path: '/menu', icon: BookOpen, label: 'Меню' },
  { path: '/logs', icon: Terminal, label: 'Логи' }
];

export default function Sidebar() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <div className="w-64 bg-surface border-r border-borderWhite h-screen fixed top-0 left-0 flex flex-col transition-all duration-300">
      
      {/* Brand Logo Area */}
      <div className="h-20 flex items-center px-6 border-b border-borderWhite">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-secondary flex items-center justify-center mr-3 shadow-glow-primary">
          <span className="text-white font-bold text-lg leading-none">R</span>
        </div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
          Restaurant<span className="text-primary">Panel</span>
        </h1>
      </div>
      
      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `group flex items-center px-4 py-3 rounded-xl transition-all duration-300 relative ${
                  isActive 
                    ? 'bg-primary/15 text-primary font-medium border border-borderPrimary shadow-[inset_0_0_12px_rgba(226,43,198,0.1)]' 
                    : 'text-textSecondary hover:bg-surfaceLighter hover:text-white border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full shadow-glow-primary" />
                  )}
                  <Icon className={`w-5 h-5 mr-3 transition-colors ${isActive ? 'text-primary' : 'text-textSecondary group-hover:text-white'}`} />
                  <span className="flex-1">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
      
      {/* User Profile Area */}
      <div className="p-4 border-t border-borderWhite">
        <div 
          onClick={handleLogout}
          className="flex items-center px-4 py-3 glass-button rounded-xl cursor-pointer group hover:bg-danger/10 hover:border-danger/30 transition-all border border-transparent"
        >
           <img 
            src={`https://ui-avatars.com/api/?name=${(user?.name || user?.fullName || 'Manager').split(' ').join('+')}&background=E22BC6&color=fff`} 
            alt="Manager" 
            className={`w-9 h-9 rounded-full mr-3 ring-2 transition-all shadow-md ring-borderWhite group-hover:ring-danger/50`} 
          />
           <div className="flex-1">
             <p className="text-sm font-semibold text-white group-hover:text-danger transition-colors line-clamp-1">{user?.name || user?.fullName || 'Manager'}</p>
             <p className="text-xs text-textSecondary mt-0.5">Restaurant Owner</p>
           </div>
           <LogOut className="w-4 h-4 text-textSecondary group-hover:text-danger transition-colors" />
        </div>
      </div>
    </div>
  );
}
