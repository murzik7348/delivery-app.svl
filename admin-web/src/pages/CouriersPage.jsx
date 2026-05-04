import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getUsers } from '../store/slices/usersSlice';
import { getOrders } from '../store/slices/ordersSlice';
import { 
  Truck, Search, Map as MapIcon, Activity, ExternalLink, 
  Clock, CheckCircle2, ChevronRight, Star, Phone, 
  Package, MapPin, X, Loader2, Navigation
} from 'lucide-react';

// Reusing the map logic from DashboardPage
const getCourierColor = (courier) => {
  const phone = courier.phoneNumber || courier.phone || '';
  if (phone.includes('0991300001')) return '#FF1493'; // Special color for demo courier
  const str = courier.id ? courier.id.toString() : phone;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

function CourierMap({ courier }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!window.L || !mapRef.current || !courier?.latitude || !courier?.longitude) return;

    const lat = parseFloat(courier.latitude);
    const lng = parseFloat(courier.longitude);

    if (!mapInstance.current) {
      mapInstance.current = window.L.map(mapRef.current).setView([lat, lng], 15);
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB'
      }).addTo(mapInstance.current);
    } else {
      mapInstance.current.setView([lat, lng], 15);
    }

    // Clear markers
    mapInstance.current.eachLayer((layer) => {
      if (layer instanceof window.L.Marker) {
        mapInstance.current.removeLayer(layer);
      }
    });

    const color = getCourierColor(courier);
    const customIcon = window.L.divIcon({
      className: 'custom-icon',
      html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color}"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    window.L.marker([lat, lng], { icon: customIcon })
      .bindPopup(`<div style="color: black"><strong>Current Location</strong></div>`)
      .addTo(mapInstance.current);

    return () => {
        if (mapInstance.current) {
            mapInstance.current.remove();
            mapInstance.current = null;
        }
    };
  }, [courier]);

  if (!courier?.latitude || !courier?.longitude) {
    return (
      <div className="h-full w-full bg-surfaceLighter/50 flex flex-col items-center justify-center text-textSecondary p-6 text-center">
        <MapPin className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-sm">Location data not available for this courier.</p>
      </div>
    );
  }

  return <div ref={mapRef} className="h-full w-full rounded-xl overflow-hidden border border-borderWhite" />;
}

export default function CouriersPage() {
  const dispatch = useDispatch();
  const { items: users, isLoading: usersLoading } = useSelector(state => state.users);
  const { items: orders, isLoading: ordersLoading } = useSelector(state => state.orders);
  
  const [search, setSearch] = useState('');
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'history'

  useEffect(() => {
    dispatch(getUsers({ page: 1, pageSize: 100 })); // Get all users to filter couriers
    dispatch(getOrders(null)); // Get orders to calculate courier stats
  }, [dispatch]);

  const couriers = users.filter(u => 
    u.role === 'courier' || u.role === 1 || String(u.role).toLowerCase() === 'courier'
  ).filter(u => {
    const name = (u.fullName || u.name || '').toLowerCase();
    const phone = (u.phoneNumber || u.phone || '').toLowerCase();
    const s = search.toLowerCase();
    return name.includes(s) || phone.includes(s);
  });

  const getCourierStats = (courierId) => {
    const courierOrders = orders.filter(o => Number(o.courierId) === Number(courierId));
    
    const active = courierOrders.filter(o => 
      !['delivered', 'canceled', 5, 6].includes(o.statusDelivery || o.status)
    );
    const completed = courierOrders.filter(o => 
      ['delivered', 'canceled', 5, 6].includes(o.statusDelivery || o.status)
    );
    
    return {
      active,
      history: completed,
      totalCount: courierOrders.length,
      activeCount: active.length,
      completedCount: completed.length
    };
  };

  const onlineCouriersCount = couriers.filter(c => c.isOnline).length;
  const busyCouriersCount = couriers.filter(c => getCourierStats(c.id || c.userId).activeCount > 0).length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Courier Management</h2>
          <p className="text-textSecondary text-sm">Monitor delivery activity and courier performance.</p>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="glass-panel px-4 py-2 flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
             <span className="text-sm text-textSecondary">Online: <span className="text-white font-bold">{onlineCouriersCount}</span></span>
          </div>
          <div className="glass-panel px-4 py-2 flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-primary" />
             <span className="text-sm text-textSecondary">Busy: <span className="text-white font-bold">{busyCouriersCount}</span></span>
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textSecondary group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search couriers..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-surface border border-borderWhite rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-textSecondary focus:outline-none focus:border-primary transition-all w-64"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Courier List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surfaceLighter/50 border-b border-borderWhite text-xs uppercase text-textSecondary font-semibold">
                  <tr>
                    <th className="p-4">Courier</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Active Task</th>
                    <th className="p-4">Rating</th>
                    <th className="p-4">Performance</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderWhite">
                  {couriers.map(courier => {
                    const stats = getCourierStats(courier.id || courier.userId);
                    const isSelected = selectedCourier?.id === (courier.id || courier.userId);
                    const color = getCourierColor(courier);

                    return (
                      <tr 
                        key={courier.id || courier.userId} 
                        className={`hover:bg-surfaceLighter/30 transition-colors cursor-pointer group ${isSelected ? 'bg-primary/5' : ''}`}
                        onClick={() => setSelectedCourier(courier)}
                      >
                        <td className="p-4">
                          <div className="flex items-center">
                            <div className="relative">
                                <img 
                                  src={courier.photoUrl || `https://ui-avatars.com/api/?name=${(courier.fullName || courier.name || 'C').split(' ').join('+')}&background=${color.replace('#', '')}&color=fff`} 
                                  alt="" 
                                  className="w-10 h-10 rounded-full border border-borderWhite object-cover"
                                />
                                {courier.isOnline && (
                                    <div className="absolute -right-0.5 -bottom-0.5 w-3 h-3 bg-success rounded-full border-2 border-surface" />
                                )}
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{courier.fullName || courier.name || 'Unnamed Courier'}</p>
                              <p className="text-[10px] text-textSecondary">{courier.phoneNumber || courier.phone || 'No phone'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            courier.isOnline ? 'bg-success/10 text-success border border-success/20' : 'bg-surfaceLighter text-textSecondary border border-borderWhite'
                          }`}>
                            {courier.isOnline ? 'ONLINE' : 'OFFLINE'}
                          </span>
                        </td>
                        <td className="p-4">
                          {stats.activeCount > 0 ? (
                            <div className="flex flex-col">
                                <span className="text-white text-xs font-medium flex items-center gap-1.5">
                                    <Navigation className="w-3 h-3 text-primary" />
                                    {stats.active[0].restaurantName || 'Order'}
                                </span>
                                <span className="text-[10px] text-primary">In progress</span>
                            </div>
                          ) : (
                            <span className="text-textSecondary text-xs">Waiting...</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center text-secondary">
                            <Star className="w-3.5 h-3.5 fill-current mr-1" />
                            <span className="text-xs font-bold">{courier.rating || '5.0'}</span>
                          </div>
                        </td>
                        <td className="p-4">
                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between text-[10px] mb-0.5">
                                    <span className="text-textSecondary">Completed</span>
                                    <span className="text-white font-bold">{stats.completedCount}</span>
                                </div>
                                <div className="w-full h-1 bg-surfaceLighter rounded-full overflow-hidden">
                                    <div className="h-full bg-success" style={{ width: stats.totalCount > 0 ? `${(stats.completedCount / stats.totalCount) * 100}%` : '0%' }} />
                                </div>
                            </div>
                        </td>
                        <td className="p-4 text-right">
                          <button className="p-2 hover:bg-primary/10 rounded-lg text-textSecondary hover:text-primary transition-all">
                             <ChevronRight className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {couriers.length === 0 && (
                <div className="p-12 text-center text-textSecondary">
                    {usersLoading ? (
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    ) : (
                        <>
                            <Truck className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>No couriers found matching your search.</p>
                        </>
                    )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selected Courier Detail */}
        <div className="lg:col-span-1 space-y-6">
          {selectedCourier ? (
            <div className="space-y-6 animate-slide-in-right">
              {/* Profile Card */}
              <div className="glass-panel p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                    <button 
                        onClick={() => setSelectedCourier(null)}
                        className="text-textSecondary hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex flex-col items-center text-center mb-6">
                   <div className="relative mb-4">
                       <img 
                         src={selectedCourier.photoUrl || `https://ui-avatars.com/api/?name=${(selectedCourier.fullName || selectedCourier.name || 'C').split(' ').join('+')}&background=${getCourierColor(selectedCourier).replace('#', '')}&color=fff`} 
                         alt="" 
                         className="w-20 h-20 rounded-2xl border-2 border-primary/20 object-cover shadow-glow-primary"
                       />
                       <div className={`absolute -right-2 -bottom-2 px-2 py-0.5 rounded-md text-[8px] font-black tracking-widest ${selectedCourier.isOnline ? 'bg-success text-white' : 'bg-surfaceLighter text-textSecondary'}`}>
                           {selectedCourier.isOnline ? 'LIVE' : 'AWAY'}
                       </div>
                   </div>
                   <h3 className="text-lg font-bold text-white">{selectedCourier.fullName || selectedCourier.name}</h3>
                   <p className="text-sm text-textSecondary flex items-center gap-2">
                       <Phone className="w-3 h-3" />
                       {selectedCourier.phoneNumber || selectedCourier.phone || 'N/A'}
                   </p>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-surface/50 border border-borderWhite rounded-xl p-3 text-center">
                        <p className="text-[10px] text-textSecondary uppercase font-bold mb-1">Success Rate</p>
                        <p className="text-xl font-black text-success">98%</p>
                    </div>
                    <div className="bg-surface/50 border border-borderWhite rounded-xl p-3 text-center">
                        <p className="text-[10px] text-textSecondary uppercase font-bold mb-1">Avg Speed</p>
                        <p className="text-xl font-black text-primary">24 min</p>
                    </div>
                </div>

                <div className="h-48 mb-6">
                    <CourierMap courier={selectedCourier} />
                </div>

                <div className="flex border-b border-borderWhite mb-4">
                    <button 
                        onClick={() => setActiveTab('active')}
                        className={`flex-1 pb-2 text-xs font-bold transition-all relative ${activeTab === 'active' ? 'text-primary' : 'text-textSecondary hover:text-white'}`}
                    >
                        Active Tasks
                        {activeTab === 'active' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full shadow-glow-primary" />}
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 pb-2 text-xs font-bold transition-all relative ${activeTab === 'history' ? 'text-primary' : 'text-textSecondary hover:text-white'}`}
                    >
                        Recent History
                        {activeTab === 'history' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full shadow-glow-primary" />}
                    </button>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {activeTab === 'active' ? (
                        getCourierStats(selectedCourier.id || selectedCourier.userId).active.length > 0 ? (
                            getCourierStats(selectedCourier.id || selectedCourier.userId).active.map(order => (
                                <div key={order.id || order.deliveryId || Math.random()} className="bg-surfaceLighter/30 border border-borderWhite rounded-xl p-3 hover:border-primary/30 transition-all group">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                                <Package className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-xs font-bold text-white">#{String(order.id || order.deliveryId || '0000').slice(-4)}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-primary uppercase">IN DELIVERY</span>
                                    </div>
                                    <p className="text-[11px] text-textSecondary line-clamp-1 mb-2">{order.restaurantName}</p>
                                    <div className="flex justify-between items-center text-[10px]">
                                        <span className="text-textSecondary flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            Picked up 5m ago
                                        </span>
                                        <button className="text-primary hover:underline font-bold">Details</button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-8 text-center">
                                <Activity className="w-8 h-8 mx-auto mb-2 text-textSecondary opacity-20" />
                                <p className="text-xs text-textSecondary">No active assignments</p>
                            </div>
                        )
                    ) : (
                        getCourierStats(selectedCourier.id || selectedCourier.userId).history.length > 0 ? (
                            getCourierStats(selectedCourier.id || selectedCourier.userId).history.map(order => (
                                <div key={order.id || order.deliveryId || Math.random()} className="flex items-center justify-between p-2 border-b border-borderWhite/50 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center text-success">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white">#{String(order.id || order.deliveryId || '0000').slice(-4)}</p>
                                            <p className="text-[10px] text-textSecondary">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Unknown date'}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-white">{order.totalPrice || order.total || 0} ₴</span>
                                </div>
                            ))
                        ) : (
                            <div className="py-8 text-center">
                                <p className="text-xs text-textSecondary">No order history available</p>
                            </div>
                        )
                    )}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-8 h-[500px] flex flex-col items-center justify-center text-center space-y-4">
               <div className="w-16 h-16 rounded-2xl bg-surfaceLighter flex items-center justify-center border border-borderWhite shadow-inner">
                  <Truck className="w-8 h-8 text-textSecondary opacity-40" />
               </div>
               <div>
                  <h3 className="text-white font-bold">Select a Courier</h3>
                  <p className="text-sm text-textSecondary max-w-[200px] mx-auto mt-1">Click on a courier from the list to view live tracking and delivery details.</p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
