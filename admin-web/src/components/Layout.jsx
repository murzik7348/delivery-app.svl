import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Toast from './Toast';
import { Bell, Search } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  
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
          
          <div className="flex items-center space-x-6">
            
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

            {/* Store Status Toggle Indicator */}
             <div className="flex items-center glass-panel px-4 py-1.5 border-borderWhite">
               <div className="w-2 h-2 rounded-full bg-success mr-2 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
               <span className="text-sm font-medium text-white">Store Open</span>
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
