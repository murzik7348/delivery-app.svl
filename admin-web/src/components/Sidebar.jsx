import { NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { LayoutDashboard, Users, ShoppingBag, List, Settings, LogOut, Crown } from 'lucide-react';
import { logout } from '../store/slices/authSlice';

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/orders', icon: ShoppingBag, label: 'Orders' },
  { path: '/users', icon: Users, label: 'Users' },
  { path: '/catalog', icon: List, label: 'Catalog' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { items: orders } = useSelector((state) => state.orders);
  
  const newOrdersCount = orders.filter(o => o.statusDelivery === 'created' || Number(o.deliveryStatus || o.status) === 1).length;

  const handleLogout = () => {
    dispatch(logout());
  };

  // Filter menu items based on role
  // Only Super Admin can see 'Users' and 'Settings'
  const filteredMenuItems = menuItems.filter(item => {
    if (item.path === '/users' || item.path === '/settings') {
      return user?.isSuperAdmin;
    }
    return true;
  });

  return (
    <div className="w-64 bg-surface border-r border-borderWhite h-screen fixed top-0 left-0 flex flex-col transition-all duration-300">
      
      {/* Brand Logo Area */}
      <div className="h-20 flex items-center px-6 border-b border-borderWhite">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-secondary flex items-center justify-center mr-3 shadow-glow-primary">
          <span className="text-white font-bold text-lg leading-none">D</span>
        </div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
          Delivery<span className="text-primary">Admin</span>
        </h1>
      </div>
      
      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {filteredMenuItems.map((item) => {
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
                  {item.path === '/orders' && newOrdersCount > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-glow-primary animate-pulse">
                      {newOrdersCount}
                    </span>
                  )}
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
            src={`https://ui-avatars.com/api/?name=${(user?.name || user?.fullName || 'Admin').split(' ').join('+')}&background=${user?.isSuperAdmin ? 'FFB800' : 'E22BC6'}&color=fff`} 
            alt="Admin" 
            className={`w-9 h-9 rounded-full mr-3 ring-2 transition-all shadow-md ${user?.isSuperAdmin ? 'ring-secondary' : 'ring-borderWhite'} group-hover:ring-danger/50`} 
          />
           <div className="flex-1">
             <p className="text-sm font-semibold text-white group-hover:text-danger transition-colors line-clamp-1">{user?.name || user?.fullName || 'Dima Murza'}</p>
             <p className="text-xs text-textSecondary mt-0.5">{user?.isSuperAdmin ? 'Super Admin' : 'Administrator'}</p>
           </div>
           <LogOut className="w-4 h-4 text-textSecondary group-hover:text-danger transition-colors" />
        </div>
      </div>
    </div>
  );
}
