import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [message, setMessage] = useState({ text: '', type: '' }); // Стейт для красивых уведомлений
  
  const navigate = useNavigate(); 

  // Если уже есть токен, не пускаем на страницу логина
  useEffect(() => {
    if (localStorage.getItem('token')) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (theme === 'dark') document.body.classList.add('dark');
    else document.body.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' }); 
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('role', data.role);
        
        // replace: true заменяет страницу в истории браузера, чтобы кнопка "Назад" не вела на Login
        navigate('/dashboard', { replace: true }); 
      } else {
        const errData = await res.json();
        setMessage({ text: errData.detail || 'Неверный логин или пароль', type: 'error' });
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
        <button className="btn btn-outline" onClick={toggleTheme}>
          {theme === 'light' ? '🌙 Темная' : '☀️ Светлая'}
        </button>
      </nav>

      <div className="container" style={{ maxWidth: '450px', marginTop: '8vh' }}>
        <div className="card">
          <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Вход в систему</h2>
          
          {/* Красивое уведомление об ошибке */}
          {message.text && (
            <div style={{ padding: '10px', marginBottom: '15px', borderRadius: '5px', textAlign: 'center', backgroundColor: message.type === 'error' ? 'rgba(229, 62, 62, 0.1)' : 'rgba(72, 187, 120, 0.1)', color: message.type === 'error' ? '#e53e3e' : '#48bb78', border: `1px solid ${message.type === 'error' ? '#e53e3e' : '#48bb78'}` }}>
              {message.text}
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Логин</label>
              <input type="text" placeholder="Введите ваш логин" value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Пароль</label>
              <input type="password" placeholder="Введите ваш пароль" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn" style={{ width: '100%', fontSize: '1.1rem' }}>Войти</button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '25px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Нет аккаунта? <Link to="/register" style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>Зарегистрироваться</Link>
            </p>
            <Link to="/" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>
              ← Назад на главную
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}