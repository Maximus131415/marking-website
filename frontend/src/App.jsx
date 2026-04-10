import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateOrder from './pages/CreateOrder';
import OrderList from './pages/OrderList';
import Marking from './pages/Marking';
import './index.css';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/create" element={<CreateOrder />} />
        <Route path="/list" element={<OrderList />} />
        <Route path="/marking" element={<Marking />} />
        {/* Если ввели несуществующий адрес - кидаем на главную */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}