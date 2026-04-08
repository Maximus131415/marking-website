import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('worker'); 
  const navigate = useNavigate();
  const location = useLocation();

  // Читаем URL при загрузке страницы, чтобы авто-выбрать роль
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const typeFromUrl = params.get('type');
    if (typeFromUrl === 'customer') {
      setRole('customer');
    } else if (typeFromUrl === 'worker') {
      setRole('worker');
    }
  }, [location]);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8001/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
      });

      if (res.ok) {
        alert("Регистрация успешна! Теперь вы можете войти.");
        navigate('/login');
      } else {
        const errData = await res.json();
        alert(`Ошибка: ${errData.detail || 'Не удалось зарегистрироваться'}`);
      }
    } catch (error) {
      alert("Ошибка соединения с сервером");
      console.error(error);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '400px', marginTop: '10vh' }}>
      <div className="card">
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Регистрация</h2>
        <form onSubmit={handleRegister}>
          <input 
            type="text" 
            placeholder="Придумайте логин" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Придумайте пароль" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
          />
          <select value={role} onChange={e => setRole(e.target.value)} required>
            <option value="worker">Я исполнитель (хочу размечать)</option>
            <option value="customer">Я заказчик (нужна разметка)</option>
          </select>
          <button type="submit" className="btn" style={{ width: '100%', marginTop: '10px' }}>
            Создать аккаунт
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)' }}>
          Уже есть аккаунт? <Link to="/login" style={{ color: 'var(--accent-color)' }}>Войти</Link>
        </p>
      </div>
    </div>
  );
}