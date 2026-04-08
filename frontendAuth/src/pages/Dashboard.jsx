import React, { useEffect, useState } from 'react';

export default function Dashboard() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  useEffect(() => {
    if (theme === 'dark') document.body.classList.add('dark');
    else document.body.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Защита: если нет токена, выкидываем на главную
  if (!token) {
    window.location.href = '/';
    return null;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/?logout=true';
  };

  const goToCreateOrder = () => {
    window.location.href = `http://localhost:3002/create?token=${token}&role=${role}`;
  };
  const goToListOrders = () => {
    window.location.href = `http://localhost:3002/list?token=${token}&role=${role}`;
  };

  return (
    <div>
      <nav className="navbar">
        <h2 style={{ margin: 0, color: 'var(--accent-color)' }}>
          Кабинет ({role === 'customer' ? 'Заказчик' : 'Исполнитель'})
        </h2>
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
          <h2>Добро пожаловать в DataMark!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
            {role === 'customer' 
              ? 'Здесь вы можете управлять своими заказами на разметку и классификацию датасетов.' 
              : 'Здесь вы можете находить новые задания, выполнять разметку и отслеживать свой прогресс.'}
          </p>

          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {role === 'customer' ? (
              <>
                <button className="btn" style={{ fontSize: '1.2rem', padding: '15px 30px' }} onClick={goToCreateOrder}>
                  + Создать новый заказ
                </button>
                {/* НОВАЯ КНОПКА ДЛЯ ЗАКАЗЧИКА */}
                <button className="btn btn-outline" style={{ fontSize: '1.2rem', padding: '15px 30px' }} onClick={goToListOrders}>
                  Мои заказы 📋
                </button>
              </>
            ) : (
              <button className="btn" style={{ fontSize: '1.2rem', padding: '15px 30px' }} onClick={goToListOrders}>
                Найти доступные задачи 🔍
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}