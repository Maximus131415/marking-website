import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; 

export default function Home() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const navigate = useNavigate(); 

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('logout') === 'true') {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      // Очищаем ссылку от слова logout
      window.history.replaceState({}, document.title, "/");
      // Небольшая задержка, чтобы React успел обновить состояние
      setTimeout(() => window.location.reload(), 100);
    }
  }, []);

  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  useEffect(() => {
    if (theme === 'dark') document.body.classList.add('dark');
    else document.body.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  const goToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div>
      <nav className="navbar">
        <h2 style={{ margin: 0, color: 'var(--accent-color)' }}>DataMark</h2>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button className="btn btn-outline" onClick={toggleTheme}>
            {theme === 'light' ? '🌙 Темная' : '☀️ Светлая'}
          </button>
          {token ? (
            <button className="btn" onClick={goToDashboard}>Личный кабинет ➡</button>
          ) : (
            <Link to="/login" className="btn btn-outline">Войти</Link>
          )}
        </div>
      </nav>

      <div className="container hero">
        <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>Платформа разметки данных</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 40px auto' }}>
          Объединяем тех, кому нужны качественные датасеты для машинного обучения, с теми, кто готов их размечать. Быстро, удобно и безопасно.
        </p>
      </div>

      {/* Показываем услуги только если пользователь не вошел */}
      {!token && (
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '-20px' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h2 style={{ marginBottom: '15px' }}>🏢 Для Заказчиков</h2>
            <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8', paddingLeft: '20px', flex: 1 }}>
              <li>Создание массовых заданий на разметку</li>
              <li>Поддержка Bounding Boxes и Классификации</li>
              <li>Управление доступом к датасетам</li>
              <li>Выгрузка готовых результатов в JSON</li>
            </ul>
            <div style={{ marginTop: '25px' }}>
              <Link to="/register?type=customer" className="btn" style={{ width: '100%', textAlign: 'center' }}>
                Стать Заказчиком
              </Link>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h2 style={{ marginBottom: '15px' }}>💻 Для Исполнителей</h2>
            <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8', paddingLeft: '20px', flex: 1 }}>
              <li>Доступ к бирже открытых задач</li>
              <li>Удобный интерфейс разметки с поддержкой горячих клавиш</li>
              <li>Мгновенная отправка результатов на сервер</li>
              <li>Прозрачная статистика выполненных работ</li>
            </ul>
            <div style={{ marginTop: '25px' }}>
              <Link to="/register?type=worker" className="btn btn-outline" style={{ width: '100%', textAlign: 'center' }}>
                Стать Исполнителем
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}