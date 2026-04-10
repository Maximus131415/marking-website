import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import CreateOrder from './pages/CreateOrder';
import OrderList from './pages/OrderList';
import './index.css';

function TokenCatcher({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlToken = params.get('token');
    const urlRole = params.get('role');

    if (urlToken) {
      localStorage.setItem('token', urlToken);
      localStorage.setItem('role', urlRole);
      
      // Если юзер попал в корень с токеном, сразу кидаем его по назначению
      if (location.pathname === '/') {
         navigate(urlRole === 'customer' ? '/create' : '/list', { replace: true });
      } else {
         navigate(location.pathname, { replace: true });
      }
    } else if (!localStorage.getItem('token')) {
      window.location.href = 'http://localhost:3001';
    }
  }, [location, navigate]);

  return children;
}

export default function App() {
  // Определяем роль для запасного редиректа
  const role = localStorage.getItem('role');

  return (
    <BrowserRouter>
      <TokenCatcher>
        <Routes>
          <Route path="/create" element={<CreateOrder />} />
          <Route path="/list" element={<OrderList />} />
          
          {/* ЗАЩИТА ОТ БЕЛОГО ЭКРАНА: перенаправляем с корня */}
          <Route 
            path="/" 
            element={<Navigate to={role === 'customer' ? '/create' : '/list'} replace />} 
          />
          
          {/* Ловим вообще все неизвестные адреса */}
          <Route 
            path="*" 
            element={<Navigate to="/" replace />} 
          />
        </Routes>
      </TokenCatcher>
    </BrowserRouter>
  );
}