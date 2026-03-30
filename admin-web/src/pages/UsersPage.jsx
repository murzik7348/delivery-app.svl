import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getUsers, changeUserRole, toggleBanStatus } from '../store/slices/usersSlice';
import { Search, Shield, User, Truck, ShieldAlert, CheckCircle2, XCircle, Loader2, Crown } from 'lucide-react';

const ROLE_BADGE = {
  superadmin: { color: 'text-secondary bg-secondary/10 border-secondary/20 shadow-[0_0_10px_rgba(255,184,0,0.2)]', icon: Crown },
  admin: { color: 'text-primary bg-primary/10 border-primary/20', icon: Shield },
  manager: { color: 'text-secondary bg-secondary/10 border-secondary/20', icon: ShieldAlert },
  courier: { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: Truck },
  user: { color: 'text-textSecondary bg-surface border-borderWhite', icon: User },
};

export default function UsersPage() {
  const dispatch = useDispatch();
  const { items: users, isLoading } = useSelector(state => state.users);
  const { user: currentUser } = useSelector(state => state.auth);
  
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  if (currentUser && !currentUser.isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-20 h-20 bg-danger/10 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-danger" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-textSecondary max-w-md">
          Only Super Admins can manage users and roles. Please contact the system owner if you believe this is an error.
        </p>
      </div>
    );
  }

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      dispatch(getUsers({ page, pageSize: 20, search }));
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [search, page, dispatch]);

  const handleToggleStatus = async (id) => {
    await dispatch(toggleBanStatus(id));
  };

  const handleChangeRole = async (id, newRole) => {
    await dispatch(changeUserRole({ userId: id, newRole }));
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">User Management</h2>
          <p className="text-textSecondary text-sm">Manage customers, couriers and admins.</p>
        </div>
        
        <div className="relative group w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search by name or phone..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface border border-borderWhite rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-textSecondary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="glass-panel overflow-hidden relative min-h-[400px]">
         
         {isLoading && (!users || users.length === 0) && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 backdrop-blur-sm">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
         )}

         <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse">
             <thead>
               <tr className="bg-surfaceLighter/50 border-b border-borderWhite text-xs uppercase tracking-wider text-textSecondary font-semibold">
                 <th className="p-4">Customer</th>
                 <th className="p-4">Contact</th>
                 <th className="p-4">Orders / Spent</th>
                 <th className="p-4">Role</th>
                 <th className="p-4">Role</th>
                 <th className="p-4">Status</th>
                 <th className="p-4 text-right">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-borderWhite">
               {users?.map(user => {
                 // Convert backend numeric roles if necessary, or use string
                 let roleStr = 'user';
                 if (typeof user.role === 'number') {
                     const roleMap = {0: 'user', 1: 'courier', 2: 'manager', 3: 'admin', 4: 'superadmin'};
                     roleStr = roleMap[user.role] || 'user';
                 } else if (typeof user.role === 'string') {
                     roleStr = user.role.toLowerCase();
                 }

                 const RoleIcon = ROLE_BADGE[roleStr]?.icon || User;
                 const roleColor = ROLE_BADGE[roleStr]?.color || ROLE_BADGE.user.color;
                  const userId = user.id || user.userId || user._id;
                  const userName = user.name || user.fullName || user.username || `Customer #${userId}`;
                  const userPhone = user.phone || user.phoneNumber || 'N/A';
                  const isBanned = user.status === 'banned' || user.isBanned === true;

                  return (
                    <tr key={userId || userPhone || index} className="hover:bg-surfaceLighter/30 transition-colors group">
                     {/* Name & Avatar */}
                     <td className="p-4">
                       <div className="flex items-center">
                         <img 
                           src={`https://ui-avatars.com/api/?name=${userName.split(' ').join('+')}&background=150a21&color=E22BC6`} 
                           alt={userName} 
                           className="w-10 h-10 rounded-full mr-3 border border-borderWhite"
                         />
                         <div>
                           <p className="text-white font-medium">{userName}</p>
                           <p className="text-xs text-textSecondary">ID: {userId}</p>
                         </div>
                       </div>
                     </td>
                     
                     {/* Contact */}
                     <td className="p-4 text-textSecondary text-sm">{userPhone}</td>
                     
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-white font-medium">{user.orders || user.ordersCount || 0} orders</span>
                          <span className="text-xs text-primary">{user.totalSpent || 0} ₴</span>
                        </div>
                      </td>
                      
                      {/* Role Dropdown */}
                     <td className="p-4">
                       <div className="relative inline-block text-left">
                          <select 
                            value={user.role}
                            onChange={(e) => handleChangeRole(userId, Number(e.target.value))}
                            disabled={isLoading}
                            className={`appearance-none bg-transparent border py-1.5 pl-8 pr-6 rounded-full text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-primary ${roleColor} cursor-pointer disabled:opacity-50`}
                          >
                            <option value="0" className="bg-surface text-white">User</option>
                            <option value="1" className="bg-surface text-white">Courier</option>
                            <option value="2" className="bg-surface text-white">Manager</option>
                            <option value="3" className="bg-surface text-white">Admin</option>
                            <option value="4" className="bg-surface text-white">Super Admin</option>
                          </select>
                          <RoleIcon className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${roleColor.split(' ')[0]}`} />
                       </div>
                     </td>
                     
                     {/* Status */}
                     <td className="p-4">
                       {!isBanned ? (
                         <span className="inline-flex items-center text-success text-sm font-medium">
                           <CheckCircle2 className="w-4 h-4 mr-1.5" /> Active
                         </span>
                       ) : (
                         <span className="inline-flex items-center text-danger text-sm font-medium">
                           <XCircle className="w-4 h-4 mr-1.5" /> Banned
                         </span>
                       )}
                     </td>
                     
                     {/* Actions */}
                     <td className="p-4 text-right">
                       <button 
                         onClick={() => handleToggleStatus(userId)}
                         disabled={isLoading}
                         className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border disabled:opacity-50 ${!isBanned ? 'border-danger/20 text-danger hover:bg-danger/10' : 'border-success/20 text-success hover:bg-success/10'}`}
                       >
                         {!isBanned ? 'Ban User' : 'Unban'}
                       </button>
                     </td>
                   </tr>
                 );
               })}
             </tbody>
           </table>
           
           {users.length === 0 && !isLoading && (
             <div className="p-8 text-center text-textSecondary">
               No users found matching "{search}"
             </div>
           )}
         </div>
      </div>
    </div>
  );
}
