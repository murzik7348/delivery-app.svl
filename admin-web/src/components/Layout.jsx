import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Toast from './Toast';
import { Bell, Search, RefreshCcw, LogOut, User as UserIcon } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { getOrders, clearAllOverrides } from '../store/slices/ordersSlice';
import { getUsers } from '../store/slices/usersSlice';
import { getProducts } from '../store/slices/catalogSlice';
import { logout } from '../store/slices/authSlice';
import { useState } from 'react';

export default function Layout() {
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Clear all local UI overrides to see actual server data
    dispatch(clearAllOverrides());
    
    // Refresh all core data
    await Promise.all([
      dispatch(getOrders(null)),
      dispatch(getUsers({ page: 1, pageSize: 200 })),
      dispatch(getProducts({ page: 1, pageSize: 200 }))
    ]);
    
    // Smooth transition back
    setTimeout(() => setIsRefreshing(false), 1000);
  };
  
  // Format page title from pathname
  const pageTitle = location.pathname.split('/')[1] || 'Dashboard';
  const displayTitle = pageTitle.charAt(0).toUpperCase() + pageTitle.slice(1);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      
      <div className="ml-64 flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-20 bg-background/80 backdrop-blur-md border-b border-borderWhite flex items-center justify-between px-8 sticky top-0 z-20">
          
          <div className="flex items-center">
            <h2 className="text-2xl font-bold text-white tracking-tight">{displayTitle}</h2>
          </div>
          
          <div className="flex items-center space-x-4">
            
            {/* Refresh Button */}
            <button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh Data"
              className={`p-2.5 rounded-full border border-borderWhite bg-surface/50 text-white transition-all hover:bg-surface hover:border-primary/50 group ${isRefreshing ? 'opacity-50' : ''}`}
            >
              <RefreshCcw className={`w-5 h-5 group-hover:text-primary transition-colors ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
            </button>

            {/* Search Bar Example */}
            <div className="relative hidden md:block group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="w-64 bg-surface border border-borderWhite rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder-textSecondary focus:outline-none focus:border-borderPrimary focus:ring-1 focus:ring-primary/50 transition-all"
              />
            </div>

            {/* Notification Bell */}
            <button className="relative p-2 text-textSecondary hover:text-white transition-colors rounded-full hover:bg-surfaceLighter">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background shadow-glow-primary"></span>
            </button>

            <div className="h-8 w-px bg-borderWhite mx-2" />

            {/* User Profile & Logout */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-white text-sm font-bold leading-none">{user?.fullName || 'Admin User'}</span>
                <span className="text-textSecondary text-[10px] mt-1">{user?.phone || user?.phoneNumber || '+380...'}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary group cursor-pointer hover:bg-primary/30 transition-all">
                <UserIcon className="w-5 h-5" />
              </div>
              <button 
                onClick={() => {
                  if (window.confirm('Ви впевнені, що хочете вийти?')) {
                    dispatch(logout());
                  }
                }}
                className="p-2.5 text-textSecondary hover:text-danger hover:bg-danger/10 rounded-xl transition-all"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
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
