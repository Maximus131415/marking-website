import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  
  const navigate = useNavigate(); 

  useEffect(() => {
    if (theme === 'dark') document.body.classList.add('dark');
    else document.body.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8001/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('role', data.role);
        
        navigate('/dashboard'); 
      } else {
        const errData = await res.json();
        alert(`Ошибка: ${errData.detail || 'Неверный логин или пароль'}`);
      }
    } catch (error) {
      alert("Ошибка соединения с сервером");
      console.error(error);
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
          
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Логин</label>
              <input 
                type="text" 
                placeholder="Введите ваш логин" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                required 
              />
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Пароль</label>
              <input 
                type="password" 
                placeholder="Введите ваш пароль" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
              />
            </div>

            <button type="submit" className="btn" style={{ width: '100%', fontSize: '1.1rem' }}>
              Войти
            </button>
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