import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Dashboard() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [accuracy, setAccuracy] = useState(1.0); 
  const [username, setUsername] = useState(''); // Состояние для имени пользователя

  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  useEffect(() => {
    if (!token) navigate('/login');
  }, [token, navigate]);

  useEffect(() => {
    if (theme === 'dark') document.body.classList.add('dark');
    else document.body.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Загрузка данных пользователя (имени и рейтинга)
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch(`${API_URL}/users/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUsername(data.username); // Сохраняем имя
          if (role === 'worker') {
            setAccuracy(data.accuracy); 
            localStorage.setItem('accuracy', data.accuracy);
          }
        }
      } catch (error) {
        console.error("Не удалось загрузить данные пользователя:", error);
      }
    };

    if (token) fetchUserData();
  }, [token, role]);

  const handleLogout = () => {
    localStorage.clear(); 
    navigate('/', { replace: true }); 
  };

  return (
    <div>
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <h2 style={{ margin: 0, color: 'var(--accent-color)' }}>DataMark</h2>
          </Link>
          <span style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>| Кабинет ({role === 'customer' ? 'Заказчик' : 'Исполнитель'})</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? '🌙 Темная' : '☀️ Светлая'}
          </button>
          <button className="btn btn-outline" onClick={handleLogout} style={{ borderColor: '#e53e3e', color: '#e53e3e' }}>
            Выйти
          </button>
        </div>
      </nav>

      <div className="container" style={{ marginTop: '40px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          {/* Персонализированное приветствие */}
          <h2>Добро пожаловать, <span style={{ color: 'var(--accent-color)' }}>{username || 'Пользователь'}</span>!</h2>
          
          {role === 'worker' && (
             <div style={{ background: 'rgba(72, 187, 120, 0.1)', border: '1px solid #48bb78', padding: '15px', borderRadius: '8px', display: 'inline-block', marginBottom: '20px', marginTop: '15px' }}>
               <h3 style={{ margin: 0, color: '#2f855a' }}>
                 Ваш рейтинг точности (Accuracy): {(accuracy * 100).toFixed(1)}%
               </h3>
               <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                 Рейтинг зависит от правильного прохождения проверочных заданий (Honeypots).
               </p>
             </div>
          )}

          <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', marginTop: '15px' }}>
            {role === 'customer' 
              ? 'Здесь вы можете управлять своими заказами на разметку и классификацию датасетов.' 
              : 'Здесь вы можете находить новые задания, выполнять разметку и отслеживать свой прогресс.'}
          </p>

          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {role === 'customer' ? (
              <>
                <button className="btn" style={{ fontSize: '1.2rem', padding: '15px 30px' }} onClick={() => navigate('/create')}>
                  + Создать новый заказ
                </button>
                <button className="btn btn-outline" style={{ fontSize: '1.2rem', padding: '15px 30px' }} onClick={() => navigate('/list')}>
                  Мои заказы 📋
                </button>
              </>
            ) : (
              <button className="btn" style={{ fontSize: '1.2rem', padding: '15px 30px' }} onClick={() => navigate('/list')}>
                Найти доступные задачи 🔍
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}