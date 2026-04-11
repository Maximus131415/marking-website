import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // Подтверждение пароля
  const [role, setRole] = useState('worker'); 
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (localStorage.getItem('token')) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const typeFromUrl = params.get('type');
    if (typeFromUrl === 'customer') setRole('customer');
    else if (typeFromUrl === 'worker') setRole('worker');
  }, [location]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    if (password !== confirmPassword) {
      setMessage({ text: 'Пароли не совпадают!', type: 'error' });
      return;
    }

    try {
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
      });

      if (res.ok) {
        setMessage({ text: 'Регистрация успешна! Перенаправляем...', type: 'success' });
        setTimeout(() => navigate('/login'), 1500); // Небольшая задержка, чтобы пользователь увидел сообщение
      } else {
        const errData = await res.json();
        setMessage({ text: errData.detail || 'Не удалось зарегистрироваться', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Ошибка соединения с сервером', type: 'error' });
    }
  };

  return (
    <div>
      <nav className="navbar">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <h2 style={{ margin: 0, color: 'var(--accent-color)' }}>DataMark</h2>
        </Link>
      </nav>

      <div className="container" style={{ maxWidth: '400px', marginTop: '6vh' }}>
        <div className="card">
          <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Регистрация</h2>
          
          {message.text && (
            <div style={{ padding: '10px', marginBottom: '15px', borderRadius: '5px', textAlign: 'center', backgroundColor: message.type === 'error' ? 'rgba(229, 62, 62, 0.1)' : 'rgba(72, 187, 120, 0.1)', color: message.type === 'error' ? '#e53e3e' : '#48bb78', border: `1px solid ${message.type === 'error' ? '#e53e3e' : '#48bb78'}` }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleRegister}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Логин</label>
            <input type="text" placeholder="Придумайте логин" value={username} onChange={e => setUsername(e.target.value)} required />
            
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Пароль</label>
            <input type="password" placeholder="Придумайте пароль" value={password} onChange={e => setPassword(e.target.value)} required />
            
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Подтвердите пароль</label>
            <input type="password" placeholder="Повторите пароль" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Ваша роль</label>
            <select value={role} onChange={e => setRole(e.target.value)} required>
              <option value="worker">Я исполнитель (хочу размечать)</option>
              <option value="customer">Я заказчик (нужна разметка)</option>
            </select>
            
            <button type="submit" className="btn" style={{ width: '100%', marginTop: '10px' }}>Создать аккаунт</button>
          </form>
          
          <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)' }}>
            Уже есть аккаунт? <Link to="/login" style={{ color: 'var(--accent-color)' }}>Войти</Link>
          </p>
        </div>
      </div>
    </div>
  );
}