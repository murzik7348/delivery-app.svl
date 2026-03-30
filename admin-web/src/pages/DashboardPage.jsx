import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Users, ShoppingBag, Banknote, Truck, Activity, TrendingUp, Map, Star, Award } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getOrders } from '../store/slices/ordersSlice';
import { getUsers } from '../store/slices/usersSlice';
import { getProducts } from '../store/slices/catalogSlice';
import { useRef } from 'react';

// Initial placeholder while data loads or if no data
const defaultChartData = [
  { name: 'Loading...', orders: 0, revenue: 0 },
];

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  const colorMap = {
    primary: 'text-primary bg-primary/10 border-primary/20 shadow-[0_0_15px_rgba(226,43,198,0.3)]',
    secondary: 'text-secondary bg-secondary/10 border-secondary/20 shadow-[0_0_15px_rgba(255,184,0,0.3)]',
    success: 'text-success bg-success/10 border-success/20 shadow-[0_0_15px_rgba(16,185,129,0.3)]',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
  };

  return (
    <div className="glass-panel p-6 relative overflow-hidden group hover:border-borderPrimary transition-colors duration-500">
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 ${colorMap[color].split(' ')[0].replace('text-', 'bg-')}`} />
      <div className="flex justify-between items-start relative z-10">
        <div>
          <p className="text-textSecondary font-medium text-sm mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
          {(subtitle) && <p className="text-xs text-textSecondary mt-2">{subtitle}</p>}
        </div>
        <div className={`p-4 rounded-xl border ${colorMap[color]} transition-all duration-300 group-hover:scale-110`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel p-4 border border-borderPrimary shadow-glow-primary">
        <p className="text-white font-semibold mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name === 'orders' ? 'Orders:' : 'Revenue:'} <span className="font-bold">{entry.value}</span>
            {entry.name === 'revenue' && ' ₴'}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function RankingCard({ title, items, icon: Icon, color }) {
  return (
    <div className="glass-panel p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <div className={`p-2 rounded-lg bg-${color}/10 text-${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-white font-bold">{title}</h3>
      </div>
      <div className="space-y-4 flex-1">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <span className="text-textSecondary font-black text-xs w-4">{idx + 1}</span>
              <div className="w-8 h-8 rounded-lg bg-surface border border-borderWhite flex items-center justify-center overflow-hidden">
                 {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <Star className="w-4 h-4 text-textSecondary" />}
              </div>
              <div>
                <p className="text-white text-sm font-medium group-hover:text-primary transition-colors">{item.name}</p>
                <p className="text-textSecondary text-[10px]">{item.subtitle}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white text-xs font-bold">{item.value}</p>
              <div className="w-16 h-1 bg-surface rounded-full mt-1 overflow-hidden">
                 <div className={`h-full bg-${color}`} style={{ width: `${100 - (idx * 15)}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const getCourierColor = (courier) => {
    const phone = courier.phoneNumber || courier.phone || '';
    if (phone.includes('0991300001')) return '#FF1493'; 
    const str = courier.id ? courier.id.toString() : phone;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
};

function LiveCourierMap({ users }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  const couriers = users.filter(u => 
    (u.role === 'courier' || u.role === 1 || String(u.role).toLowerCase() === 'courier') && 
    u.latitude && u.longitude && u.isOnline
  ).map(c => ({
    ...c,
    lat: parseFloat(c.latitude),
    lng: parseFloat(c.longitude)
  }));

  const center = couriers.length > 0 ? [couriers[0].lat, couriers[0].lng] : [48.5469, 22.9863];

  useEffect(() => {
    if (!window.L || !mapRef.current) return;

    if (!mapInstance.current) {
        mapInstance.current = window.L.map(mapRef.current).setView(center, 13);
        window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CartoDB'
        }).addTo(mapInstance.current);
    } else {
        if (couriers.length > 0) mapInstance.current.setView(center, 13);
    }

    // Clear existing markers
    mapInstance.current.eachLayer((layer) => {
        if (layer instanceof window.L.Marker) {
            mapInstance.current.removeLayer(layer);
        }
    });

    couriers.forEach(c => {
         const color = getCourierColor(c);
         const customIcon = window.L.divIcon({
            className: 'custom-icon',
            html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px ${color}"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
         });
         window.L.marker([c.lat, c.lng], { icon: customIcon })
            .bindPopup(`<div style="color: black"><strong>${c.fullName || c.name || 'Courier'}</strong><br/>${c.phoneNumber || c.phone || 'No phone'}<br/>${color === '#FF1493' ? '⭐ Special Courier' : 'Active tracking'}</div>`)
            .addTo(mapInstance.current);
    });
  }, [couriers]);

  return (
    <div className="glass-panel relative overflow-hidden h-full min-h-[300px] flex flex-col">
       <div className="flex items-center justify-between mb-4 p-6 pb-2 relative z-[1001] w-full">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Map className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold">Live Courier Map</h3>
              <p className="text-[10px] text-textSecondary uppercase tracking-tighter">Real-time GPS tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-success/10 border border-success/20 px-2 py-1 rounded text-[10px] font-bold text-success animate-pulse">
             <div className="w-1.5 h-1.5 rounded-full bg-success" /> LIVE
          </div>
       </div>

       <div className="flex-1 relative z-0 w-full h-full min-h-[250px] rounded-b-2xl overflow-hidden">
          <div ref={mapRef} style={{ height: '100%', width: '100%', borderRadius: '0 0 16px 16px' }} />
          {couriers.length === 0 && (
             <div className="absolute inset-0 bg-[#111111]/80 flex items-center justify-center z-[1000] pointer-events-none">
                 <p className="text-textSecondary text-sm font-bold bg-black/80 px-4 py-2 rounded-xl backdrop-blur">
                    No active couriers with Location found
                 </p>
             </div>
          )}
       </div>
    </div>
  );
}

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { items: orders } = useSelector(state => state.orders);
  const { items: users } = useSelector(state => state.users);
  const { products } = useSelector(state => state.catalog);

  useEffect(() => {
    dispatch(getOrders(null));
    dispatch(getUsers({ page: 1, pageSize: 100 }));
    dispatch(getProducts({ page: 1, pageSize: 100 }));
  }, [dispatch]);

  const totalRevenue = orders.reduce((sum, order) => sum + (order.totalPrice || order.total || 0), 0);
  const newOrdersCount = orders.filter(o => o.status === 0 || o.status === 'accepted').length;
  const couriersCount = users.filter(u => u.role === 'courier' || u.role === 1).length;

  // Real Top Restaurants Calculation
  const restaurantStats = orders.reduce((acc, order) => {
    const rId = order.restaurantId;
    if (!rId) return acc;
    if (!acc[rId]) acc[rId] = { id: rId, name: order.restaurantName || `Rest #${rId}`, orders: 0, revenue: 0 };
    acc[rId].orders += 1;
    acc[rId].revenue += (order.totalPrice || order.total || 0);
    return acc;
  }, {});

  const topRestaurants = Object.values(restaurantStats)
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 4)
    .map(r => ({
      name: r.name,
      subtitle: `${r.revenue.toLocaleString()} ₴ revenue`,
      value: `${r.orders} orders`,
      image: null
    }));

  // Real Most Popular Dishes Calculation
  const dishStats = orders.reduce((acc, order) => {
    if (!order.items) return acc;
    order.items.forEach(item => {
      const pId = item.productId || item.id;
      if (!pId) return;
      if (!acc[pId]) acc[pId] = { name: item.productName || item.name, count: 0, restaurant: order.restaurantName };
      acc[pId].count += (item.quantity || 1);
    });
    return acc;
  }, {});

  const popularDishes = Object.values(dishStats)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map(d => ({
      name: d.name,
      subtitle: d.restaurant || 'Various',
      value: `${d.count} sold`,
      image: null
    }));

  // Real Chart Data Calculation (Last 7 Days)
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      dateStr: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('uk-UA', { weekday: 'short' }),
      orders: 0,
      revenue: 0
    };
  });

  orders.forEach(order => {
    const date = (order.createdAt || order.date)?.split('T')[0];
    const day = last7Days.find(d => d.dateStr === date);
    if (day) {
      day.orders += 1;
      day.revenue += (order.totalPrice || order.total || 0);
    }
  });

  const chartData = last7Days.map(d => ({ name: d.label, orders: d.orders, revenue: d.revenue }));

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-white text-lg font-medium">Welcome back, Admin 👋</h2>
          <p className="text-textSecondary text-sm mt-1">Here is what's happening today.</p>
        </div>
        <div className="glass-panel px-4 py-2 flex items-center">
           <span className="text-white text-sm font-medium">{new Date().toLocaleDateString('uk-UA')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="New Orders" 
          value={newOrdersCount} 
          subtitle="Live from system"
          icon={ShoppingBag} 
          color="primary" 
        />
        <StatCard 
          title="Total Revenue" 
          value={`${totalRevenue.toLocaleString()} ₴`} 
          subtitle="All recorded orders"
          icon={Banknote} 
          color="success" 
        />
        <StatCard 
          title="Active Couriers" 
          value={couriersCount} 
          subtitle="Registered in system"
          icon={Truck} 
          color="secondary" 
        />
        <StatCard 
          title="Users / Products" 
          value={`${users.length} / ${products.length}`} 
          subtitle="System entities"
          icon={Users} 
          color="blue" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RankingCard 
          title="Top Performing Restaurants"
          icon={Award}
          color="secondary"
          items={topRestaurants}
        />
        <RankingCard 
          title="Most Popular Dishes"
          icon={TrendingUp}
          color="primary"
          items={popularDishes}
        />
        <LiveCourierMap users={users} />
      </div>

      <div className="glass-panel p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-lg font-bold text-white">Revenue & Orders Overview</h3>
            <p className="text-sm text-textSecondary">Performance over the last 7 days</p>
          </div>
          <div className="flex bg-surfaceLighter rounded-lg p-1 border border-borderWhite">
            <button className="px-4 py-1.5 text-sm font-medium rounded-md bg-surface text-white shadow-sm border border-borderWhite">7 Days</button>
            <button className="px-4 py-1.5 text-sm font-medium rounded-md text-textSecondary hover:text-white transition-colors">30 Days</button>
          </div>
        </div>
        
        <div className="h-80 w-full mb-8">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData.length > 0 ? chartData : defaultChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E22BC6" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="#E22BC6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFB800" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="#FFB800" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} tickFormatter={(val) => `₴${val/1000}k`} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#E22BC6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" activeDot={{r: 6, fill: '#E22BC6', stroke: '#fff', strokeWidth: 2}} />
              <Area yAxisId="right" type="monotone" dataKey="orders" stroke="#FFB800" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" activeDot={{r: 6, fill: '#FFB800', stroke: '#fff', strokeWidth: 2}} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* System Team Management Section */}
        <div className="pt-8 border-t border-borderWhite">
          <h3 className="text-lg font-bold text-white mb-2">System Team Dashboard</h3>
          <p className="text-sm text-textSecondary mb-6">Unified management of your core role accounts (Admin, Courier, Restaurant, User).</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             {[
               { phone: '+380991300000', label: 'Client App Account', role: 'User' },
               { phone: '+380991300001', label: 'Courier App Account', role: 'Courier' },
               { phone: '+380991300002', label: 'Main Admin Account', role: 'Admin' },
               { phone: '+380991300003', label: 'Restaurant Owner Account', role: 'Rest Admin' }
             ].map(staff => {
                const systemUser = users.find(u => (u.phoneNumber || u.phone) === staff.phone);
                return (
                  <div key={staff.phone} className="bg-surface/50 border border-borderWhite rounded-xl p-4 hover:border-primary/50 transition-colors">
                     <div className="flex items-center mb-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 text-white font-bold ${
                           staff.role === 'Admin' ? 'bg-primary' : 
                           staff.role === 'Courier' ? 'bg-blue-500' :
                           staff.role === 'Rest Admin' ? 'bg-secondary' : 'bg-textSecondary'
                        }`}>
                           {staff.role[0]}
                        </div>
                        <div className="overflow-hidden">
                           <p className="text-white font-bold text-sm truncate">{systemUser?.fullName || staff.label}</p>
                           <p className="text-textSecondary text-xs">{staff.phone}</p>
                        </div>
                     </div>
                     <div className="flex justify-between items-center text-xs">
                        <span className="text-textSecondary">Status: <span className="text-success font-medium">Online</span></span>
                        <span className={`px-2 py-0.5 rounded border border-borderWhite ${
                           staff.role === 'Admin' ? 'text-primary bg-primary/10' : 
                           staff.role === 'Courier' ? 'text-blue-400 bg-blue-400/10' :
                           'text-textSecondary'
                        }`}>
                           {staff.role}
                        </span>
                     </div>
                  </div>
                )
             })}
          </div>
        </div>
      </div>

    </div>
  );
}
