import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Layout from './components/Layout';
import RestaurantDashboard from './pages/RestaurantDashboard';
import KitchenPage from './pages/KitchenPage';
import MenuPage from './pages/MenuPage';
import LoginPage from './pages/LoginPage';
import LogsPage from './pages/LogsPage';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<RestaurantDashboard />} />
          <Route path="kitchen" element={<KitchenPage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="logs" element={<LogsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
